/**
 * Router de Reconhecimento Facial via Face++
 * Permite login apenas olhando para a webcam.
 * Também permite cadastrar/remover o rosto nas configurações.
 */
import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { agentes } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { ENV } from "../_core/env";
import FormData from "form-data";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fetch = require("node-fetch") as typeof import("node-fetch").default;
import { TRPCError } from "@trpc/server";
import {
  getLoginAttempts,
  incrementLoginAttempts,
  resetLoginAttempts,
  createAuditLog,
  upsertUser,
  createSessao,
} from "../db";
import { sdk } from "../_core/sdk";
import { getSessionCookieOptions } from "../_core/cookies";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

const FACEPP_BASE = "https://api-us.faceplusplus.com/facepp/v3";
const SYSTEM_OUTER_ID = "grupo_firme_forte_v1";

// ── Helpers Face++ ──────────────────────────────────────────────────────────

async function detectFace(imageBase64: string): Promise<string | null> {
  const form = new FormData();
  form.append("api_key", ENV.faceppApiKey);
  form.append("api_secret", ENV.faceppApiSecret);
  form.append("image_base64", imageBase64);
  form.append("return_landmark", "0");
  form.append("return_attributes", "");

  const res = await fetch(`${FACEPP_BASE}/detect`, { method: "POST", body: form as any });
  const data = await res.json() as any;
  if (data.error_message) throw new Error(`Face++ detect: ${data.error_message}`);
  if (!data.faces || data.faces.length === 0) return null;
  return data.faces[0].face_token as string;
}

async function ensureFaceSet(): Promise<string> {
  const form = new FormData();
  form.append("api_key", ENV.faceppApiKey);
  form.append("api_secret", ENV.faceppApiSecret);
  form.append("outer_id", SYSTEM_OUTER_ID);
  form.append("display_name", "Grupo Firme e Forte - Agentes");

  const res = await fetch(`${FACEPP_BASE}/faceset/create`, { method: "POST", body: form as any });
  const data = await res.json() as any;
  if (data.faceset_token) return data.faceset_token as string;
  if (data.error_message?.includes("FACESET_EXIST")) {
    const form2 = new FormData();
    form2.append("api_key", ENV.faceppApiKey);
    form2.append("api_secret", ENV.faceppApiSecret);
    form2.append("outer_id", SYSTEM_OUTER_ID);
    const res2 = await fetch(`${FACEPP_BASE}/faceset/getdetail`, { method: "POST", body: form2 as any });
    const data2 = await res2.json() as any;
    return data2.faceset_token as string;
  }
  throw new Error(`Face++ faceset: ${data.error_message}`);
}

async function addFaceToFaceSet(facesetToken: string, faceToken: string): Promise<void> {
  const form = new FormData();
  form.append("api_key", ENV.faceppApiKey);
  form.append("api_secret", ENV.faceppApiSecret);
  form.append("faceset_token", facesetToken);
  form.append("face_tokens", faceToken);
  const res = await fetch(`${FACEPP_BASE}/faceset/addface`, { method: "POST", body: form as any });
  const data = await res.json() as any;
  if (data.error_message) throw new Error(`Face++ addface: ${data.error_message}`);
}

async function removeFaceFromFaceSet(facesetToken: string, faceToken: string): Promise<void> {
  const form = new FormData();
  form.append("api_key", ENV.faceppApiKey);
  form.append("api_secret", ENV.faceppApiSecret);
  form.append("faceset_token", facesetToken);
  form.append("face_tokens", faceToken);
  await fetch(`${FACEPP_BASE}/faceset/removeface`, { method: "POST", body: form as any });
}

async function setFaceUserId(faceToken: string, userId: string): Promise<void> {
  const form = new FormData();
  form.append("api_key", ENV.faceppApiKey);
  form.append("api_secret", ENV.faceppApiSecret);
  form.append("face_token", faceToken);
  form.append("user_id", userId);
  await fetch(`${FACEPP_BASE}/face/setuserid`, { method: "POST", body: form as any });
}

async function searchFace(facesetToken: string, faceToken: string): Promise<{ userId: string; confidence: number } | null> {
  const form = new FormData();
  form.append("api_key", ENV.faceppApiKey);
  form.append("api_secret", ENV.faceppApiSecret);
  form.append("faceset_token", facesetToken);
  form.append("face_token", faceToken);

  const res = await fetch(`${FACEPP_BASE}/search`, { method: "POST", body: form as any });
  const data = await res.json() as any;
  if (data.error_message) throw new Error(`Face++ search: ${data.error_message}`);
  if (!data.results || data.results.length === 0) return null;
  const best = data.results[0];
  return { userId: best.user_id as string, confidence: best.confidence as number };
}

/** Lógica compartilhada de criação de sessão (igual ao loginRapido) */
async function criarSessaoAgente(ctx: any, agente: any, metodo: string) {
  const openId = `agente_${agente.id}`;
  await upsertUser({ openId, name: agente.nomeAgente || "", email: agente.email || null, loginMethod: metodo });
  const numeroEntrada = `ENT-${Date.now()}-${agente.id}`;
  await createAuditLog({
    agenteId: agente.id,
    chaveJ: agente.chaveJ,
    nomeAgente: agente.nomeAgente,
    numeroEntrada,
    modulo: "Login",
    acao: "Entrada",
    descricao: `Agente ${agente.nomeAgente} fez login via ${metodo}`,
    ipAddress: (ctx.req as any).ip || (ctx.req.headers as any)["x-forwarded-for"] || "unknown",
    userAgent: (ctx.req.headers as any)["user-agent"] || "unknown",
    latitude: null, longitude: null, geoEndereco: null,
  });
  const sessionToken = await sdk.signSession(
    { openId, appId: process.env.VITE_APP_ID || "app", name: agente.nomeAgente || "" },
    { expiresInMs: ONE_YEAR_MS }
  );
  const ipAddress = ((ctx.req as any).ip || (ctx.req.headers as any)["x-forwarded-for"] || "unknown") as string;
  const userAgent = ((ctx.req.headers as any)["user-agent"] || "unknown") as string;
  const sessaoResult = await createSessao({ agenteId: agente.id, chaveJ: agente.chaveJ, nomeAgente: agente.nomeAgente, ipAddress, userAgent });
  const cookieOptions = getSessionCookieOptions(ctx.req);
  ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
  if (sessaoResult) {
    ctx.res.cookie("sessionId", String((sessaoResult as any).insertId), { ...cookieOptions, maxAge: ONE_YEAR_MS });
  }
  return {
    ok: true,
    nomeAgente: agente.nomeAgente,
    cargo: agente.cargo,
    empresa: agente.empresa,
    chaveJ: agente.chaveJ,
  };
}

// ── Router ──────────────────────────────────────────────────────────────────

export const reconhecimentoFacialRouter = router({

  /** Verificar se o agente logado tem rosto cadastrado */
  verificarRosto: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { temRosto: false };
    const openId = ctx.user?.openId;
    if (!openId?.startsWith("agente_")) return { temRosto: false };
    const agenteId = parseInt(openId.replace("agente_", ""), 10);
    const [agente] = await db.select({ faceToken: agentes.faceToken, nomeAgente: agentes.nomeAgente } as any)
      .from(agentes).where(eq(agentes.id, agenteId)).limit(1);
    return { temRosto: !!((agente as any)?.faceToken), nomeAgente: (agente as any)?.nomeAgente };
  }),

  /** Cadastrar rosto do agente logado — captura via webcam */
  cadastrarRosto: protectedProcedure
    .input(z.object({ imageBase64: z.string().min(100) }))
    .mutation(async ({ ctx, input }) => {
      if (!ENV.faceppApiKey) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Reconhecimento facial não configurado." });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível." });
      const openId = ctx.user?.openId;
      if (!openId?.startsWith("agente_")) throw new TRPCError({ code: "UNAUTHORIZED", message: "Agente não identificado." });
      const agenteId = parseInt(openId.replace("agente_", ""), 10);
      const [agente] = await db.select().from(agentes).where(eq(agentes.id, agenteId)).limit(1);
      if (!agente) throw new TRPCError({ code: "NOT_FOUND", message: "Agente não encontrado." });

      const faceToken = await detectFace(input.imageBase64);
      if (!faceToken) throw new TRPCError({ code: "BAD_REQUEST", message: "Nenhum rosto detectado. Posicione-se melhor, com boa iluminação, e tente novamente." });

      const facesetToken = await ensureFaceSet();

      // Remover rosto anterior se existir
      if ((agente as any).faceToken) {
        try { await removeFaceFromFaceSet(facesetToken, (agente as any).faceToken); } catch {}
      }

      await addFaceToFaceSet(facesetToken, faceToken);
      await setFaceUserId(faceToken, String(agente.id));

      await db.update(agentes)
        .set({ faceToken, faceFacesetToken: facesetToken } as any)
        .where(eq(agentes.id, agente.id));

      return { success: true, message: "✅ Rosto cadastrado com sucesso! Agora você pode entrar apenas olhando para a câmera." };
    }),

  /** Remover rosto cadastrado */
  removerRosto: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const openId = ctx.user?.openId;
    if (!openId?.startsWith("agente_")) throw new TRPCError({ code: "UNAUTHORIZED" });
    const agenteId = parseInt(openId.replace("agente_", ""), 10);
    const [agente] = await db.select().from(agentes).where(eq(agentes.id, agenteId)).limit(1);
    if (!(agente as any)?.faceToken) throw new TRPCError({ code: "NOT_FOUND", message: "Nenhum rosto cadastrado." });

    const facesetToken = await ensureFaceSet();
    try { await removeFaceFromFaceSet(facesetToken, (agente as any).faceToken); } catch {}

    await db.update(agentes)
      .set({ faceToken: null, faceFacesetToken: null } as any)
      .where(eq(agentes.id, agenteId));

    return { success: true };
  }),

  /** Login por reconhecimento facial — sem precisar digitar nada */
  loginFacial: publicProcedure
    .input(z.object({ imageBase64: z.string().min(100) }))
    .mutation(async ({ ctx, input }) => {
      if (!ENV.faceppApiKey) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Reconhecimento facial não configurado." });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível." });

      // 1. Detectar rosto na imagem capturada
      const faceToken = await detectFace(input.imageBase64);
      if (!faceToken) throw new TRPCError({ code: "BAD_REQUEST", message: "Nenhum rosto detectado. Posicione-se melhor e tente novamente." });

      // 2. Buscar no FaceSet do sistema
      const facesetToken = await ensureFaceSet();
      const resultado = await searchFace(facesetToken, faceToken);

      if (!resultado || resultado.confidence < 75) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Rosto não reconhecido. Use a senha para entrar ou cadastre seu rosto nas configurações." });
      }

      // 3. Buscar agente pelo ID
      const agenteId = parseInt(resultado.userId, 10);
      const [agente] = await db.select().from(agentes).where(eq(agentes.id, agenteId)).limit(1);

      if (!agente) throw new TRPCError({ code: "UNAUTHORIZED", message: "Agente não encontrado." });
      if (agente.situacao === "Inativo") throw new TRPCError({ code: "UNAUTHORIZED", message: "Agente inativo. Contate o administrador." });

      // 4. Verificar bloqueio de tentativas
      const loginAttempt = await getLoginAttempts(agente.chaveJ ?? "");
      if (loginAttempt?.isBlocked) throw new TRPCError({ code: "FORBIDDEN", message: "Acesso bloqueado após tentativas falhas. Contate o administrador." });
      await resetLoginAttempts(agente.chaveJ ?? "");

      // 5. Criar sessão
      return criarSessaoAgente(ctx, agente, "facial");
    }),
});
