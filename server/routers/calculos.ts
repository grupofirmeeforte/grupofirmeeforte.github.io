import { z } from "zod";
import { publicProcedure, router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { calculos } from "../../drizzle/schema";
import { eq, and, like, or, sql, desc, asc } from "drizzle-orm";

export const calculosRouter = router({
  // Listar com filtros
  listar: publicProcedure
    .input(z.object({
      mesRef: z.string().optional(),
      empresa: z.string().optional(),
      chaveJ: z.string().optional(),
      nomeAgente: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const conditions = [];

      if (input.mesRef) {
        conditions.push(eq(calculos.mesRef, input.mesRef));
      }
      if (input.empresa && input.empresa !== "Todas") {
        conditions.push(eq(calculos.empresa, input.empresa));
      }
      if (input.chaveJ) {
        conditions.push(like(calculos.chaveJ, `%${input.chaveJ}%`));
      }
      if (input.nomeAgente) {
        conditions.push(like(calculos.nomeAgente, `%${input.nomeAgente}%`));
      }

      const result = await db
        .select()
        .from(calculos)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(calculos.mesRef), asc(calculos.empresa), asc(calculos.nomeAgente));

      return result;
    }),

  // Listar meses disponíveis
  mesesDisponiveis: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const result = await db
      .selectDistinct({ mesRef: calculos.mesRef })
      .from(calculos)
      .orderBy(desc(calculos.mesRef));
    return result.map(r => r.mesRef).filter(Boolean);
  }),

  // Listar empresas disponíveis
  empresasDisponiveis: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const result = await db
      .selectDistinct({ empresa: calculos.empresa })
      .from(calculos)
      .orderBy(calculos.empresa);
    return result.map(r => r.empresa).filter(Boolean);
  }),

  // Criar registro
  criar: publicProcedure
    .input(z.object({
      tipoPagamento: z.string().optional(),
      empresa: z.string().optional(),
      situacao: z.string().optional(),
      mesRef: z.string().optional(),
      chaveJ: z.string().optional(),
      nomeAgente: z.string().optional(),
      cidade: z.string().optional(),
      percentual: z.number().optional(),
      comissaoTotal: z.number().optional(),
      rbmTotal: z.number().optional(),
      comissaoConsig: z.number().optional(),
      comissaoConsorcio: z.number().optional(),
      comissaoOurocap: z.number().optional(),
      comissaoCc: z.number().optional(),
      comissaoSeguros: z.number().optional(),
      ajudaCusto: z.number().optional(),
      creditosDebitos: z.number().optional(),
      adiantamento: z.number().optional(),
      reajuste: z.number().optional(),
      rbmCreditoC2: z.number().optional(),
      rbmContaCorrente: z.number().optional(),
      rbmConsorcioC2: z.number().optional(),
      rbmOurocap: z.number().optional(),
      rbmSeguros: z.number().optional(),
      qtdeContas: z.number().optional(),
      vrLiquidoC2: z.number().optional(),
      srccC2: z.number().optional(),
      vrLiquidoSrcc: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB unavailable');
      const [result] = await db.insert(calculos).values(input as any);
      return result;
    }),

  // Editar registro
  editar: publicProcedure
    .input(z.object({
      id: z.number(),
      tipoPagamento: z.string().optional(),
      empresa: z.string().optional(),
      situacao: z.string().optional(),
      mesRef: z.string().optional(),
      chaveJ: z.string().optional(),
      nomeAgente: z.string().optional(),
      cidade: z.string().optional(),
      percentual: z.number().optional(),
      comissaoTotal: z.number().optional(),
      rbmTotal: z.number().optional(),
      comissaoConsig: z.number().optional(),
      comissaoConsorcio: z.number().optional(),
      comissaoOurocap: z.number().optional(),
      comissaoCc: z.number().optional(),
      comissaoSeguros: z.number().optional(),
      ajudaCusto: z.number().optional(),
      creditosDebitos: z.number().optional(),
      adiantamento: z.number().optional(),
      reajuste: z.number().optional(),
      rbmCreditoC2: z.number().optional(),
      rbmContaCorrente: z.number().optional(),
      rbmConsorcioC2: z.number().optional(),
      rbmOurocap: z.number().optional(),
      rbmSeguros: z.number().optional(),
      qtdeContas: z.number().optional(),
      vrLiquidoC2: z.number().optional(),
      srccC2: z.number().optional(),
      vrLiquidoSrcc: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB unavailable');
      const { id, ...dados } = input;
      await db.update(calculos).set(dados as any).where(eq(calculos.id, id));
      return { success: true };
    }),

  // Deletar registro
  deletar: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB unavailable');
      await db.delete(calculos).where(eq(calculos.id, input.id));
      return { success: true };
    }),
});
