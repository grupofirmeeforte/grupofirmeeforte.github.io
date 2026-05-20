import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

// Helper: normaliza retorno de db.execute — mesmo padrão usado em consorcio.ts
// db.execute retorna [rows, fields] no mysql2, então rows[0] é o array de linhas
function getRows(res: any): any[] {
  const data = Array.isArray(res) ? res[0] : res;
  if (!data) return [];
  if (Array.isArray(data)) return data;
  // Se for um único objeto (não array), envolve em array
  if (typeof data === "object") return [data];
  return [];
}

// Helper: extrai valor numérico de uma query SUM — retorna 0 se nulo
function extractSum(res: any): number {
  const rows = getRows(res);
  if (!rows.length) return 0;
  const val = rows[0]?.total ?? rows[0]?.TOTAL ?? 0;
  return parseFloat(String(val)) || 0;
}

export const supervisoresRouter = router({
  listar: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const res = await db.execute(sql`
      SELECT id, chaveJ, nome, pctConsig, pctConsorcio, pctCc, pctOurocap, pctSeguro, pctDental
      FROM supervisores
      WHERE ativo = 1
      ORDER BY nome ASC
    `) as any;
    const rows = getRows(res);
    return rows.map((r: any) => ({
      id: Number(r.id),
      chaveJ: r.chaveJ ?? r.chavej ?? "",
      nome: r.nome ?? "",
      pctConsig: parseFloat(r.pctConsig ?? r.pctconsig ?? 0),
      pctConsorcio: parseFloat(r.pctConsorcio ?? r.pctconsorcio ?? 0),
      pctCc: parseFloat(r.pctCc ?? r.pctcc ?? 0),
      pctOurocap: parseFloat(r.pctOurocap ?? r.pctourocap ?? 0),
      pctSeguro: parseFloat(r.pctSeguro ?? r.pctseguro ?? 0),
      pctDental: parseFloat(r.pctDental ?? r.pctdental ?? 0),
    }));
  }),

  criar: protectedProcedure
    .input(z.object({
      chaveJ: z.string().min(1),
      nome: z.string().min(1),
      pctConsig: z.number().default(0),
      pctConsorcio: z.number().default(0),
      pctCc: z.number().default(0),
      pctOurocap: z.number().default(0),
      pctSeguro: z.number().default(0),
      pctDental: z.number().default(0),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { ok: false };
      const now = Date.now();
      await db.execute(sql`INSERT INTO supervisores (chaveJ, nome, pctConsig, pctConsorcio, pctCc, pctOurocap, pctSeguro, pctDental, ativo, createdAt, updatedAt)
         VALUES (${input.chaveJ}, ${input.nome}, ${input.pctConsig}, ${input.pctConsorcio}, ${input.pctCc}, ${input.pctOurocap}, ${input.pctSeguro}, ${input.pctDental}, 1, ${now}, ${now})`);
      return { ok: true };
    }),

  editar: protectedProcedure
    .input(z.object({
      id: z.number(),
      chaveJ: z.string().min(1),
      nome: z.string().min(1),
      pctConsig: z.number().default(0),
      pctConsorcio: z.number().default(0),
      pctCc: z.number().default(0),
      pctOurocap: z.number().default(0),
      pctSeguro: z.number().default(0),
      pctDental: z.number().default(0),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { ok: false };
      await db.execute(sql`UPDATE supervisores SET chaveJ=${input.chaveJ}, nome=${input.nome}, pctConsig=${input.pctConsig}, pctConsorcio=${input.pctConsorcio}, pctCc=${input.pctCc}, pctOurocap=${input.pctOurocap}, pctSeguro=${input.pctSeguro}, pctDental=${input.pctDental}, updatedAt=${Date.now()} WHERE id=${input.id}`);
      return { ok: true };
    }),

  excluir: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { ok: false };
      await db.execute(sql`UPDATE supervisores SET ativo=0 WHERE id=${input.id}`);
      return { ok: true };
    }),

  // Calcula comissão do supervisor por mês baseado no RBM dos agentes vinculados
  // Regra: se não tem RBM para um produto, comissão = R$ 0,00 (não bloqueia o cálculo)
  calcular: protectedProcedure
    .input(z.object({ mesRef: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const mesRef = (input.mesRef ?? "").trim();

      const supRes = await db.execute(sql`
        SELECT id, chaveJ, nome, pctConsig, pctConsorcio, pctCc, pctOurocap, pctSeguro, pctDental
        FROM supervisores WHERE ativo = 1 ORDER BY nome ASC
      `) as any;
      const supRows = getRows(supRes);
      if (!supRows.length) return [];

      const resultado = await Promise.all(supRows.map(async (sup: any) => {
        const nomeSup = (sup.nome ?? "").trim();
        const pctConsig    = parseFloat(sup.pctConsig    ?? sup.pctconsig    ?? 0);
        const pctConsorcio = parseFloat(sup.pctConsorcio ?? sup.pctconsorcio ?? 0);
        const pctCc        = parseFloat(sup.pctCc        ?? sup.pctcc        ?? 0);
        const pctOurocap   = parseFloat(sup.pctOurocap   ?? sup.pctourocap   ?? 0);
        const pctSeguro    = parseFloat(sup.pctSeguro    ?? sup.pctseguro    ?? 0);
        const pctDental    = parseFloat(sup.pctDental    ?? sup.pctdental    ?? 0);

        // RBM Consignado — campo mes no formato MMAA (ex: "526" = mai/2026)
        // Se percentual = 0, não busca (RBM = 0)
        let rbmConsig = 0;
        if (pctConsig > 0) {
          const r = mesRef
            ? await db!.execute(sql`SELECT COALESCE(SUM(CAST(rbm AS DECIMAL(15,2))), 0) as total FROM consignados WHERE TRIM(supervisor) = ${nomeSup} AND mes = ${mesRef}`) as any
            : await db!.execute(sql`SELECT COALESCE(SUM(CAST(rbm AS DECIMAL(15,2))), 0) as total FROM consignados WHERE TRIM(supervisor) = ${nomeSup}`) as any;
          rbmConsig = extractSum(r);
        }

        // RBM Consórcio — campo mesAno no formato MM/AAAA
        let rbmConsorcio = 0;
        if (pctConsorcio > 0) {
          const r = mesRef
            ? await db!.execute(sql`SELECT COALESCE(SUM(CAST(rbm AS DECIMAL(15,2))), 0) as total FROM consorcios WHERE TRIM(supervisor) = ${nomeSup} AND mesAno = ${mesRef}`) as any
            : await db!.execute(sql`SELECT COALESCE(SUM(CAST(rbm AS DECIMAL(15,2))), 0) as total FROM consorcios WHERE TRIM(supervisor) = ${nomeSup}`) as any;
          rbmConsorcio = extractSum(r);
        }

        // RBM Conta Corrente — campo mesAno no formato MM/AAAA
        let rbmCc = 0;
        if (pctCc > 0) {
          const r = mesRef
            ? await db!.execute(sql`SELECT COALESCE(SUM(CAST(rbm AS DECIMAL(15,2))), 0) as total FROM contasCorrentes WHERE TRIM(supervisor) = ${nomeSup} AND mesAno = ${mesRef}`) as any
            : await db!.execute(sql`SELECT COALESCE(SUM(CAST(rbm AS DECIMAL(15,2))), 0) as total FROM contasCorrentes WHERE TRIM(supervisor) = ${nomeSup}`) as any;
          rbmCc = extractSum(r);
        }

        // Comissões calculadas — se RBM = 0, comissão = 0
        const comissaoConsig    = rbmConsig    * (pctConsig    / 100);
        const comissaoConsorcio = rbmConsorcio * (pctConsorcio / 100);
        const comissaoCc        = rbmCc        * (pctCc        / 100);
        const comissaoOurocap   = 0; // sem RBM disponível
        const comissaoSeguro    = 0; // sem RBM disponível
        const comissaoDental    = 0; // sem RBM disponível

        const total = comissaoConsig + comissaoConsorcio + comissaoCc + comissaoOurocap + comissaoSeguro + comissaoDental;

        return {
          id: Number(sup.id),
          chaveJ: sup.chaveJ ?? sup.chavej ?? "",
          nome: nomeSup,
          pctConsig, pctConsorcio, pctCc, pctOurocap, pctSeguro, pctDental,
          rbmConsig, rbmConsorcio, rbmCc,
          comissaoConsig, comissaoConsorcio, comissaoCc,
          comissaoOurocap, comissaoSeguro, comissaoDental,
          total,
        };
      }));

      return resultado;
    }),
});
