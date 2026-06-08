import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

// Helper: normaliza retorno de db.execute (TiDB retorna [rows, fields])
function getRows(res: any): any[] {
  const data = Array.isArray(res) ? res[0] : res;
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === "object") return [data];
  return [];
}

// Helper: extrai valor numérico de uma query SUM
function extractSum(res: any): number {
  const rows = getRows(res);
  if (!rows.length) return 0;
  const val = rows[0]?.total ?? rows[0]?.TOTAL ?? 0;
  return parseFloat(String(val)) || 0;
}

export const supervisoresRouter = router({
  // Listar supervisores cadastrados
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
      pctConsig:    parseFloat(r.pctConsig    ?? r.pctconsig    ?? 0),
      pctConsorcio: parseFloat(r.pctConsorcio ?? r.pctconsorcio ?? 0),
      pctCc:        parseFloat(r.pctCc        ?? r.pctcc        ?? 0),
      pctOurocap:   parseFloat(r.pctOurocap   ?? r.pctourocap   ?? 0),
      pctSeguro:    parseFloat(r.pctSeguro    ?? r.pctseguro    ?? 0),
      pctDental:    parseFloat(r.pctDental    ?? r.pctdental    ?? 0),
    }));
  }),

  // Criar supervisor
  criar: protectedProcedure
    .input(z.object({
      chaveJ:       z.string().min(1),
      nome:         z.string().min(1),
      pctConsig:    z.number().default(0),
      pctConsorcio: z.number().default(0),
      pctCc:        z.number().default(0),
      pctOurocap:   z.number().default(0),
      pctSeguro:    z.number().default(0),
      pctDental:    z.number().default(0),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { ok: false };
      const now = Date.now();
      await db.execute(sql`
        INSERT INTO supervisores (chaveJ, nome, pctConsig, pctConsorcio, pctCc, pctOurocap, pctSeguro, pctDental, ativo, createdAt, updatedAt)
        VALUES (${input.chaveJ}, ${input.nome}, ${input.pctConsig}, ${input.pctConsorcio}, ${input.pctCc}, ${input.pctOurocap}, ${input.pctSeguro}, ${input.pctDental}, 1, ${now}, ${now})
      `);
      return { ok: true };
    }),

  // Editar supervisor
  editar: protectedProcedure
    .input(z.object({
      id:           z.number(),
      chaveJ:       z.string().min(1),
      nome:         z.string().min(1),
      pctConsig:    z.number().default(0),
      pctConsorcio: z.number().default(0),
      pctCc:        z.number().default(0),
      pctOurocap:   z.number().default(0),
      pctSeguro:    z.number().default(0),
      pctDental:    z.number().default(0),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { ok: false };
      await db.execute(sql`
        UPDATE supervisores
        SET chaveJ=${input.chaveJ}, nome=${input.nome},
            pctConsig=${input.pctConsig}, pctConsorcio=${input.pctConsorcio},
            pctCc=${input.pctCc}, pctOurocap=${input.pctOurocap},
            pctSeguro=${input.pctSeguro}, pctDental=${input.pctDental},
            updatedAt=${Date.now()}
        WHERE id=${input.id}
      `);
      return { ok: true };
    }),

  // Excluir supervisor (soft delete)
  excluir: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { ok: false };
      await db.execute(sql`UPDATE supervisores SET ativo=0 WHERE id=${input.id}`);
      return { ok: true };
    }),

  // Calcular comissões do supervisor
  // mesRef: formato MM/AAAA (ex: "04/2026") ou vazio para todos os meses
  // O JOIN usa UPPER(s.nome) LIKE CONCAT('%', UPPER(a.supervisor), '%')
  // para bater "LUANA ANDRADE FARIAS" com "LUANA"
  calcular: protectedProcedure
    .input(z.object({ mesRef: z.string().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      // mesRef já vem no formato MM/AAAA do frontend
      const mesRef = (input.mesRef ?? "").trim();

      // Buscar supervisores ativos
      const supRes = await db.execute(sql`
        SELECT id, chaveJ, nome, pctConsig, pctConsorcio, pctCc, pctOurocap, pctSeguro, pctDental
        FROM supervisores WHERE ativo = 1 ORDER BY nome ASC
      `) as any;
      const supRows = getRows(supRes);
      if (!supRows.length) return [];

      const resultado = await Promise.all(supRows.map(async (sup: any) => {
        const nomeSup     = (sup.nome ?? "").trim();
        const pctConsig    = parseFloat(sup.pctConsig    ?? sup.pctconsig    ?? 0);
        const pctConsorcio = parseFloat(sup.pctConsorcio ?? sup.pctconsorcio ?? 0);
        const pctCc        = parseFloat(sup.pctCc        ?? sup.pctcc        ?? 0);
        const pctOurocap   = parseFloat(sup.pctOurocap   ?? sup.pctourocap   ?? 0);
        const pctSeguro    = parseFloat(sup.pctSeguro    ?? sup.pctseguro    ?? 0);
        const pctDental    = parseFloat(sup.pctDental    ?? sup.pctdental    ?? 0);

        // RBM Consignado — soma do campo rbm da tabela consignados dos agentes supervisionados
        // Cada operação de consignado tem um RBM específico; a supervisora ganha % sobre cada RBM
        let rbmConsig = 0;
        {
          const r = mesRef
            ? await db!.execute(sql`
                SELECT COALESCE(SUM(cs.rbm), 0) as total
                FROM consignados cs
                JOIN agentes a ON cs.chaveJ = a.chaveJ
                WHERE UPPER(${nomeSup}) LIKE CONCAT('%', UPPER(TRIM(a.supervisor)), '%')
                  AND TRIM(a.supervisor) != ''
                  AND cs.mes = ${mesRef}
              `) as any
            : await db!.execute(sql`
                SELECT COALESCE(SUM(cs.rbm), 0) as total
                FROM consignados cs
                JOIN agentes a ON cs.chaveJ = a.chaveJ
                WHERE UPPER(${nomeSup}) LIKE CONCAT('%', UPPER(TRIM(a.supervisor)), '%')
                  AND TRIM(a.supervisor) != ''
              `) as any;
          rbmConsig = extractSum(r);
        }

        // RBM Consórcio — busca em calculos (rbmConsorcioC2)
        let rbmConsorcio = 0;
        {
          const r = mesRef
            ? await db!.execute(sql`
                SELECT COALESCE(SUM(c.rbmConsorcioC2), 0) as total
                FROM calculos c
                JOIN agentes a ON c.chaveJ = a.chaveJ
                WHERE UPPER(${nomeSup}) LIKE CONCAT('%', UPPER(TRIM(a.supervisor)), '%')
                  AND TRIM(a.supervisor) != ''
                  AND c.mesRef = ${mesRef}
              `) as any
            : await db!.execute(sql`
                SELECT COALESCE(SUM(c.rbmConsorcioC2), 0) as total
                FROM calculos c
                JOIN agentes a ON c.chaveJ = a.chaveJ
                WHERE UPPER(${nomeSup}) LIKE CONCAT('%', UPPER(TRIM(a.supervisor)), '%')
                  AND TRIM(a.supervisor) != ''
              `) as any;
          rbmConsorcio = extractSum(r);
        }

        // RBM Conta Corrente — busca em calculos (rbmContaCorrente)
        let rbmCc = 0;
        {
          const r = mesRef
            ? await db!.execute(sql`
                SELECT COALESCE(SUM(c.rbmContaCorrente), 0) as total
                FROM calculos c
                JOIN agentes a ON c.chaveJ = a.chaveJ
                WHERE UPPER(${nomeSup}) LIKE CONCAT('%', UPPER(TRIM(a.supervisor)), '%')
                  AND TRIM(a.supervisor) != ''
                  AND c.mesRef = ${mesRef}
              `) as any
            : await db!.execute(sql`
                SELECT COALESCE(SUM(c.rbmContaCorrente), 0) as total
                FROM calculos c
                JOIN agentes a ON c.chaveJ = a.chaveJ
                WHERE UPPER(${nomeSup}) LIKE CONCAT('%', UPPER(TRIM(a.supervisor)), '%')
                  AND TRIM(a.supervisor) != ''
              `) as any;
          rbmCc = extractSum(r);
        }

        // RBM Ourocap — busca em calculos (rbmOurocap)
        let rbmOurocap = 0;
        {
          const r = mesRef
            ? await db!.execute(sql`
                SELECT COALESCE(SUM(c.rbmOurocap), 0) as total
                FROM calculos c
                JOIN agentes a ON c.chaveJ = a.chaveJ
                WHERE UPPER(${nomeSup}) LIKE CONCAT('%', UPPER(TRIM(a.supervisor)), '%')
                  AND TRIM(a.supervisor) != ''
                  AND c.mesRef = ${mesRef}
              `) as any
            : await db!.execute(sql`
                SELECT COALESCE(SUM(c.rbmOurocap), 0) as total
                FROM calculos c
                JOIN agentes a ON c.chaveJ = a.chaveJ
                WHERE UPPER(${nomeSup}) LIKE CONCAT('%', UPPER(TRIM(a.supervisor)), '%')
                  AND TRIM(a.supervisor) != ''
              `) as any;
          rbmOurocap = extractSum(r);
        }

        // RBM Seguros — busca em calculos (rbmSeguros)
        let rbmSeguros = 0;
        {
          const r = mesRef
            ? await db!.execute(sql`
                SELECT COALESCE(SUM(c.rbmSeguros), 0) as total
                FROM calculos c
                JOIN agentes a ON c.chaveJ = a.chaveJ
                WHERE UPPER(${nomeSup}) LIKE CONCAT('%', UPPER(TRIM(a.supervisor)), '%')
                  AND TRIM(a.supervisor) != ''
                  AND c.mesRef = ${mesRef}
              `) as any
            : await db!.execute(sql`
                SELECT COALESCE(SUM(c.rbmSeguros), 0) as total
                FROM calculos c
                JOIN agentes a ON c.chaveJ = a.chaveJ
                WHERE UPPER(${nomeSup}) LIKE CONCAT('%', UPPER(TRIM(a.supervisor)), '%')
                  AND TRIM(a.supervisor) != ''
              `) as any;
          rbmSeguros = extractSum(r);
        }

        // Calcular comissões
        const comissaoConsig    = Math.round(rbmConsig    * pctConsig    / 100 * 100) / 100;
        const comissaoConsorcio = Math.round(rbmConsorcio * pctConsorcio / 100 * 100) / 100;
        const comissaoCc        = Math.round(rbmCc        * pctCc        / 100 * 100) / 100;
        const comissaoOurocap   = Math.round(rbmOurocap   * pctOurocap   / 100 * 100) / 100;
        const comissaoSeguros   = Math.round(rbmSeguros   * pctSeguro    / 100 * 100) / 100;
        const total = comissaoConsig + comissaoConsorcio + comissaoCc + comissaoOurocap + comissaoSeguros;

        return {
          id: Number(sup.id),
          chaveJ: sup.chaveJ ?? sup.chavej ?? "",
          nome: nomeSup,
          pctConsig, pctConsorcio, pctCc, pctOurocap, pctSeguro, pctDental,
          rbmConsig, rbmConsorcio, rbmCc, rbmOurocap, rbmSeguros,
          comissaoConsig, comissaoConsorcio, comissaoCc, comissaoOurocap, comissaoSeguros,
          total,
        };
      }));

      return resultado;
    }),
});
