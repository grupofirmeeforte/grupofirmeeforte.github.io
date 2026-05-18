import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getAuditLogs, createAuditLog, updateAuditLogSaida } from "../db";
import { getDb } from "../db";
import { auditoria, calculos, pagamentos, agentes } from "../../drizzle/schema";
import { eq, desc, sql } from "drizzle-orm";

export const auditoriaRouter = router({
  list: publicProcedure
    .input(z.object({
      chaveJ: z.string().optional(),
      modulo: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      let query: any = db.select().from(auditoria);

      if (input.chaveJ) {
        query = query.where(eq(auditoria.chaveJ, input.chaveJ));
      }
      if (input.modulo) {
        query = query.where(eq(auditoria.modulo, input.modulo));
      }

      return await query
        .orderBy(desc(auditoria.horarioEntrada))
        .limit(input.limit)
        .offset(input.offset);
    }),

  count: publicProcedure
    .input(z.object({
      chaveJ: z.string().optional(),
      modulo: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return 0;

      let query: any = db.select({ count: auditoria.id }).from(auditoria);

      if (input.chaveJ) {
        query = query.where(eq(auditoria.chaveJ, input.chaveJ));
      }
      if (input.modulo) {
        query = query.where(eq(auditoria.modulo, input.modulo));
      }

      const result = await query;
      return result.length;
    }),

  create: publicProcedure
    .input(z.object({
      agenteId: z.number(),
      chaveJ: z.string(),
      nomeAgente: z.string(),
      numeroEntrada: z.string(),
      modulo: z.string().optional(),
      acao: z.string().optional(),
      descricao: z.string().optional(),
      tabela: z.string().optional(),
      registroId: z.number().optional(),
      valorAnterior: z.string().optional(),
      valorNovo: z.string().optional(),
      ipAddress: z.string().optional(),
      userAgent: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return await createAuditLog(input);
    }),

  updateSaida: publicProcedure
    .input(z.object({
      numeroEntrada: z.string(),
    }))
    .mutation(async ({ input }) => {
      return await updateAuditLogSaida(input.numeroEntrada);
    }),

  // ── CRÉDITO x DESPESAS ──────────────────────────────────────────────────────
  creditoDespesas: publicProcedure
    .input(z.object({
      mesAno: z.string().optional(),
      chaveJ: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      // Buscar cálculos (créditos / RBM)
      let calcQuery = db.select().from(calculos).$dynamic();
      if (input.mesAno) calcQuery = calcQuery.where(eq(calculos.mesRef, input.mesAno));
      if (input.chaveJ) calcQuery = calcQuery.where(eq(calculos.chaveJ, input.chaveJ));
      const calcs = await calcQuery.orderBy(desc(calculos.mesRef));

      // Buscar pagamentos (despesas) agrupados por mesAno + chaveJ + tipoPagto
      let pagQuery = db
        .select({
          mesAno: pagamentos.mesAno,
          chaveJ: pagamentos.chaveJ,
          tipoPagto: pagamentos.tipoPagto,
          total: sql<number>`SUM(CAST(${pagamentos.valor} AS DECIMAL(15,2)))`,
        })
        .from(pagamentos)
        .groupBy(pagamentos.mesAno, pagamentos.chaveJ, pagamentos.tipoPagto)
        .$dynamic();
      if (input.mesAno) pagQuery = pagQuery.where(eq(pagamentos.mesAno, input.mesAno));
      if (input.chaveJ) pagQuery = pagQuery.where(eq(pagamentos.chaveJ, input.chaveJ));
      const pags = await pagQuery;

      // Buscar agentes para cidade
      const ags = await db.select({ chaveJ: agentes.chaveJ, cidade: agentes.cidade }).from(agentes);
      const cidadeMap = new Map(ags.map(a => [a.chaveJ, a.cidade]));

      // Normalizar tipo de pagamento para coluna
      const tipoParaColuna = (tipo: string): string => {
        const t = tipo.toLowerCase().trim();
        if (t.includes('aluguel')) return 'aluguel';
        if (t.includes('internet')) return 'internet';
        if (t.includes('energia') || t.includes('luz')) return 'energia';
        if (t.includes('agua') || t.includes('água')) return 'agua';
        if (t.includes('propaganda') || t.includes('marketing')) return 'propaganda';
        if (t.includes('loja') || t.includes('despesa loja') || t.includes('despesas loja')) return 'despesasLoja';
        if (t.includes('reembolso')) return 'reembolso';
        if (t.includes('reajuste')) return 'reajuste';
        if (t.includes('bancaria') || t.includes('bancária') || t.includes('banco') || t.includes('tarifa')) return 'despesaBancaria';
        return 'outros';
      };

      // Consolidar despesas normalizadas por mesAno|chaveJ
      const despNorm = new Map<string, Record<string, number>>();
      for (const p of pags) {
        const key = `${p.mesAno}|${p.chaveJ}`;
        if (!despNorm.has(key)) despNorm.set(key, {});
        const col = tipoParaColuna(p.tipoPagto || '');
        despNorm.get(key)![col] = (despNorm.get(key)![col] || 0) + (Number(p.total) || 0);
      }

      // Montar resultado final
      return calcs.map(c => {
        const key = `${c.mesRef}|${c.chaveJ}`;
        const desp = despNorm.get(key) || {};
        const aluguel = desp['aluguel'] || 0;
        const internet = desp['internet'] || 0;
        const energia = desp['energia'] || 0;
        const agua = desp['agua'] || 0;
        const propaganda = desp['propaganda'] || 0;
        const despesasLoja = desp['despesasLoja'] || 0;
        const reembolso = desp['reembolso'] || 0;
        const reajuste = desp['reajuste'] || 0;
        const despesaBancaria = desp['despesaBancaria'] || 0;
        const outros = desp['outros'] || 0;
        const totalDespesas = aluguel + internet + energia + agua + propaganda + despesasLoja + reembolso + reajuste + despesaBancaria + outros;
        const rbmTotal = Number(c.rbmTotal) || 0;
        const comissao = Number(c.comissaoTotal) || 0;
        const ajudaCusto = Number(c.ajudaCusto) || 0;
        const creditos = Number(c.creditosDebitos) || 0;
        const totalCreditos = comissao + ajudaCusto + creditos;
        return {
          mesAno: c.mesRef || '',
          chaveJ: c.chaveJ || '',
          empresa: c.empresa || '',
          agente: c.nomeAgente || '',
          cidade: cidadeMap.get(c.chaveJ || '') || c.cidade || '',
          rbmTotal,
          comissao,
          ajudaCusto,
          creditos,
          aluguel,
          internet,
          energia,
          agua,
          propaganda,
          despesasLoja,
          reembolso,
          reajuste,
          despesaBancaria,
          outros,
          totalDespesas,
          totalCreditos,
          saldo: totalCreditos - totalDespesas,
          rbmTotal2: rbmTotal,
          rbmCredito: Number(c.rbmCreditoC2) || 0,
          rbmCC: Number(c.rbmContaCorrente) || 0,
          rbmConsorcio: Number(c.rbmConsorcioC2) || 0,
          rbmOurocap: Number(c.rbmOurocap) || 0,
          rbmSeguros: Number(c.rbmSeguros) || 0,
        };
      });
    }),

  // Meses disponíveis para filtro
  creditoDespesasMeses: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db
      .selectDistinct({ mesRef: calculos.mesRef })
      .from(calculos)
      .orderBy(desc(calculos.mesRef));
    return rows.map(r => r.mesRef || '').filter(Boolean);
  }),
});
