import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getAuditLogs, createAuditLog, updateAuditLogSaida } from "../db";
import { getDb } from "../db";
import { auditoria } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export const auditoriaRouter = router({
  list: publicProcedure
    .input(z.object({
      chaveJ: z.string().optional(),
      modulo: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      let query: any = db.select().from(auditoria);

      if (input.chaveJ) {
        query = query.where(eq(auditoria.chaveJ, input.chaveJ));
      }
      if (input.modulo) {
        query = query.where(eq(auditoria.modulo, input.modulo));
      }

      return await query
        .orderBy(desc(auditoria.horarioEntrada))
        .limit(input.limit)
        .offset(input.offset);
    }),

  count: publicProcedure
    .input(z.object({
      chaveJ: z.string().optional(),
      modulo: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return 0;

      let query: any = db.select({ count: auditoria.id }).from(auditoria);

      if (input.chaveJ) {
        query = query.where(eq(auditoria.chaveJ, input.chaveJ));
      }
      if (input.modulo) {
        query = query.where(eq(auditoria.modulo, input.modulo));
      }

      const result = await query;
      return result.length;
    }),

  create: publicProcedure
    .input(z.object({
      agenteId: z.number(),
      chaveJ: z.string(),
      nomeAgente: z.string(),
      numeroEntrada: z.string(),
      modulo: z.string().optional(),
      acao: z.string().optional(),
      descricao: z.string().optional(),
      tabela: z.string().optional(),
      registroId: z.number().optional(),
      valorAnterior: z.string().optional(),
      valorNovo: z.string().optional(),
      ipAddress: z.string().optional(),
      userAgent: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return await createAuditLog(input);
    }),

  updateSaida: publicProcedure
    .input(z.object({
      numeroEntrada: z.string(),
    }))
    .mutation(async ({ input }) => {
      return await updateAuditLogSaida(input.numeroEntrada);
    }),
});
