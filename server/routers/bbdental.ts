import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { bbdental } from "../../drizzle/schema";
import { eq, and, like, asc, sql } from "drizzle-orm";

export const bbdentalRouter = router({
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
      if (input.empresa) conditions.push(eq(bbdental.empresa, input.empresa));
      if (input.mesAno) conditions.push(eq(bbdental.mesAno, input.mesAno));
      if (input.busca) {
        const s = `%${input.busca}%`;
        conditions.push(sql`(${like(bbdental.proposta, s)} OR ${like(bbdental.chaveJ, s)} OR ${like(bbdental.nomeAgente, s)} OR ${like(bbdental.cpfCliente, s)})`);
      }
      const where = conditions.length ? and(...conditions) : undefined;
      const offset = (input.page - 1) * input.pageSize;
      const [rows, [{ count }]] = await Promise.all([
        db.select().from(bbdental).where(where).orderBy(asc(bbdental.nomeAgente)).limit(input.pageSize).offset(offset),
        db.select({ count: sql<number>`COUNT(*)` }).from(bbdental).where(where),
      ]);
      return { rows, total: Number(count) };
    }),

  filtros: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Banco não disponível");
    const [empresas, meses] = await Promise.all([
      db.selectDistinct({ v: bbdental.empresa }).from(bbdental).orderBy(asc(bbdental.empresa)),
      db.selectDistinct({ v: bbdental.mesAno }).from(bbdental).orderBy(asc(bbdental.mesAno)),
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
        produto: z.string().optional(),
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
        await db.insert(bbdental).values({
          empresa: r.empresa ?? null,
          mesAno: r.mesAno ?? null,
          chaveJ: r.chaveJ ?? null,
          nomeAgente: r.nomeAgente ?? null,
          proposta: r.proposta ?? null,
          cpfCliente: r.cpfCliente ?? null,
          dtVenda: r.dtVenda ? new Date(r.dtVenda) : null,
          produto: r.produto ?? null,
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
      await db.delete(bbdental).where(eq(bbdental.id, input.id));
      return { ok: true };
    }),

  limparMes: protectedProcedure
    .input(z.object({ mesAno: z.string(), empresa: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco não disponível");
      const conditions: any[] = [eq(bbdental.mesAno, input.mesAno)];
      if (input.empresa) conditions.push(eq(bbdental.empresa, input.empresa));
      await db.delete(bbdental).where(and(...conditions));
      return { ok: true };
    }),
});
