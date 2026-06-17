import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { seguros } from "../../drizzle/schema";
import { eq, and, like, asc, sql } from "drizzle-orm";

export const segurosRouter = router({
  listar: protectedProcedure
    .input(z.object({
      empresa: z.string().optional(),
      mesAno: z.string().optional(),
      busca: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco não disponível");
      const conditions: any[] = [];
      if (input.empresa) conditions.push(eq(seguros.empresa, input.empresa));
      if (input.mesAno) conditions.push(eq(seguros.mesAno, input.mesAno));
      if (input.busca) {
        const s = `%${input.busca}%`;
        conditions.push(sql`(${like(seguros.nrContrato, s)} OR ${like(seguros.chaveJ, s)} OR ${like(seguros.nomeAgente, s)})`);
      }
      const where = conditions.length ? and(...conditions) : undefined;
      const offset = (input.page - 1) * input.pageSize;
      const [rows, [{ count }]] = await Promise.all([
        db.select().from(seguros).where(where).orderBy(asc(seguros.nomeAgente)).limit(input.pageSize).offset(offset),
        db.select({ count: sql<number>`COUNT(*)` }).from(seguros).where(where),
      ]);
      return { rows, total: Number(count) };
    }),

  filtros: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Banco não disponível");
    const [empresas, meses] = await Promise.all([
      db.selectDistinct({ v: seguros.empresa }).from(seguros).orderBy(asc(seguros.empresa)),
      db.selectDistinct({ v: seguros.mesAno }).from(seguros).orderBy(asc(seguros.mesAno)),
    ]);
    return {
      empresas: empresas.map(r => r.v).filter(Boolean),
      meses: meses.map(r => r.v).filter(Boolean),
    };
  }),

  importar: protectedProcedure
    .input(z.object({
      registros: z.array(z.object({
        empresa: z.string().optional(),
        mesAno: z.string().optional(),
        chaveJ: z.string().optional(),
        nomeAgente: z.string().optional(),
        dtOperacao: z.string().optional().nullable(),
        prazo: z.number().optional().nullable(),
        banco: z.string().optional(),
        nrContrato: z.string().optional(),
        vrEmprestimo: z.number().optional().nullable(),
        refinanciado: z.boolean().optional().nullable(),
        dtPagto: z.string().optional().nullable(),
        digitadoPor: z.string().optional(),
        vrComissao: z.number().optional().nullable(),
        percComissao: z.number().optional().nullable(),
        incremento: z.number().optional().nullable(),
        parcela: z.number().optional().nullable(),
        comissaoAgente: z.number().optional().nullable(),
        observacao: z.string().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco não disponível");
      let inseridos = 0;
      for (const r of input.registros) {
        await db.insert(seguros).values({
          empresa: r.empresa ?? null,
          mesAno: r.mesAno ?? null,
          chaveJ: r.chaveJ ?? null,
          nomeAgente: r.nomeAgente ?? null,
          dtOperacao: r.dtOperacao ? new Date(r.dtOperacao) : null,
          prazo: r.prazo ?? null,
          banco: r.banco ?? null,
          nrContrato: r.nrContrato ?? null,
          vrEmprestimo: r.vrEmprestimo != null ? String(r.vrEmprestimo) : null,
          refinanciado: r.refinanciado ?? null,
          dtPagto: r.dtPagto ? new Date(r.dtPagto) : null,
          digitadoPor: r.digitadoPor ?? null,
          vrComissao: r.vrComissao != null ? String(r.vrComissao) : null,
          percComissao: r.percComissao != null ? String(r.percComissao) : null,
          incremento: r.incremento != null ? String(r.incremento) : null,
          parcela: r.parcela ?? null,
          comissaoAgente: r.comissaoAgente != null ? String(r.comissaoAgente) : null,
          observacao: r.observacao ?? null,
        });
        inseridos++;
      }
      return { ok: true, inseridos };
    }),

  excluir: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco não disponível");
      await db.delete(seguros).where(eq(seguros.id, input.id));
      return { ok: true };
    }),

  limparMes: protectedProcedure
    .input(z.object({ mesAno: z.string(), empresa: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco não disponível");
      const conditions: any[] = [eq(seguros.mesAno, input.mesAno)];
      if (input.empresa) conditions.push(eq(seguros.empresa, input.empresa));
      await db.delete(seguros).where(and(...conditions));
      return { ok: true };
    }),
});
