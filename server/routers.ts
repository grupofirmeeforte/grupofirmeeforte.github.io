import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { agentesRouter } from "./routers/agentes";
import { auditoriaRouter } from "./routers/auditoria";
import { z } from "zod";
import { getAgenteByChaveJ } from "./db";
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
        // Buscar agente pelo ChaveJ
        const agente = await getAgenteByChaveJ(input.chaveJ);
        
        if (!agente) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "ChaveJ ou Senha inválidos",
          });
        }
        
        // Verificar senha
        if (agente.senha !== input.senha) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "ChaveJ ou Senha inválidos",
          });
        }
        
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
