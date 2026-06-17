import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { webauthnCredentials, agentes } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  AuthenticatorTransportFuture,
  CredentialDeviceType,
} from "@simplewebauthn/server";
import { createSessao } from "../db";
import { sdk } from "../_core/sdk";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";

// RP (Relying Party) — identidade do sistema
const RP_NAME = "Grupo Firme & Forte";
// RP_ID deve ser o eTLD+1 do domínio (sem porta, sem protocolo)
function getRpId(origin: string): string {
  try {
    const url = new URL(origin);
    return url.hostname;
  } catch {
    return process.env.WEBAUTHN_RP_ID || "localhost";
  }
}

// Cache temporário de challenges (em produção usar Redis/DB)
const challengeCache = new Map<string, { challenge: string; expiresAt: number }>();

function setChallenge(key: string, challenge: string) {
  challengeCache.set(key, { challenge, expiresAt: Date.now() + 5 * 60 * 1000 }); // 5 min
}

function getAndDeleteChallenge(key: string): string | null {
  const entry = challengeCache.get(key);
  if (!entry || Date.now() > entry.expiresAt) {
    challengeCache.delete(key);
    return null;
  }
  challengeCache.delete(key);
  return entry.challenge;
}

export const webauthnRouter = router({
  // ── REGISTRO: Gerar opções de registro ──────────────────────────────────────
  registrationOptions: publicProcedure
    .input(z.object({
      chaveJ: z.string(),
      senha: z.string().optional(),
      deviceName: z.string().optional().default("Meu dispositivo"),
      origin: z.string().optional().default("http://localhost:3000"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");

      // Buscar agente
      const [agente] = await db.select().from(agentes).where(eq(agentes.chaveJ, input.chaveJ));
      if (!agente) throw new Error("Agente não encontrado");

      // Validar senha se fornecida
      if (input.senha) {
        if (agente.senha !== input.senha) throw new Error("Senha incorreta. Verifique e tente novamente.");
      }

      // Buscar credenciais existentes
      const existingCreds = await db
        .select()
        .from(webauthnCredentials)
        .where(eq(webauthnCredentials.chaveJ, input.chaveJ));

      const options = await generateRegistrationOptions({
        rpName: RP_NAME,
        rpID: getRpId(input.origin || "http://localhost:3000"),
        userName: input.chaveJ,
        userDisplayName: agente.nomeAgente || input.chaveJ,
        attestationType: "none",
        excludeCredentials: existingCreds.map(c => ({
          id: c.credentialId,
          transports: c.transports
            ? (c.transports.split(",") as AuthenticatorTransportFuture[])
            : undefined,
        })),
        authenticatorSelection: {
          residentKey: "preferred",
          userVerification: "preferred",
          authenticatorAttachment: "platform", // apenas dispositivo local (face/digital)
        },
      });

      setChallenge(`reg:${input.chaveJ}`, options.challenge);

      return options;
    }),

  // ── REGISTRO: Verificar e salvar credencial ──────────────────────────────────
  registrationVerify: publicProcedure
    .input(z.object({
      chaveJ: z.string(),
      deviceName: z.string().optional().default("Meu dispositivo"),
      response: z.any(),
      origin: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");

      const expectedChallenge = getAndDeleteChallenge(`reg:${input.chaveJ}`);
      if (!expectedChallenge) throw new Error("Challenge expirado. Tente novamente.");

      const [agente] = await db.select().from(agentes).where(eq(agentes.chaveJ, input.chaveJ));
      if (!agente) throw new Error("Agente não encontrado");

      let verification;
      try {
        verification = await verifyRegistrationResponse({
          response: input.response,
          expectedChallenge,
          expectedOrigin: input.origin,
          expectedRPID: getRpId(input.origin),
          requireUserVerification: false,
        });
      } catch (e: any) {
        throw new Error("Falha na verificação biométrica: " + e.message);
      }

      if (!verification.verified || !verification.registrationInfo) {
        throw new Error("Verificação não aprovada pelo dispositivo.");
      }

      const { credential, credentialDeviceType, credentialBackedUp } =
        verification.registrationInfo;

      // Salvar credencial no banco
      await db.insert(webauthnCredentials).values({
        agenteId: agente.id,
        chaveJ: input.chaveJ,
        credentialId: credential.id,
        credentialPublicKey: Buffer.from(credential.publicKey).toString("base64"),
        counter: credential.counter,
        deviceType: credentialDeviceType as string,
        backedUp: credentialBackedUp ? 1 : 0,
        transports: credential.transports?.join(",") ?? null,
        deviceName: input.deviceName,
      });

      return { success: true, message: "Biometria cadastrada com sucesso!" };
    }),

  // ── AUTENTICAÇÃO: Gerar opções de autenticação ───────────────────────────────
  authenticationOptions: publicProcedure
    .input(z.object({
      chaveJ: z.string(),
      origin: z.string().optional().default("http://localhost:3000"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");

      const creds = await db
        .select()
        .from(webauthnCredentials)
        .where(eq(webauthnCredentials.chaveJ, input.chaveJ));

      if (creds.length === 0) {
        throw new Error("Nenhuma biometria cadastrada para este usuário.");
      }

      const options = await generateAuthenticationOptions({
        rpID: getRpId(input.origin || "http://localhost:3000"),
        userVerification: "preferred",
        allowCredentials: creds.map(c => ({
          id: c.credentialId,
          transports: c.transports
            ? (c.transports.split(",") as AuthenticatorTransportFuture[])
            : undefined,
        })),
      });

      setChallenge(`auth:${input.chaveJ}`, options.challenge);

      return options;
    }),

  // ── AUTENTICAÇÃO: Verificar e fazer login ────────────────────────────────────
  authenticationVerify: publicProcedure
    .input(z.object({
      chaveJ: z.string(),
      response: z.any(),
      origin: z.string(),
      ipAddress: z.string().optional(),
      userAgent: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");

      const expectedChallenge = getAndDeleteChallenge(`auth:${input.chaveJ}`);
      if (!expectedChallenge) throw new Error("Challenge expirado. Tente novamente.");

      // Buscar credencial pelo ID
      const credId = input.response.id;
      const [storedCred] = await db
        .select()
        .from(webauthnCredentials)
        .where(and(
          eq(webauthnCredentials.chaveJ, input.chaveJ),
          eq(webauthnCredentials.credentialId, credId),
        ));

      if (!storedCred) throw new Error("Credencial não encontrada.");

      const publicKeyBuffer = Buffer.from(storedCred.credentialPublicKey, "base64");

      let verification;
      try {
        verification = await verifyAuthenticationResponse({
          response: input.response,
          expectedChallenge,
          expectedOrigin: input.origin,
          expectedRPID: getRpId(input.origin),
          credential: {
            id: storedCred.credentialId,
            publicKey: new Uint8Array(publicKeyBuffer),
            counter: storedCred.counter,
            transports: storedCred.transports
              ? (storedCred.transports.split(",") as AuthenticatorTransportFuture[])
              : undefined,
          },
          requireUserVerification: false,
        });
      } catch (e: any) {
        throw new Error("Falha na autenticação biométrica: " + e.message);
      }

      if (!verification.verified) {
        throw new Error("Autenticação biométrica não aprovada.");
      }

      // Atualizar counter e lastUsedAt
      await db.update(webauthnCredentials)
        .set({
          counter: verification.authenticationInfo.newCounter,
          lastUsedAt: new Date(),
        })
        .where(eq(webauthnCredentials.id, storedCred.id));

      // Buscar agente para criar sessão
      const [agente] = await db.select().from(agentes).where(eq(agentes.chaveJ, input.chaveJ));
      if (!agente) throw new Error("Agente não encontrado.");

      // Criar token de sessão
      const openId = `bio_${agente.chaveJ}`;
      const sessionToken = await sdk.signSession(
        {
          openId,
          appId: process.env.VITE_APP_ID || "app",
          name: agente.nomeAgente || input.chaveJ,
        },
        { expiresInMs: ONE_YEAR_MS }
      );
      // Registrar sessão
      const sessaoResult = await createSessao({
        agenteId: agente.id,
        chaveJ: input.chaveJ,
        nomeAgente: agente.nomeAgente || input.chaveJ,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      });

      // Setar cookie
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });
      if (sessaoResult && (sessaoResult as any).insertId) {
        ctx.res.cookie('sessionId', String((sessaoResult as any).insertId), {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });
      }

      return {
        success: true,
        agente: {
          id: agente.id,
          chaveJ: agente.chaveJ,
          nomeAgente: agente.nomeAgente,
          empresa: agente.empresa,
          cargo: agente.cargo,
        },
      };
    }),

  // ── Listar credenciais do usuário ────────────────────────────────────────────
  listCredentials: publicProcedure
    .input(z.object({ chaveJ: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return await db
        .select({
          id: webauthnCredentials.id,
          deviceName: webauthnCredentials.deviceName,
          deviceType: webauthnCredentials.deviceType,
          createdAt: webauthnCredentials.createdAt,
          lastUsedAt: webauthnCredentials.lastUsedAt,
          transports: webauthnCredentials.transports,
        })
        .from(webauthnCredentials)
        .where(eq(webauthnCredentials.chaveJ, input.chaveJ));
    }),

  // ── Remover credencial ───────────────────────────────────────────────────────
  removeCredential: publicProcedure
    .input(z.object({ id: z.number(), chaveJ: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return false;
      await db.delete(webauthnCredentials)
        .where(and(
          eq(webauthnCredentials.id, input.id),
          eq(webauthnCredentials.chaveJ, input.chaveJ),
        ));
      return true;
    }),

  // ── Verificar se usuário tem biometria cadastrada ────────────────────────────
  hasBiometria: publicProcedure
    .input(z.object({ chaveJ: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return false;
      const creds = await db
        .select({ id: webauthnCredentials.id })
        .from(webauthnCredentials)
        .where(eq(webauthnCredentials.chaveJ, input.chaveJ))
        .limit(1);
      return creds.length > 0;
    }),
});
