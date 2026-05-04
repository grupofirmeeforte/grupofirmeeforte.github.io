import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { agentesRouter } from "./routers/agentes";
import { auditoriaRouter } from "./routers/auditoria";
import { z } from "zod";
import { getAgenteByChaveJ, getLoginAttempts, incrementLoginAttempts, resetLoginAttempts, createAuditLog } from "./db";
import { sdk } from "./_core/sdk";
import { TRPCError } from "@trpc/server";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    loginCustom: publicProcedure
      .input(z.object({
        chaveJ: z.string().min(1, "ChaveJ é obrigatório"),
        senha: z.string().min(1, "Senha é obrigatória"),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verificar se está bloqueado
        const loginAttempt = await getLoginAttempts(input.chaveJ);
        if (loginAttempt?.isBlocked) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Sistema bloqueado após 3 tentativas falhas. Contate o administrador.",
          });
        }
        
        // Buscar agente pelo ChaveJ
        const agente = await getAgenteByChaveJ(input.chaveJ);
        
        if (!agente) {
          await incrementLoginAttempts(input.chaveJ);
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "ChaveJ ou Senha inválidos",
          });
        }
        
        // Verificar senha
        if (agente.senha !== input.senha) {
          await incrementLoginAttempts(input.chaveJ);
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "ChaveJ ou Senha inválidos",
          });
        }
        
        // Reset tentativas após login bem-sucedido
        await resetLoginAttempts(input.chaveJ);
        
        // Gerar número de entrada único
        const numeroEntrada = `ENT-${Date.now()}-${agente.id}`;
        
        // Criar registro de auditoria
        await createAuditLog({
          agenteId: agente.id,
          chaveJ: agente.chaveJ,
          nomeAgente: agente.nomeAgente,
          numeroEntrada,
          modulo: "Login",
          acao: "Entrada",
          descricao: `Agente ${agente.nomeAgente} fez login no sistema`,
          ipAddress: (ctx.req as any).ip || (ctx.req.headers as any)['x-forwarded-for'] || 'unknown',
          userAgent: (ctx.req.headers as any)['user-agent'] || 'unknown',
        });
        
        // Criar token de sessão customizado
        const sessionToken = await sdk.signSession(
          {
            openId: `agente_${agente.id}`,
            appId: process.env.VITE_APP_ID || "app",
            name: agente.nomeAgente || "",
          },
          { expiresInMs: ONE_YEAR_MS }
        );
        
        // Definir cookie de sessão
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });
        
        return {
          success: true,
          numeroEntrada,
          agente: {
            id: agente.id,
            chaveJ: agente.chaveJ,
            nome: agente.nomeAgente,
          },
        };
      }),
  }),
  agentes: agentesRouter,
  auditoria: auditoriaRouter,
});

export type AppRouter = typeof appRouter;
