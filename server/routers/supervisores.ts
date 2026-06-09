import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { sql, eq, and } from "drizzle-orm";
import { pagamentos, agentes } from "../../drizzle/schema";

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

        // Fórmula: RBM de cada produto (da tabela calculos) × % do supervisor
        // Ex: RBM Consig 20.000 × 4% = 800,00 | RBM Consórcio 5.000 × 1% = 50,00 | etc.
        // Busca RBM de cada produto dos agentes supervisionados na tabela calculos
        let rbmConsig = 0, rbmConsorcio = 0, rbmCc = 0, rbmOurocap = 0, rbmSeguros = 0;
        {
          const r = mesRef
            ? await db!.execute(sql`
                SELECT
                  COALESCE(SUM(c.rbmTotal), 0)          as totalConsig,
                  COALESCE(SUM(c.rbmConsorcioC2), 0)    as totalConsorcio,
                  COALESCE(SUM(c.rbmContaCorrente), 0)  as totalCc,
                  COALESCE(SUM(c.rbmOurocap), 0)        as totalOurocap,
                  COALESCE(SUM(c.rbmSeguros), 0)        as totalSeguros
                FROM calculos c
                JOIN agentes a ON c.chaveJ = a.chaveJ
                WHERE UPPER(${nomeSup}) LIKE CONCAT('%', UPPER(TRIM(a.supervisor)), '%')
                  AND TRIM(a.supervisor) != ''
                  AND c.mesRef = ${mesRef}
              `) as any
            : await db!.execute(sql`
                SELECT
                  COALESCE(SUM(c.rbmTotal), 0)          as totalConsig,
                  COALESCE(SUM(c.rbmConsorcioC2), 0)    as totalConsorcio,
                  COALESCE(SUM(c.rbmContaCorrente), 0)  as totalCc,
                  COALESCE(SUM(c.rbmOurocap), 0)        as totalOurocap,
                  COALESCE(SUM(c.rbmSeguros), 0)        as totalSeguros
                FROM calculos c
                JOIN agentes a ON c.chaveJ = a.chaveJ
                WHERE UPPER(${nomeSup}) LIKE CONCAT('%', UPPER(TRIM(a.supervisor)), '%')
                  AND TRIM(a.supervisor) != ''
              `) as any;
          const rows = getRows(r);
          if (rows.length) {
            rbmConsig    = parseFloat(String(rows[0].totalConsig    ?? rows[0].totalconsig    ?? 0)) || 0;
            rbmConsorcio = parseFloat(String(rows[0].totalConsorcio ?? rows[0].totalconsorcio ?? 0)) || 0;
            rbmCc        = parseFloat(String(rows[0].totalCc        ?? rows[0].totalcc        ?? 0)) || 0;
            rbmOurocap   = parseFloat(String(rows[0].totalOurocap   ?? rows[0].totalourocap   ?? 0)) || 0;
            rbmSeguros   = parseFloat(String(rows[0].totalSeguros   ?? rows[0].totalseguros   ?? 0)) || 0;
          }
        }

        // Comissão do supervisor = RBM de cada produto × % supervisor
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

  // Enviar comissões dos supervisores para a tabela pagamentos
  enviarParaPagto: publicProcedure
    .input(z.object({
      mesRef: z.string(),
      dtPagto: z.string(),
      supervisores: z.array(z.object({
        chaveJ: z.string(),
        nome: z.string(),
        total: z.number(),
      })),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB indisponível');

      let inseridos = 0;
      let atualizados = 0;

      for (const sup of input.supervisores) {
        if (sup.total <= 0) continue;

        // Buscar dados bancários do agente
        const [agente] = await db.select({
          favorecido: agentes.favorecido,
          banco: agentes.banco,
          agencia: agentes.agencia,
          conta: agentes.conta,
          cpfCnpj: agentes.cpfAgente,
          tipoConta: agentes.tipo,
          pix: agentes.pix,
          empresa: agentes.empresa,
        }).from(agentes).where(eq(agentes.chaveJ, sup.chaveJ)).limit(1);

        // Verificar se já existe lançamento para este supervisor no mês
        const existentes = await db.select({ id: pagamentos.id })
          .from(pagamentos)
          .where(and(
            eq(pagamentos.chaveJ, sup.chaveJ),
            eq(pagamentos.mesAno, input.mesRef),
            eq(pagamentos.tipoPagto, 'Comissão Supervisor')
          ))
          .limit(1);

        const valores = {
          mesAno: input.mesRef,
          tipoPagto: 'Comissão Supervisor',
          chaveJ: sup.chaveJ,
          nomeFavorecido: agente?.favorecido || sup.nome,
          banco: agente?.banco || null,
          agencia: agente?.agencia || null,
          conta: agente?.conta || null,
          cpfCnpj: agente?.cpfCnpj || null,
          tipoConta: agente?.tipoConta || null,
          pix: agente?.pix || null,
          empresa: agente?.empresa || null,
          valor: String(sup.total),
          dataPagto: input.dtPagto,
          dataVencer: input.dtPagto,
          origem: 'sistema',
          pago: false,
        };

        if (existentes.length > 0) {
          await db.update(pagamentos)
            .set(valores as any)
            .where(eq(pagamentos.id, existentes[0].id));
          atualizados++;
        } else {
          await db.insert(pagamentos).values(valores as any);
          inseridos++;
        }
      }

      return { inseridos, atualizados, total: inseridos + atualizados };
    }),
});
