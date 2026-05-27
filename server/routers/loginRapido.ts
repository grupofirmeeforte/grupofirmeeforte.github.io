/**
 * Router de Login Rápido
 * Dois métodos alternativos ao login por senha:
 * 1. Celular: ChaveJ + últimos 4 dígitos do celular cadastrado
 * 2. PIN: ChaveJ + PIN de 4-6 dígitos cadastrado pelo agente
 */
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { agentes } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  getAgenteByChaveJ,
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

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Remove tudo que não for dígito e retorna os últimos N dígitos */
function ultimosDigitos(celular: string | null | undefined, n: number): string {
  if (!celular) return "";
  return celular.replace(/\D/g, "").slice(-n);
}

/** Lógica compartilhada de criação de sessão após autenticação bem-sucedida */
async function criarSessaoAgente(
  ctx: any,
  agente: { id: number; chaveJ: string | null; nomeAgente: string; email?: string | null; dataNascimento?: string | null },
  metodo: string
) {
  const openId = `agente_${agente.id}`;
  await upsertUser({
    openId,
    name: agente.nomeAgente || "",
    email: agente.email || null,
    loginMethod: metodo,
  });

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
    latitude: null,
    longitude: null,
    geoEndereco: null,
  });

  const sessionToken = await sdk.signSession(
    { openId, appId: process.env.VITE_APP_ID || "app", name: agente.nomeAgente || "" },
    { expiresInMs: ONE_YEAR_MS }
  );

  const ipAddress = ((ctx.req as any).ip || (ctx.req.headers as any)["x-forwarded-for"] || "unknown") as string;
  const userAgent = ((ctx.req.headers as any)["user-agent"] || "unknown") as string;
  const sessaoResult = await createSessao({
    agenteId: agente.id,
    chaveJ: agente.chaveJ,
    nomeAgente: agente.nomeAgente,
    ipAddress,
    userAgent,
  });

  const cookieOptions = getSessionCookieOptions(ctx.req);
  ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
  if (sessaoResult && (sessaoResult as any).insertId) {
    ctx.res.cookie("sessionId", String((sessaoResult as any).insertId), { ...cookieOptions, maxAge: ONE_YEAR_MS });
  }

  // Verificar aniversário (janela de 3 dias: véspera, dia e dia seguinte)
  const hoje = new Date();
  let isAniversario = false;
  let diasParaAniversario = 0;
  if (agente.dataNascimento) {
    const partes = agente.dataNascimento.split("-");
    const mesNasc = parseInt(partes[1], 10);
    const diaNasc = parseInt(partes[2], 10);
    for (const delta of [-1, 0, 1]) {
      const dataVerif = new Date(hoje);
      dataVerif.setDate(hoje.getDate() + delta);
      if (diaNasc === dataVerif.getDate() && mesNasc === dataVerif.getMonth() + 1) {
        isAniversario = true;
        diasParaAniversario = -delta;
        break;
      }
    }
  }

  return { success: true, numeroEntrada, isAniversario, diasParaAniversario, agente: { id: agente.id, chaveJ: agente.chaveJ, nome: agente.nomeAgente, dataNascimento: agente.dataNascimento } };
}

// ── Router ────────────────────────────────────────────────────────────────────

export const loginRapidoRouter = router({

  /**
   * Verifica se o agente tem celular ou PIN cadastrado (para mostrar opções na tela)
   */
  verificarMetodos: publicProcedure
    .input(z.object({ chaveJ: z.string() }))
    .query(async ({ input }) => {
      if (!input.chaveJ || input.chaveJ.length < 4) return { temCelular: false, temPin: false };
      const agente = await getAgenteByChaveJ(input.chaveJ.toUpperCase());
      if (!agente) return { temCelular: false, temPin: false };
      return {
        temCelular: !!(agente.celular && agente.celular.replace(/\D/g, "").length >= 4),
        temPin: !!(agente as any).pinAcesso,
        // Mostrar últimos 4 dígitos mascarados: ex: ****1234
        celularMascarado: agente.celular
          ? `****${agente.celular.replace(/\D/g, "").slice(-4)}`
          : null,
      };
    }),

  /**
   * Login por celular: ChaveJ + últimos 4 dígitos do celular cadastrado
   */
  loginCelular: publicProcedure
    .input(z.object({
      chaveJ: z.string().min(1),
      digitosCelular: z.string().length(4, "Digite exatamente 4 dígitos"),
    }))
    .mutation(async ({ ctx, input }) => {
      const loginAttempt = await getLoginAttempts(input.chaveJ);
      if (loginAttempt?.isBlocked) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sistema bloqueado após 3 tentativas falhas. Contate o administrador." });
      }

      const agente = await getAgenteByChaveJ(input.chaveJ.toUpperCase());
      if (!agente) {
        await incrementLoginAttempts(input.chaveJ);
        throw new TRPCError({ code: "UNAUTHORIZED", message: "ChaveJ não encontrada." });
      }

      const ultimos4 = ultimosDigitos(agente.celular, 4);
      if (!ultimos4 || ultimos4 !== input.digitosCelular) {
        await incrementLoginAttempts(input.chaveJ);
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Dígitos do celular incorretos. Verifique e tente novamente." });
      }

      await resetLoginAttempts(input.chaveJ);
      return criarSessaoAgente(ctx, agente as any, "celular");
    }),

  /**
   * Login por PIN: ChaveJ + PIN de 4-6 dígitos
   */
  loginPin: publicProcedure
    .input(z.object({
      chaveJ: z.string().min(1),
      pin: z.string().min(4).max(6),
    }))
    .mutation(async ({ ctx, input }) => {
      const loginAttempt = await getLoginAttempts(input.chaveJ);
      if (loginAttempt?.isBlocked) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sistema bloqueado após 3 tentativas falhas. Contate o administrador." });
      }

      const agente = await getAgenteByChaveJ(input.chaveJ.toUpperCase());
      if (!agente) {
        await incrementLoginAttempts(input.chaveJ);
        throw new TRPCError({ code: "UNAUTHORIZED", message: "ChaveJ não encontrada." });
      }

      const pinSalvo = (agente as any).pinAcesso;
      if (!pinSalvo) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "PIN não cadastrado. Use a senha para entrar e cadastre seu PIN nas configurações." });
      }

      if (pinSalvo !== input.pin) {
        await incrementLoginAttempts(input.chaveJ);
        throw new TRPCError({ code: "UNAUTHORIZED", message: "PIN incorreto. Verifique e tente novamente." });
      }

      await resetLoginAttempts(input.chaveJ);
      return criarSessaoAgente(ctx, agente as any, "pin");
    }),

  /**
   * Cadastrar/alterar PIN do agente logado
   */
  cadastrarPin: protectedProcedure
    .input(z.object({
      pin: z.string().min(4, "PIN deve ter no mínimo 4 dígitos").max(6, "PIN deve ter no máximo 6 dígitos").regex(/^\d+$/, "PIN deve conter apenas números"),
      senhaConfirmacao: z.string().min(1, "Informe sua senha para confirmar"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      // Buscar agente logado
      const openId = ctx.user?.openId;
      if (!openId?.startsWith("agente_")) throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário não autenticado" });
      const agenteId = parseInt(openId.replace("agente_", ""), 10);

      const [agente] = await db.select().from(agentes).where(eq(agentes.id, agenteId)).limit(1);
      if (!agente) throw new TRPCError({ code: "NOT_FOUND", message: "Agente não encontrado" });

      // Confirmar senha
      if (agente.senha !== input.senhaConfirmacao) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Senha incorreta. Confirme sua senha para cadastrar o PIN." });
      }

      await db.update(agentes).set({ pinAcesso: input.pin } as any).where(eq(agentes.id, agenteId));
      return { ok: true, message: "PIN cadastrado com sucesso! Você já pode usá-lo para entrar." };
    }),

  /**
   * Remover PIN do agente logado
   */
  removerPin: protectedProcedure
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const openId = ctx.user?.openId;
      if (!openId?.startsWith("agente_")) throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário não autenticado" });
      const agenteId = parseInt(openId.replace("agente_", ""), 10);

      await db.update(agentes).set({ pinAcesso: null } as any).where(eq(agentes.id, agenteId));
      return { ok: true };
    }),

  /**
   * Verificar se o agente logado tem PIN cadastrado
   */
  meuPin: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { temPin: false };

      const openId = ctx.user?.openId;
      if (!openId?.startsWith("agente_")) return { temPin: false };
      const agenteId = parseInt(openId.replace("agente_", ""), 10);

      const [agente] = await db.select({ pinAcesso: agentes.pinAcesso } as any).from(agentes).where(eq(agentes.id, agenteId)).limit(1);
      return { temPin: !!((agente as any)?.pinAcesso) };
    }),
});
