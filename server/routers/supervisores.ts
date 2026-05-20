import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

export const supervisoresRouter = router({
  listar: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.execute(sql`SELECT * FROM supervisores WHERE ativo = 1 ORDER BY nome ASC`);
    return (rows as any[]).map((r: any) => ({
      id: Number(r.id),
      chaveJ: r.chaveJ ?? "",
      nome: r.nome ?? "",
      pctConsig: parseFloat(r.pctConsig ?? 0),
      pctConsorcio: parseFloat(r.pctConsorcio ?? 0),
      pctCc: parseFloat(r.pctCc ?? 0),
      pctOurocap: parseFloat(r.pctOurocap ?? 0),
      pctSeguro: parseFloat(r.pctSeguro ?? 0),
      pctDental: parseFloat(r.pctDental ?? 0),
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
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const mesRef = input.mesRef ?? "";

      const supervisores = await db.execute(sql`SELECT * FROM supervisores WHERE ativo = 1 ORDER BY nome ASC`) as any[];
      if (!supervisores.length) return [];

      const resultado = await Promise.all(supervisores.map(async (sup: any) => {
        const nomeSup = (sup.nome ?? "").trim();

        // RBM Consignado — campo mes no consignado é no formato MMAA (ex: 426 = abr/2026)
        const consigRows = mesRef
          ? await db!.execute(sql`SELECT COALESCE(SUM(CAST(rbm AS DECIMAL(15,2))), 0) as total FROM consignados WHERE TRIM(supervisor) = ${nomeSup} AND mes = ${mesRef}`)
          : await db!.execute(sql`SELECT COALESCE(SUM(CAST(rbm AS DECIMAL(15,2))), 0) as total FROM consignados WHERE TRIM(supervisor) = ${nomeSup}`);
        const rbmConsig = parseFloat((consigRows as any[])[0]?.total ?? 0);

        // RBM Consórcio — campo mesAno no formato MM/AAAA
        const consorcioRows = mesRef
          ? await db!.execute(sql`SELECT COALESCE(SUM(CAST(rbm AS DECIMAL(15,2))), 0) as total FROM consorcios WHERE TRIM(supervisor) = ${nomeSup} AND mesAno = ${mesRef}`)
          : await db!.execute(sql`SELECT COALESCE(SUM(CAST(rbm AS DECIMAL(15,2))), 0) as total FROM consorcios WHERE TRIM(supervisor) = ${nomeSup}`);
        const rbmConsorcio = parseFloat((consorcioRows as any[])[0]?.total ?? 0);

        // RBM Conta Corrente — campo mesAno no formato MM/AAAA
        const ccRows = mesRef
          ? await db!.execute(sql`SELECT COALESCE(SUM(CAST(rbm AS DECIMAL(15,2))), 0) as total FROM contasCorrentes WHERE TRIM(supervisor) = ${nomeSup} AND mesAno = ${mesRef}`)
          : await db!.execute(sql`SELECT COALESCE(SUM(CAST(rbm AS DECIMAL(15,2))), 0) as total FROM contasCorrentes WHERE TRIM(supervisor) = ${nomeSup}`);
        const rbmCc = parseFloat((ccRows as any[])[0]?.total ?? 0);

        const pctConsig = parseFloat(sup.pctConsig ?? 0);
        const pctConsorcio = parseFloat(sup.pctConsorcio ?? 0);
        const pctCc = parseFloat(sup.pctCc ?? 0);
        const pctOurocap = parseFloat(sup.pctOurocap ?? 0);
        const pctSeguro = parseFloat(sup.pctSeguro ?? 0);
        const pctDental = parseFloat(sup.pctDental ?? 0);

        const comissaoConsig = rbmConsig * (pctConsig / 100);
        const comissaoConsorcio = rbmConsorcio * (pctConsorcio / 100);
        const comissaoCc = rbmCc * (pctCc / 100);
        const comissaoOurocap = 0;
        const comissaoSeguro = 0;
        const comissaoDental = 0;

        const total = comissaoConsig + comissaoConsorcio + comissaoCc + comissaoOurocap + comissaoSeguro + comissaoDental;

        return {
          id: Number(sup.id),
          chaveJ: sup.chaveJ ?? "",
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
