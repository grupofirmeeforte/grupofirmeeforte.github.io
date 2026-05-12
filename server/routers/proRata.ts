import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { proRata } from "../../drizzle/schema";
import { and, eq, like, or, sql, asc, desc } from "drizzle-orm";

// ─── HELPERS ────────────────────────────────────────────────────────────────
function calcFaltaReceber(pagas: number | null, total: number | null): number | null {
  if (pagas == null || total == null) return null;
  const falta = total - pagas;
  return falta >= 0 ? falta : 0;
}

function parseBrDecimal(val: string | number | null | undefined): number | null {
  if (val == null) return null;
  const s = String(val).trim();
  if (!s) return null;
  // Remove "R$", espaços, pontos de milhar e troca vírgula por ponto
  const clean = s.replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.').trim();
  const n = parseFloat(clean);
  return isNaN(n) ? null : n;
}

// ─── ROUTER ─────────────────────────────────────────────────────────────────
export const proRataRouter = router({
  // Lista registros com filtros e paginação
  list: publicProcedure
    .input(z.object({
      search: z.string().optional(),      // busca em nrOperacao ou chaveJ
      chaveJ: z.string().optional(),
      limit: z.number().default(100),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [];
      if (input.chaveJ) {
        conditions.push(like(proRata.chaveJ, `%${input.chaveJ}%`));
      }
      if (input.search) {
        conditions.push(
          or(
            like(proRata.nrOperacao, `%${input.search}%`),
            like(proRata.chaveJ, `%${input.search}%`),
          )
        );
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const rows = await db
        .select()
        .from(proRata)
        .where(where)
        .orderBy(asc(proRata.chaveJ), asc(proRata.nrOperacao))
        .limit(input.limit)
        .offset(input.offset);

      return rows;
    }),

  // Contagem total para paginação
  count: publicProcedure
    .input(z.object({
      search: z.string().optional(),
      chaveJ: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [];
      if (input.chaveJ) {
        conditions.push(like(proRata.chaveJ, `%${input.chaveJ}%`));
      }
      if (input.search) {
        conditions.push(
          or(
            like(proRata.nrOperacao, `%${input.search}%`),
            like(proRata.chaveJ, `%${input.search}%`),
          )
        );
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const result = await db
        .select({ total: sql<number>`COUNT(*)` })
        .from(proRata)
        .where(where);

      return { total: Number(result[0]?.total ?? 0) };
    }),

  // Importação de registros (modo: 'novo' = apenas adiciona, 'subscrever' = limpa e reimporta)
  importar: publicProcedure
    .input(z.object({
      modo: z.enum(["novo", "subscrever"]),
      registros: z.array(z.object({
        agenciaBB: z.string().optional(),
        nrOperacao: z.string(),
        chaveJ: z.string().optional(),
        valorFinanciado: z.string().optional(),
        comissao: z.string().optional(),
        dataFinal: z.string().optional(),
        qtdParcelasPagas: z.number().optional(),
        qtdParcelasTotal: z.number().optional(),
        codOps: z.string().optional(),
        codEst: z.string().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (input.modo === "subscrever") {
        await db.delete(proRata);
      }

      if (input.registros.length === 0) return { inseridos: 0, atualizados: 0 };

      const rows = input.registros.map(r => {
        const pagas = r.qtdParcelasPagas ?? null;
        const total = r.qtdParcelasTotal ?? null;
        return {
          agenciaBB: r.agenciaBB ?? null,
          nrOperacao: r.nrOperacao,
          chaveJ: r.chaveJ ?? null,
          valorFinanciado: parseBrDecimal(r.valorFinanciado)?.toString() ?? null,
          comissao: parseBrDecimal(r.comissao)?.toString() ?? null,
          dataFinal: r.dataFinal ?? null,
          qtdParcelasPagas: pagas,
          qtdParcelasTotal: total,
          codOps: r.codOps ?? null,
          codEst: r.codEst ?? null,
          qtdFaltaReceber: calcFaltaReceber(pagas, total),
        };
      });

      // Inserção em lotes de 500
      const LOTE = 500;
      let inseridos = 0;
      for (let i = 0; i < rows.length; i += LOTE) {
        const lote = rows.slice(i, i + LOTE);
        await db.insert(proRata).values(lote);
        inseridos += lote.length;
      }

      return { inseridos, atualizados: 0 };
    }),

  // Deletar todos os registros
  deletarTodos: publicProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(proRata);
    return { ok: true };
  }),

  // Deletar um registro por ID
  deletar: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(proRata).where(eq(proRata.id, input.id));
      return { ok: true };
    }),
});
