import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { sql, eq, and, desc, asc } from "drizzle-orm";
import {
  agentes, calculos, agenteStreak, agenteMetas, agenteConquistas, documentosAgentes
} from "../../drizzle/schema";
import { z } from "zod";

function getHojeBrasilia(): string {
  const now = new Date();
  const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return brt.toISOString().slice(0, 10);
}

function getMesAtualBrasilia(): string {
  const now = new Date();
  const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const mes = String(brt.getMonth() + 1).padStart(2, '0');
  const ano = brt.getFullYear();
  return `${mes}/${ano}`;
}

// Definição das conquistas possíveis
const CONQUISTAS_DEF = [
  { codigo: 'primeiro_acesso', titulo: 'Bem-vindo!', descricao: 'Primeiro acesso ao sistema', icone: 'star' },
  { codigo: 'streak_7', titulo: '7 dias seguidos', descricao: 'Acessou o sistema 7 dias consecutivos', icone: 'flame' },
  { codigo: 'streak_30', titulo: 'Mês completo', descricao: 'Acessou o sistema 30 dias consecutivos', icone: 'crown' },
  { codigo: 'meta_batida', titulo: 'Meta Batida!', descricao: 'Atingiu 100% da meta mensal', icone: 'trophy' },
  { codigo: 'meta_superada', titulo: 'Superou a Meta!', descricao: 'Superou 120% da meta mensal', icone: 'zap' },
  { codigo: 'top3_ranking', titulo: 'Top 3', descricao: 'Ficou entre os 3 primeiros do ranking', icone: 'medal' },
  { codigo: 'primeiro_ranking', titulo: 'Campeão do Mês', descricao: 'Ficou em 1º lugar no ranking', icone: 'award' },
];

export const engajamentoRouter = router({

  /**
   * Registra acesso do agente e atualiza streak
   * Chamado ao carregar o painel pessoal
   */
  registrarAcesso: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;

    // Obter chaveJ a partir do email do usuário logado
    let chaveJ: string | null = null;
    if (ctx.user.email && ctx.user.email.includes('@')) {
      chaveJ = ctx.user.email.split('@')[0].toUpperCase();
    } else if (ctx.user.openId && ctx.user.openId.startsWith('agente_')) {
      const agenteId = parseInt(ctx.user.openId.replace('agente_', ''), 10);
      const [ag] = await db.select({ chaveJ: agentes.chaveJ }).from(agentes).where(eq(agentes.id, agenteId)).limit(1);
      chaveJ = ag?.chaveJ ?? null;
    }
    if (!chaveJ) return null;

    const hoje = getHojeBrasilia();

    try {
      const streakResult = await db.execute(
        sql`SELECT * FROM agente_streak WHERE chave_j = ${chaveJ} LIMIT 1`
      );
      const rows = (Array.isArray(streakResult) ? streakResult[0] : streakResult) as unknown as Array<{
        streak_atual: number; maior_streak: number; ultimo_acesso: string; total_acessos: number;
      }>;

      if (!rows || rows.length === 0) {
        // Primeiro acesso
        await db.execute(
          sql`INSERT INTO agente_streak (chave_j, ultimo_acesso, streak_atual, maior_streak, total_acessos)
              VALUES (${chaveJ}, ${hoje}, 1, 1, 1)`
        );
        // Conquista: primeiro acesso
        await db.execute(
          sql`INSERT IGNORE INTO agente_conquistas (chave_j, codigo, titulo, descricao, icone)
              VALUES (${chaveJ}, 'primeiro_acesso', 'Bem-vindo!', 'Primeiro acesso ao sistema', 'star')`
        );
        return { streakAtual: 1, maiorStreak: 1, totalAcessos: 1 };
      }

      const streak = rows[0];
      const ultimoAcesso = String(streak.ultimo_acesso).slice(0, 10);

      if (ultimoAcesso === hoje) {
        // Já registrou hoje
        return {
          streakAtual: streak.streak_atual,
          maiorStreak: streak.maior_streak,
          totalAcessos: streak.total_acessos
        };
      }

      // Calcular diferença de dias
      const diffMs = new Date(hoje).getTime() - new Date(ultimoAcesso).getTime();
      const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));

      let novoStreak = diffDias === 1 ? streak.streak_atual + 1 : 1;
      const novoMaior = Math.max(novoStreak, streak.maior_streak);
      const novoTotal = streak.total_acessos + 1;

      await db.execute(
        sql`UPDATE agente_streak SET ultimo_acesso = ${hoje}, streak_atual = ${novoStreak},
            maior_streak = ${novoMaior}, total_acessos = ${novoTotal}
            WHERE chave_j = ${chaveJ}`
      );

      // Verificar conquistas de streak
      if (novoStreak >= 7) {
        await db.execute(
          sql`INSERT IGNORE INTO agente_conquistas (chave_j, codigo, titulo, descricao, icone)
              VALUES (${chaveJ}, 'streak_7', '7 dias seguidos', 'Acessou o sistema 7 dias consecutivos', 'flame')`
        );
      }
      if (novoStreak >= 30) {
        await db.execute(
          sql`INSERT IGNORE INTO agente_conquistas (chave_j, codigo, titulo, descricao, icone)
              VALUES (${chaveJ}, 'streak_30', 'Mês completo', 'Acessou o sistema 30 dias consecutivos', 'crown')`
        );
      }

      return { streakAtual: novoStreak, maiorStreak: novoMaior, totalAcessos: novoTotal };
    } catch (err) {
      console.error("[engajamento.registrarAcesso] Erro:", err);
      return null;
    }
  }),

  /**
   * Painel pessoal do agente logado
   */
  painelPessoal: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;

    // Obter chaveJ a partir do email do usuário logado
    let chaveJ: string | null = null;
    if (ctx.user.email && ctx.user.email.includes('@')) {
      chaveJ = ctx.user.email.split('@')[0].toUpperCase();
    } else if (ctx.user.openId && ctx.user.openId.startsWith('agente_')) {
      const agenteId = parseInt(ctx.user.openId.replace('agente_', ''), 10);
      const [ag] = await db.select({ chaveJ: agentes.chaveJ }).from(agentes).where(eq(agentes.id, agenteId)).limit(1);
      chaveJ = ag?.chaveJ ?? null;
    }
    if (!chaveJ) return null;

    const mesAtual = getMesAtualBrasilia();

    try {
      // Dados do agente
      const [agente] = await db.select().from(agentes).where(eq(agentes.chaveJ, chaveJ)).limit(1);

      // Produção do mês atual (da tabela calculos)
      const [producaoMes] = await db
        .select({
          comissaoTotal: sql<number>`COALESCE(SUM(comissao_total), 0)`,
          rbmTotal: sql<number>`COALESCE(SUM(rbm_total), 0)`,
          comissaoConsig: sql<number>`COALESCE(SUM(comissao_consig), 0)`,
          comissaoConsorcio: sql<number>`COALESCE(SUM(comissao_consorcio), 0)`,
          comissaoOurocap: sql<number>`COALESCE(SUM(comissao_ourocap), 0)`,
          comissaoCc: sql<number>`COALESCE(SUM(comissao_cc), 0)`,
        })
        .from(calculos)
        .where(and(eq(calculos.chaveJ, chaveJ), eq(calculos.mesRef, mesAtual)));

      // Meta do mês
      const metaResult = await db.execute(
        sql`SELECT * FROM agente_metas WHERE chave_j = ${chaveJ} AND mes_ref = ${mesAtual} LIMIT 1`
      );
      const metaRows = (Array.isArray(metaResult) ? metaResult[0] : metaResult) as unknown as Array<{
        meta_total: number; meta_consig: number; meta_consorcio: number; meta_ourocap: number; meta_cc: number;
      }>;
      const meta = metaRows?.[0] ?? null;

      // Streak
      const streakResult = await db.execute(
        sql`SELECT * FROM agente_streak WHERE chave_j = ${chaveJ} LIMIT 1`
      );
      const streakRows = (Array.isArray(streakResult) ? streakResult[0] : streakResult) as unknown as Array<{
        streak_atual: number; maior_streak: number; total_acessos: number;
      }>;
      const streak = streakRows?.[0] ?? null;

      // Conquistas
      const conquistasResult = await db.execute(
        sql`SELECT * FROM agente_conquistas WHERE chave_j = ${chaveJ} ORDER BY conquistado_em DESC`
      );
      const conquistas = (Array.isArray(conquistasResult) ? conquistasResult[0] : conquistasResult) as unknown as Array<{
        codigo: string; titulo: string; descricao: string; icone: string; conquistado_em: string;
      }>;

      // Posição no ranking do mês
      const rankingResult = await db.execute(
        sql`SELECT chave_j, SUM(comissao_total) as total
            FROM calculos WHERE mes_ref = ${mesAtual}
            GROUP BY chave_j ORDER BY total DESC`
      );
      const rankingRows = (Array.isArray(rankingResult) ? rankingResult[0] : rankingResult) as unknown as Array<{
        chave_j: string; total: number;
      }>;
      const posicaoRanking = rankingRows.findIndex(r => r.chave_j === chaveJ) + 1;
      const totalRanking = rankingRows.length;

      // Histórico dos últimos 6 meses
      const historicoResult = await db.execute(
        sql`SELECT mes_ref, SUM(comissao_total) as total
            FROM calculos WHERE chave_j = ${chaveJ}
            GROUP BY mes_ref ORDER BY mes_ref DESC LIMIT 6`
      );
      const historico = (Array.isArray(historicoResult) ? historicoResult[0] : historicoResult) as unknown as Array<{
        mes_ref: string; total: number;
      }>;

      // Documentos vencendo em 30 dias
      const hoje = getHojeBrasilia();
      const em30Dias = new Date(new Date(hoje).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const docsResult = await db.execute(
        sql`SELECT tipo_documento, data_validade FROM documentos_agentes
            WHERE chave_j = ${chaveJ} AND data_validade IS NOT NULL
            AND data_validade != '' AND data_validade <= ${em30Dias} AND data_validade >= ${hoje}
            ORDER BY data_validade ASC LIMIT 5`
      );
      const docsVencendo = (Array.isArray(docsResult) ? docsResult[0] : docsResult) as unknown as Array<{
        tipo_documento: string; data_validade: string;
      }>;

      // Verificar conquistas de ranking
      if (posicaoRanking === 1 && posicaoRanking > 0) {
        await db.execute(
          sql`INSERT IGNORE INTO agente_conquistas (chave_j, codigo, titulo, descricao, icone)
              VALUES (${chaveJ}, 'primeiro_ranking', 'Campeão do Mês', 'Ficou em 1º lugar no ranking', 'award')`
        );
      }
      if (posicaoRanking <= 3 && posicaoRanking > 0) {
        await db.execute(
          sql`INSERT IGNORE INTO agente_conquistas (chave_j, codigo, titulo, descricao, icone)
              VALUES (${chaveJ}, 'top3_ranking', 'Top 3', 'Ficou entre os 3 primeiros do ranking', 'medal')`
        );
      }

      // Verificar conquistas de meta
      const comissaoAtual = Number(producaoMes?.comissaoTotal ?? 0);
      const metaTotalVal = Number(meta?.meta_total ?? 0);
      if (metaTotalVal > 0 && comissaoAtual >= metaTotalVal) {
        await db.execute(
          sql`INSERT IGNORE INTO agente_conquistas (chave_j, codigo, titulo, descricao, icone)
              VALUES (${chaveJ}, 'meta_batida', 'Meta Batida!', 'Atingiu 100% da meta mensal', 'trophy')`
        );
      }
      if (metaTotalVal > 0 && comissaoAtual >= metaTotalVal * 1.2) {
        await db.execute(
          sql`INSERT IGNORE INTO agente_conquistas (chave_j, codigo, titulo, descricao, icone)
              VALUES (${chaveJ}, 'meta_superada', 'Superou a Meta!', 'Superou 120% da meta mensal', 'zap')`
        );
      }

      return {
        agente: agente ?? null,
        mesAtual,
        producaoMes: {
          comissaoTotal: Number(producaoMes?.comissaoTotal ?? 0),
          rbmTotal: Number(producaoMes?.rbmTotal ?? 0),
          comissaoConsig: Number(producaoMes?.comissaoConsig ?? 0),
          comissaoConsorcio: Number(producaoMes?.comissaoConsorcio ?? 0),
          comissaoOurocap: Number(producaoMes?.comissaoOurocap ?? 0),
          comissaoCc: Number(producaoMes?.comissaoCc ?? 0),
        },
        meta: meta ? {
          metaTotal: Number(meta.meta_total),
          metaConsig: Number(meta.meta_consig),
          metaConsorcio: Number(meta.meta_consorcio),
          metaOurocap: Number(meta.meta_ourocap),
          metaCc: Number(meta.meta_cc),
        } : null,
        streak: streak ? {
          streakAtual: Number(streak.streak_atual),
          maiorStreak: Number(streak.maior_streak),
          totalAcessos: Number(streak.total_acessos),
        } : null,
        conquistas: conquistas ?? [],
        ranking: { posicao: posicaoRanking, total: totalRanking },
        historico: historico ?? [],
        docsVencendo: docsVencendo ?? [],
      };
    } catch (err) {
      console.error("[engajamento.painelPessoal] Erro:", err);
      return null;
    }
  }),

  /**
   * Ranking do mês atual (top 20)
   */
  rankingMes: protectedProcedure.input(z.object({ mesRef: z.string().optional() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];

    const mesRef = input.mesRef || getMesAtualBrasilia();

    try {
      const result = await db.execute(
        sql`SELECT c.chave_j, c.nome_agente, c.empresa, c.cidade,
                   SUM(c.comissao_total) as comissao_total,
                   SUM(c.rbm_total) as rbm_total,
                   a.nivel
            FROM calculos c
            LEFT JOIN agentes a ON a.chave_j = c.chave_j
            WHERE c.mes_ref = ${mesRef}
            GROUP BY c.chave_j, c.nome_agente, c.empresa, c.cidade, a.nivel
            ORDER BY comissao_total DESC
            LIMIT 20`
      );
      const rows = (Array.isArray(result) ? result[0] : result) as unknown as Array<{
        chave_j: string; nome_agente: string; empresa: string; cidade: string;
        comissao_total: number; rbm_total: number; nivel: string;
      }>;
      return (rows ?? []).map((r, i) => ({
        posicao: i + 1,
        chaveJ: r.chave_j,
        nomeAgente: r.nome_agente,
        empresa: r.empresa,
        cidade: r.cidade,
        comissaoTotal: Number(r.comissao_total),
        rbmTotal: Number(r.rbm_total),
        nivel: r.nivel,
        isMe: r.chave_j === (ctx.user.email?.includes('@') ? ctx.user.email.split('@')[0].toUpperCase() : ''),
      }));
    } catch (err) {
      console.error("[engajamento.rankingMes] Erro:", err);
      return [];
    }
  }),

  /**
   * Salvar/atualizar meta do agente para o mês
   */
  salvarMeta: protectedProcedure.input(z.object({
    mesRef: z.string(),
    metaTotal: z.number(),
    metaConsig: z.number().optional().default(0),
    metaConsorcio: z.number().optional().default(0),
    metaOurocap: z.number().optional().default(0),
    metaCc: z.number().optional().default(0),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return false;

    // Obter chaveJ a partir do email do usuário logado
    let chaveJ: string | null = null;
    if (ctx.user.email && ctx.user.email.includes('@')) {
      chaveJ = ctx.user.email.split('@')[0].toUpperCase();
    } else if (ctx.user.openId && ctx.user.openId.startsWith('agente_')) {
      const agenteId = parseInt(ctx.user.openId.replace('agente_', ''), 10);
      const [ag] = await db.select({ chaveJ: agentes.chaveJ }).from(agentes).where(eq(agentes.id, agenteId)).limit(1);
      chaveJ = ag?.chaveJ ?? null;
    }
    if (!chaveJ) return false;

    try {
      await db.execute(
        sql`INSERT INTO agente_metas (chave_j, mes_ref, meta_total, meta_consig, meta_consorcio, meta_ourocap, meta_cc)
            VALUES (${chaveJ}, ${input.mesRef}, ${input.metaTotal}, ${input.metaConsig}, ${input.metaConsorcio}, ${input.metaOurocap}, ${input.metaCc})
            ON DUPLICATE KEY UPDATE
              meta_total = ${input.metaTotal},
              meta_consig = ${input.metaConsig},
              meta_consorcio = ${input.metaConsorcio},
              meta_ourocap = ${input.metaOurocap},
              meta_cc = ${input.metaCc}`
      );
      return true;
    } catch (err) {
      console.error("[engajamento.salvarMeta] Erro:", err);
      return false;
    }
  }),

  /**
   * Meses disponíveis para filtro do ranking
   */
  mesesDisponiveis: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    try {
      const result = await db.execute(
        sql`SELECT DISTINCT mes_ref FROM calculos WHERE mes_ref IS NOT NULL ORDER BY mes_ref DESC LIMIT 12`
      );
      const rows = (Array.isArray(result) ? result[0] : result) as unknown as Array<{ mes_ref: string }>;
      return (rows ?? []).map(r => r.mes_ref);
    } catch {
      return [];
    }
  }),
});
