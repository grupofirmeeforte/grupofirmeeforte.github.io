import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { proRata, proRataEncerradas } from "../../drizzle/schema";
import { and, eq, like, or, sql, asc, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

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
  const clean = s.replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.').trim();
  const n = parseFloat(clean);
  return isNaN(n) ? null : n;
}

// ─── ROUTER ─────────────────────────────────────────────────────────────────
export const proRataRouter = router({

  // Lista registros com filtros e paginação
  list: publicProcedure
    .input(z.object({
      search: z.string().optional(),
      chaveJ: z.string().optional(),
      empresa: z.string().optional(),
      limit: z.number().default(100),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [];
      if (input.chaveJ) conditions.push(like(proRata.chaveJ, `%${input.chaveJ}%`));
      if (input.empresa) conditions.push(like(proRata.empresa, `%${input.empresa}%`));
      if (input.search) {
        conditions.push(
          or(
            like(proRata.nrOperacao, `%${input.search}%`),
            like(proRata.chaveJ, `%${input.search}%`),
            like(proRata.empresa, `%${input.search}%`),
          )
        );
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;
      return await db
        .select()
        .from(proRata)
        .where(where)
        .orderBy(asc(proRata.empresa), asc(proRata.chaveJ), asc(proRata.nrOperacao))
        .limit(input.limit)
        .offset(input.offset);
    }),

  // Totais globais para o resumo
  totais: publicProcedure
    .input(z.object({
      search: z.string().optional(),
      chaveJ: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [];
      // Totais somam apenas operações ativas (codEst = 1)
      conditions.push(eq(proRata.codEst, '1'));
      if (input.chaveJ) conditions.push(like(proRata.chaveJ, `%${input.chaveJ}%`));
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
        .select({
          total: sql<number>`COUNT(*)`,
          totalVlr: sql<number>`COALESCE(SUM(vlr), 0)`,
          totalFinanciado: sql<number>`COALESCE(SUM(valorFinanciado), 0)`,
          totalComissao: sql<number>`COALESCE(SUM(comissao), 0)`,
          totalFalta: sql<number>`COALESCE(SUM(qtdFaltaReceber), 0)`,
        })
        .from(proRata)
        .where(where);

      return {
        total: Number(result[0]?.total ?? 0),
        totalVlr: Number(result[0]?.totalVlr ?? 0),
        totalFinanciado: Number(result[0]?.totalFinanciado ?? 0),
        totalComissao: Number(result[0]?.totalComissao ?? 0),
        totalFalta: Number(result[0]?.totalFalta ?? 0),
      };
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
      if (input.chaveJ) conditions.push(like(proRata.chaveJ, `%${input.chaveJ}%`));
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

  // Importação com detecção automática de operações encerradas
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
        codEst: z.string().optional(),
        empresa: z.string().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const importacaoId = randomUUID();

      // ── Detectar encerradas (apenas no modo subscrever) ──────────────────
      let encerradas: any[] = [];
      if (input.modo === "subscrever" && input.registros.length > 0) {
        // Buscar todas as operações atuais com falta > 0
        const atuais = await db
          .select()
          .from(proRata)
          .where(sql`qtdFaltaReceber > 0`);

        if (atuais.length > 0) {
          // Construir mapa das novas operações
          const novasMap = new Map<string, typeof input.registros[0]>();
          for (const r of input.registros) {
            novasMap.set(String(r.nrOperacao).trim(), r);
          }

          for (const atual of atuais) {
            const nova = novasMap.get(String(atual.nrOperacao).trim());
            let motivo: string | null = null;
            let vlrPerdido: number | null = null;

            if (!nova) {
              // Operação removida da nova planilha
              motivo = "removida";
              vlrPerdido = parseBrDecimal(atual.vlr);
            } else {
              // Operação presente mas falta chegou a 0
              const novasPagas = nova.qtdParcelasPagas ?? null;
              const novasTotal = nova.qtdParcelasTotal ?? null;
              const novaFalta = calcFaltaReceber(novasPagas, novasTotal);
              if (novaFalta === 0 && (atual.qtdFaltaReceber ?? 0) > 0) {
                motivo = "encerrada";
                vlrPerdido = parseBrDecimal(atual.vlr);
              }
            }

            if (motivo) {
              encerradas.push({
                importacaoId,
                nrOperacao: atual.nrOperacao,
                chaveJ: atual.chaveJ ?? null,
                agenciaBB: atual.agenciaBB ?? null,
                empresa: atual.empresa ?? null,
                valorFinanciado: atual.valorFinanciado ?? null,
                comissao: atual.comissao ?? null,
                dataFinal: atual.dataFinal ?? null,
                qtdParcelasPagas: atual.qtdParcelasPagas ?? null,
                qtdParcelasTotal: atual.qtdParcelasTotal ?? null,
                vlrPerdido: vlrPerdido?.toString() ?? null,
                motivo,
              });
            }
          }
        }

        // Gravar encerradas antes de apagar a base
        if (encerradas.length > 0) {
          const LOTE = 500;
          for (let i = 0; i < encerradas.length; i += LOTE) {
            await db.insert(proRataEncerradas).values(encerradas.slice(i, i + LOTE));
          }
        }

        // Agora limpar a base atual
        await db.delete(proRata);
      }

      if (input.registros.length === 0) return { inseridos: 0, encerradas: encerradas.length, importacaoId };

      const rows = input.registros.map(r => {
        const pagas = r.qtdParcelasPagas ?? null;
        const total = r.qtdParcelasTotal ?? null;
        const falta = calcFaltaReceber(pagas, total);
        const comissaoNum = parseBrDecimal(r.comissao);
        const vlr = (comissaoNum != null && falta != null) ? (comissaoNum * falta) : null;

        return {
          agenciaBB: r.agenciaBB ?? null,
          nrOperacao: r.nrOperacao,
          chaveJ: r.chaveJ ?? null,
          valorFinanciado: parseBrDecimal(r.valorFinanciado)?.toString() ?? null,
          comissao: comissaoNum?.toString() ?? null,
          dataFinal: r.dataFinal ?? null,
          qtdParcelasPagas: pagas,
          qtdParcelasTotal: total,
          codEst: r.codEst ?? null,
          empresa: r.empresa ?? null,
          qtdFaltaReceber: falta,
          vlr: vlr?.toString() ?? null,
        };
      });

      const LOTE = 500;
      let inseridos = 0;
      for (let i = 0; i < rows.length; i += LOTE) {
        await db.insert(proRata).values(rows.slice(i, i + LOTE));
        inseridos += LOTE;
      }

      return { inseridos, encerradas: encerradas.length, importacaoId };
    }),

  // ── RELATÓRIO DE ENCERRADAS ──────────────────────────────────────────────
  encerradas: publicProcedure
    .input(z.object({
      importacaoId: z.string().optional(), // filtrar por importação específica
      search: z.string().optional(),
      limit: z.number().default(100),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [];
      if (input.importacaoId) {
        conditions.push(eq(proRataEncerradas.importacaoId, input.importacaoId));
      }
      if (input.search) {
        conditions.push(
          or(
            like(proRataEncerradas.nrOperacao, `%${input.search}%`),
            like(proRataEncerradas.chaveJ, `%${input.search}%`),
            like(proRataEncerradas.empresa, `%${input.search}%`),
          )
        );
      }
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const rows = await db
        .select()
        .from(proRataEncerradas)
        .where(where)
        .orderBy(desc(proRataEncerradas.importacaoData), asc(proRataEncerradas.empresa), asc(proRataEncerradas.chaveJ))
        .limit(input.limit)
        .offset(input.offset);

      return rows;
    }),

  // Lista de importações distintas (para o seletor de histórico)
  historicoImportacoes: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db
      .select({
        importacaoId: proRataEncerradas.importacaoId,
        importacaoData: proRataEncerradas.importacaoData,
        total: sql<number>`COUNT(*)`,
        totalVlrPerdido: sql<number>`COALESCE(SUM(vlrPerdido), 0)`,
      })
      .from(proRataEncerradas)
      .groupBy(proRataEncerradas.importacaoId, proRataEncerradas.importacaoData)
      .orderBy(desc(proRataEncerradas.importacaoData));

    return result.map(r => ({
      importacaoId: r.importacaoId,
      importacaoData: r.importacaoData,
      total: Number(r.total),
      totalVlrPerdido: Number(r.totalVlrPerdido),
    }));
  }),

  // Totais do relatório de encerradas
  encerradasTotais: publicProcedure
    .input(z.object({
      importacaoId: z.string().optional(),
      search: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [];
      if (input.importacaoId) conditions.push(eq(proRataEncerradas.importacaoId, input.importacaoId));
      if (input.search) {
        conditions.push(
          or(
            like(proRataEncerradas.nrOperacao, `%${input.search}%`),
            like(proRataEncerradas.chaveJ, `%${input.search}%`),
          )
        );
      }
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const result = await db
        .select({
          total: sql<number>`COUNT(*)`,
          totalVlrPerdido: sql<number>`COALESCE(SUM(vlrPerdido), 0)`,
          totalFinanciado: sql<number>`COALESCE(SUM(valorFinanciado), 0)`,
        })
        .from(proRataEncerradas)
        .where(where);

      return {
        total: Number(result[0]?.total ?? 0),
        totalVlrPerdido: Number(result[0]?.totalVlrPerdido ?? 0),
        totalFinanciado: Number(result[0]?.totalFinanciado ?? 0),
      };
    }),

  // Deletar todos os registros da base principal
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
