import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

// Helper: normaliza retorno de db.execute (Drizzle retorna [rows, fields] ou rows direto)
function getRows(res: any): any[] {
  const data = Array.isArray(res) ? res[0] : res;
  return Array.isArray(data) ? data : [];
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
    `);
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

  // Calcula comissão do supervisor por mês baseado no RBM dos agentes vinculados pelo campo supervisor
  calcular: protectedProcedure
    .input(z.object({ mesRef: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const mesRef = input.mesRef ?? "";

      const supRes = await db.execute(sql`
        SELECT id, chaveJ, nome, pctConsig, pctConsorcio, pctCc, pctOurocap, pctSeguro, pctDental
        FROM supervisores WHERE ativo = 1 ORDER BY nome ASC
      `);
      const supRows = getRows(supRes);
      if (!supRows.length) return [];

      const resultado = await Promise.all(supRows.map(async (sup: any) => {
        const nomeSup = (sup.nome ?? "").trim();

        // RBM Consignado — campo mes no consignado é no formato MMAA (ex: 426 = abr/2026)
        const consigRes = mesRef
          ? await db!.execute(sql`SELECT COALESCE(SUM(CAST(rbm AS DECIMAL(15,2))), 0) as total FROM consignados WHERE TRIM(supervisor) = ${nomeSup} AND mes = ${mesRef}`)
          : await db!.execute(sql`SELECT COALESCE(SUM(CAST(rbm AS DECIMAL(15,2))), 0) as total FROM consignados WHERE TRIM(supervisor) = ${nomeSup}`);
        const consigData = getRows(consigRes);
        const rbmConsig = parseFloat(consigData[0]?.total ?? 0);

        // RBM Consórcio — campo mesAno no formato MM/AAAA
        const consorcioRes = mesRef
          ? await db!.execute(sql`SELECT COALESCE(SUM(CAST(rbm AS DECIMAL(15,2))), 0) as total FROM consorcios WHERE TRIM(supervisor) = ${nomeSup} AND mesAno = ${mesRef}`)
          : await db!.execute(sql`SELECT COALESCE(SUM(CAST(rbm AS DECIMAL(15,2))), 0) as total FROM consorcios WHERE TRIM(supervisor) = ${nomeSup}`);
        const consorcioData = getRows(consorcioRes);
        const rbmConsorcio = parseFloat(consorcioData[0]?.total ?? 0);

        // RBM Conta Corrente — campo mesAno no formato MM/AAAA
        const ccRes = mesRef
          ? await db!.execute(sql`SELECT COALESCE(SUM(CAST(rbm AS DECIMAL(15,2))), 0) as total FROM contasCorrentes WHERE TRIM(supervisor) = ${nomeSup} AND mesAno = ${mesRef}`)
          : await db!.execute(sql`SELECT COALESCE(SUM(CAST(rbm AS DECIMAL(15,2))), 0) as total FROM contasCorrentes WHERE TRIM(supervisor) = ${nomeSup}`);
        const ccData = getRows(ccRes);
        const rbmCc = parseFloat(ccData[0]?.total ?? 0);

        const pctConsig = parseFloat(sup.pctConsig ?? sup.pctconsig ?? 0);
        const pctConsorcio = parseFloat(sup.pctConsorcio ?? sup.pctconsorcio ?? 0);
        const pctCc = parseFloat(sup.pctCc ?? sup.pctcc ?? 0);
        const pctOurocap = parseFloat(sup.pctOurocap ?? sup.pctourocap ?? 0);
        const pctSeguro = parseFloat(sup.pctSeguro ?? sup.pctseguro ?? 0);
        const pctDental = parseFloat(sup.pctDental ?? sup.pctdental ?? 0);

        const comissaoConsig = rbmConsig * (pctConsig / 100);
        const comissaoConsorcio = rbmConsorcio * (pctConsorcio / 100);
        const comissaoCc = rbmCc * (pctCc / 100);
        const comissaoOurocap = 0;
        const comissaoSeguro = 0;
        const comissaoDental = 0;

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
