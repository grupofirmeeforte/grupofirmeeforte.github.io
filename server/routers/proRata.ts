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
  if (typeof val === 'number') return val;
  const s = String(val).trim();
  if (!s) return null;
  // Remover símbolo de moeda e espaços
  const raw = s.replace(/R\$\s*/g, '').replace(/\s/g, '').trim();
  let clean: string;
  if (raw.includes(',')) {
    // Formato BR: "1.234,56" ou "1234,56" — vírgula é decimal
    clean = raw.replace(/\./g, '').replace(',', '.');
  } else if (raw.includes('.')) {
    // Sem vírgula, tem ponto: verificar se é decimal ou milhar
    const parts = raw.split('.');
    const lastPart = parts[parts.length - 1];
    if (lastPart.length <= 2) {
      // Ex: "9.99", "15139.67" — ponto é decimal
      clean = raw;
    } else {
      // Ex: "1.513.967" — ponto é separador de milhar BR
      clean = raw.replace(/\./g, '');
    }
  } else {
    clean = raw;
  }
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

      // Total a receber no mês anterior: operações com dataFinal no mês passado
      const now = new Date();
      const mesAnterior = now.getMonth() === 0 ? 12 : now.getMonth(); // getMonth() é 0-based, então mês anterior = getMonth()
      const anoMesAnterior = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      const mmAnterior = String(mesAnterior).padStart(2, '0');
      const yyyyAnterior = String(anoMesAnterior);
      // dataFinal está no formato DD/MM/AAAA
      const mesAnteriorPattern = `%/${mmAnterior}/${yyyyAnterior}`;

      // Somar comissão uma única vez por contrato (nrOperacao)
      // para evitar duplicação quando há múltiplos lançamentos do mesmo contrato
      const resultMesAnterior = await db.execute(sql`
        SELECT
          COALESCE(SUM(comissao_unica), 0) AS totalMesAnterior,
          COUNT(*) AS countMesAnterior
        FROM (
          SELECT nrOperacao, MAX(CAST(comissao AS DECIMAL(15,4))) AS comissao_unica
          FROM pro_rata
          WHERE codEst = '1'
          GROUP BY nrOperacao
        ) sub
      `);

      return {
        total: Number(result[0]?.total ?? 0),
        totalVlr: Number(result[0]?.totalVlr ?? 0),
        totalFinanciado: Number(result[0]?.totalFinanciado ?? 0),
        totalComissao: Number(result[0]?.totalComissao ?? 0),
        totalFalta: Number(result[0]?.totalFalta ?? 0),
        totalMesAnterior: Number((resultMesAnterior as any)[0]?.totalMesAnterior ?? 0),
        countMesAnterior: Number((resultMesAnterior as any)[0]?.countMesAnterior ?? 0),
        mesAnteriorLabel: `${mmAnterior}/${yyyyAnterior}`,
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

            if (nova) {
              // Só marca encerrada se a operação está na nova planilha com Falta = 0
              const novasPagas = nova.qtdParcelasPagas ?? null;
              const novasTotal = nova.qtdParcelasTotal ?? null;
              const novaFalta = calcFaltaReceber(novasPagas, novasTotal);
              if (novaFalta === 0 && (atual.qtdFaltaReceber ?? 0) > 0) {
                motivo = "encerrada";
                // Calcular vlrPerdido como comissao × parcelas que faltavam
                const comissaoNum = parseBrDecimal(atual.comissao);
                const faltava = atual.qtdFaltaReceber ?? 0;
                vlrPerdido = (comissaoNum != null && faltava > 0) ? comissaoNum * faltava : null;
              }
            }
            // Operações removidas da planilha NÃO são marcadas como encerradas

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
