import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { ourocap } from "../../drizzle/schema";
import { eq, and, like, asc, sql } from "drizzle-orm";

export const ourocapRouter = router({
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
      if (input.empresa) conditions.push(eq(ourocap.empresa, input.empresa));
      if (input.mesAno) conditions.push(eq(ourocap.mesAno, input.mesAno));
      if (input.busca) {
        const s = `%${input.busca}%`;
        conditions.push(sql`(${like(ourocap.proposta, s)} OR ${like(ourocap.chaveJ, s)} OR ${like(ourocap.nomeAgente, s)} OR ${like(ourocap.cpfCliente, s)})`);
      }
      const where = conditions.length ? and(...conditions) : undefined;
      const offset = (input.page - 1) * input.pageSize;
      const [rows, [{ count }]] = await Promise.all([
        db.select().from(ourocap).where(where).orderBy(asc(ourocap.nomeAgente)).limit(input.pageSize).offset(offset),
        db.select({ count: sql<number>`COUNT(*)` }).from(ourocap).where(where),
      ]);
      return { rows, total: Number(count) };
    }),

  filtros: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Banco não disponível");
    const [empresas, meses] = await Promise.all([
      db.selectDistinct({ v: ourocap.empresa }).from(ourocap).orderBy(asc(ourocap.empresa)),
      db.selectDistinct({ v: ourocap.mesAno }).from(ourocap).orderBy(asc(ourocap.mesAno)),
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
        proposta: z.string().optional(),
        cpfCliente: z.string().optional(),
        dtVenda: z.string().optional().nullable(),
        dtDebito: z.string().optional().nullable(),
        codProduto: z.string().optional(),
        vrProduto: z.number().optional().nullable(),
        rbm: z.number().optional().nullable(),
        comissao: z.number().optional().nullable(),
        supervisor: z.string().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco não disponível");
      let inseridos = 0;
      for (const r of input.registros) {
        await db.insert(ourocap).values({
          empresa: r.empresa ?? null,
          mesAno: r.mesAno ?? null,
          chaveJ: r.chaveJ ?? null,
          nomeAgente: r.nomeAgente ?? null,
          proposta: r.proposta ?? null,
          cpfCliente: r.cpfCliente ?? null,
          dtVenda: r.dtVenda ? new Date(r.dtVenda) : null,
          dtDebito: r.dtDebito ? new Date(r.dtDebito) : null,
          codProduto: r.codProduto ?? null,
          vrProduto: r.vrProduto != null ? String(r.vrProduto) : null,
          rbm: r.rbm != null ? String(r.rbm) : null,
          comissao: r.comissao != null ? String(r.comissao) : null,
          supervisor: r.supervisor ?? null,
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
      await db.delete(ourocap).where(eq(ourocap.id, input.id));
      return { ok: true };
    }),

  limparMes: protectedProcedure
    .input(z.object({ mesAno: z.string(), empresa: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco não disponível");
      const conditions: any[] = [eq(ourocap.mesAno, input.mesAno)];
      if (input.empresa) conditions.push(eq(ourocap.empresa, input.empresa));
      await db.delete(ourocap).where(and(...conditions));
      return { ok: true };
    }),
});
