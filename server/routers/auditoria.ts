import { z } from "zod";
import { publicProcedure, router, adminProcedure } from "../_core/trpc";
import { getAuditLogs, createAuditLog, updateAuditLogSaida } from "../db";
import { getDb } from "../db";
import { auditoria, calculos, pagamentos, agentes, sessoes } from "../../drizzle/schema";
import { eq, desc, sql, and, like, gte, lte, or } from "drizzle-orm";

export const auditoriaRouter = router({
  list: publicProcedure
    .input(z.object({
      chaveJ: z.string().optional(),
      nomeAgente: z.string().optional(),
      modulo: z.string().optional(),
      acao: z.string().optional(),
      dataInicio: z.string().optional(), // DD/MM/YYYY
      dataFim: z.string().optional(),    // DD/MM/YYYY
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions: any[] = [];

      if (input.chaveJ) {
        conditions.push(like(auditoria.chaveJ, `%${input.chaveJ}%`));
      }
      if (input.nomeAgente) {
        conditions.push(like(auditoria.nomeAgente, `%${input.nomeAgente}%`));
      }
      if (input.modulo) {
        conditions.push(eq(auditoria.modulo, input.modulo));
      }
      if (input.acao) {
        conditions.push(like(auditoria.acao, `%${input.acao}%`));
      }
      if (input.dataInicio) {
        // Converter DD/MM/YYYY para YYYY-MM-DD
        const [d, m, y] = input.dataInicio.split('/');
        if (d && m && y) {
          conditions.push(gte(auditoria.horarioEntrada, new Date(`${y}-${m}-${d}T00:00:00`)));
        }
      }
      if (input.dataFim) {
        const [d, m, y] = input.dataFim.split('/');
        if (d && m && y) {
          conditions.push(lte(auditoria.horarioEntrada, new Date(`${y}-${m}-${d}T23:59:59`)));
        }
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      return await db
        .select()
        .from(auditoria)
        .where(where)
        .orderBy(desc(auditoria.horarioEntrada))
        .limit(input.limit)
        .offset(input.offset);
    }),

  count: publicProcedure
    .input(z.object({
      chaveJ: z.string().optional(),
      nomeAgente: z.string().optional(),
      modulo: z.string().optional(),
      acao: z.string().optional(),
      dataInicio: z.string().optional(),
      dataFim: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return 0;

      const conditions: any[] = [];

      if (input.chaveJ) conditions.push(like(auditoria.chaveJ, `%${input.chaveJ}%`));
      if (input.nomeAgente) conditions.push(like(auditoria.nomeAgente, `%${input.nomeAgente}%`));
      if (input.modulo) conditions.push(eq(auditoria.modulo, input.modulo));
      if (input.acao) conditions.push(like(auditoria.acao, `%${input.acao}%`));
      if (input.dataInicio) {
        const [d, m, y] = input.dataInicio.split('/');
        if (d && m && y) conditions.push(gte(auditoria.horarioEntrada, new Date(`${y}-${m}-${d}T00:00:00`)));
      }
      if (input.dataFim) {
        const [d, m, y] = input.dataFim.split('/');
        if (d && m && y) conditions.push(lte(auditoria.horarioEntrada, new Date(`${y}-${m}-${d}T23:59:59`)));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(auditoria)
        .where(where);
      return Number(result[0]?.count ?? 0);
    }),

  // Estatísticas rápidas para o painel de logs
  stats: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { totalHoje: 0, totalSemana: 0, totalMes: 0, modulosMaisAcessados: [] };

    const agora = new Date();
    const inicioDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const inicioSemana = new Date(agora);
    inicioSemana.setDate(agora.getDate() - 7);
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

    const [totalHoje, totalSemana, totalMes, modulosRows] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(auditoria).where(gte(auditoria.horarioEntrada, inicioDia)),
      db.select({ count: sql<number>`count(*)` }).from(auditoria).where(gte(auditoria.horarioEntrada, inicioSemana)),
      db.select({ count: sql<number>`count(*)` }).from(auditoria).where(gte(auditoria.horarioEntrada, inicioMes)),
      db.select({
        modulo: auditoria.modulo,
        total: sql<number>`count(*)`,
      })
        .from(auditoria)
        .where(gte(auditoria.horarioEntrada, inicioMes))
        .groupBy(auditoria.modulo)
        .orderBy(desc(sql`count(*)`))
        .limit(5),
    ]);

    return {
      totalHoje: Number(totalHoje[0]?.count ?? 0),
      totalSemana: Number(totalSemana[0]?.count ?? 0),
      totalMes: Number(totalMes[0]?.count ?? 0),
      modulosMaisAcessados: modulosRows.map(r => ({ modulo: r.modulo ?? '-', total: Number(r.total) })),
    };
  }),

  // Sessões ativas com dados do agente
  sessoesAtivas: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const rows = await db
      .select({
        id: sessoes.id,
        chaveJ: sessoes.chaveJ,
        nomeAgente: sessoes.nomeAgente,
        horarioConexao: sessoes.horarioConexao,
        ultimoAcesso: sessoes.ultimoAcesso,
        modulo: sessoes.modulo,
        ipAddress: sessoes.ipAddress,
        ativo: sessoes.ativo,
      })
      .from(sessoes)
      .where(eq(sessoes.ativo, 1))
      .orderBy(desc(sessoes.ultimoAcesso));

    return rows;
  }),

  // Desconectar sessão (CEO/Admin)
  desconectarSessao: publicProcedure
    .input(z.object({ sessaoId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return false;
      await db.update(sessoes)
        .set({ ativo: 0, motivoDesconexao: 'Desconectado pelo administrador' })
        .where(eq(sessoes.id, input.sessaoId));
      return true;
    }),

  // Listar módulos distintos para filtro
  modulos: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db
      .selectDistinct({ modulo: auditoria.modulo })
      .from(auditoria)
      .where(sql`${auditoria.modulo} IS NOT NULL AND ${auditoria.modulo} != ''`)
      .orderBy(auditoria.modulo);
    return rows.map(r => r.modulo).filter(Boolean) as string[];
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

      let calcQuery = db.select().from(calculos).$dynamic();
      if (input.mesAno) calcQuery = calcQuery.where(eq(calculos.mesRef, input.mesAno));
      if (input.chaveJ) calcQuery = calcQuery.where(eq(calculos.chaveJ, input.chaveJ));
      const calcs = await calcQuery.orderBy(desc(calculos.mesRef));

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

      const ags = await db.select({ chaveJ: agentes.chaveJ, cidade: agentes.cidade }).from(agentes);
      const cidadeMap = new Map(ags.map(a => [a.chaveJ, a.cidade]));

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

      const despNorm = new Map<string, Record<string, number>>();
      for (const p of pags) {
        const key = `${p.mesAno}|${p.chaveJ}`;
        if (!despNorm.has(key)) despNorm.set(key, {});
        const col = tipoParaColuna(p.tipoPagto || '');
        despNorm.get(key)![col] = (despNorm.get(key)![col] || 0) + (Number(p.total) || 0);
      }

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
