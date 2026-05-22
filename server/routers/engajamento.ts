import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { sql, eq, and, desc, isNotNull } from "drizzle-orm";
import {
  agentes, calculos, agenteStreak, agenteMetas, agenteConquistas
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

async function getChaveJFromCtx(ctx: { user: { email?: string | null; openId?: string | null } }, db: Awaited<ReturnType<typeof getDb>>): Promise<string | null> {
  if (!db) return null;
  if (ctx.user.openId && ctx.user.openId.startsWith('agente_')) {
    const agenteId = parseInt(ctx.user.openId.replace('agente_', ''), 10);
    const [ag] = await db.select({ chaveJ: agentes.chaveJ }).from(agentes).where(eq(agentes.id, agenteId)).limit(1);
    return ag?.chaveJ ?? null;
  }
  if (ctx.user.email && ctx.user.email.includes('@')) {
    return ctx.user.email.split('@')[0].toUpperCase();
  }
  return null;
}

async function inserirConquista(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, chaveJ: string, codigo: string, titulo: string, descricao: string, icone: string) {
  try {
    const [existente] = await db.select({ id: agenteConquistas.id })
      .from(agenteConquistas)
      .where(and(eq(agenteConquistas.chaveJ, chaveJ), eq(agenteConquistas.codigo, codigo)))
      .limit(1);
    if (!existente) {
      await db.insert(agenteConquistas).values({ chaveJ, codigo, titulo, descricao, icone });
    }
  } catch { /* ignorar */ }
}

export const engajamentoRouter = router({
  registrarAcesso: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;
    const chaveJ = await getChaveJFromCtx(ctx, db);
    if (!chaveJ) return null;
    const hoje = getHojeBrasilia();
    try {
      const [streakRow] = await db.select().from(agenteStreak).where(eq(agenteStreak.chaveJ, chaveJ)).limit(1);
      if (!streakRow) {
        await db.insert(agenteStreak).values({ chaveJ, ultimoAcesso: new Date(hoje), streakAtual: 1, maiorStreak: 1, totalAcessos: 1 });
        await inserirConquista(db, chaveJ, 'primeiro_acesso', 'Bem-vindo!', 'Primeiro acesso ao sistema', 'star');
        return { streakAtual: 1, maiorStreak: 1, totalAcessos: 1 };
      }
      const ultimoAcesso = String(streakRow.ultimoAcesso).slice(0, 10);
      if (ultimoAcesso === hoje) {
        return { streakAtual: streakRow.streakAtual, maiorStreak: streakRow.maiorStreak, totalAcessos: streakRow.totalAcessos };
      }
      const diffMs = new Date(hoje).getTime() - new Date(ultimoAcesso).getTime();
      const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));
      const novoStreak = diffDias === 1 ? streakRow.streakAtual + 1 : 1;
      const novoMaior = Math.max(novoStreak, streakRow.maiorStreak);
      const novoTotal = streakRow.totalAcessos + 1;
      await db.update(agenteStreak)
        .set({ ultimoAcesso: new Date(hoje), streakAtual: novoStreak, maiorStreak: novoMaior, totalAcessos: novoTotal })
        .where(eq(agenteStreak.chaveJ, chaveJ));
      if (novoStreak >= 7) await inserirConquista(db, chaveJ, 'streak_7', '7 dias seguidos', 'Acessou o sistema 7 dias consecutivos', 'flame');
      if (novoStreak >= 30) await inserirConquista(db, chaveJ, 'streak_30', 'Mês completo', 'Acessou o sistema 30 dias consecutivos', 'crown');
      return { streakAtual: novoStreak, maiorStreak: novoMaior, totalAcessos: novoTotal };
    } catch (err) {
      console.error("[engajamento.registrarAcesso] Erro:", err);
      return null;
    }
  }),

  painelPessoal: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;
    const chaveJ = await getChaveJFromCtx(ctx, db);
    if (!chaveJ) return null;
    const mesAtual = getMesAtualBrasilia();
    try {
      const [agente] = await db.select().from(agentes).where(eq(agentes.chaveJ, chaveJ)).limit(1);

      const [producaoMes] = await db
        .select({
          comissaoTotal: sql<number>`COALESCE(SUM(${calculos.comissaoTotal}), 0)`,
          rbmTotal: sql<number>`COALESCE(SUM(${calculos.rbmTotal}), 0)`,
          comissaoConsig: sql<number>`COALESCE(SUM(${calculos.comissaoConsig}), 0)`,
          comissaoConsorcio: sql<number>`COALESCE(SUM(${calculos.comissaoConsorcio}), 0)`,
          comissaoOurocap: sql<number>`COALESCE(SUM(${calculos.comissaoOurocap}), 0)`,
          comissaoCc: sql<number>`COALESCE(SUM(${calculos.comissaoCc}), 0)`,
        })
        .from(calculos)
        .where(and(eq(calculos.chaveJ, chaveJ), eq(calculos.mesRef, mesAtual)));

      const [meta] = await db.select().from(agenteMetas)
        .where(and(eq(agenteMetas.chaveJ, chaveJ), eq(agenteMetas.mesRef, mesAtual)))
        .limit(1);

      const [streak] = await db.select().from(agenteStreak).where(eq(agenteStreak.chaveJ, chaveJ)).limit(1);

      const conquistas = await db.select().from(agenteConquistas)
        .where(eq(agenteConquistas.chaveJ, chaveJ))
        .orderBy(desc(agenteConquistas.conquistadoEm));

      const rankingRows = await db
        .select({ chaveJ: calculos.chaveJ, total: sql<number>`SUM(${calculos.comissaoTotal})` })
        .from(calculos)
        .where(eq(calculos.mesRef, mesAtual))
        .groupBy(calculos.chaveJ)
        .orderBy(desc(sql`SUM(${calculos.comissaoTotal})`));
      const posicaoRanking = rankingRows.findIndex(r => r.chaveJ === chaveJ) + 1;
      const totalRanking = rankingRows.length;

      const historico = await db
        .select({ mesRef: calculos.mesRef, total: sql<number>`SUM(${calculos.comissaoTotal})` })
        .from(calculos)
        .where(eq(calculos.chaveJ, chaveJ))
        .groupBy(calculos.mesRef)
        .orderBy(desc(calculos.mesRef))
        .limit(6);

      // Verificar conquistas de ranking
      if (posicaoRanking === 1 && totalRanking > 0) {
        await inserirConquista(db, chaveJ, 'primeiro_ranking', 'Campeão do Mês', 'Ficou em 1º lugar no ranking', 'award');
      }
      if (posicaoRanking <= 3 && posicaoRanking > 0 && totalRanking > 0) {
        await inserirConquista(db, chaveJ, 'top3_ranking', 'Top 3', 'Ficou entre os 3 primeiros do ranking', 'medal');
      }

      const comissaoAtual = Number(producaoMes?.comissaoTotal ?? 0);
      const metaTotalVal = Number(meta?.metaTotal ?? 0);
      if (metaTotalVal > 0 && comissaoAtual >= metaTotalVal) {
        await inserirConquista(db, chaveJ, 'meta_batida', 'Meta Batida!', 'Atingiu 100% da meta mensal', 'trophy');
      }
      if (metaTotalVal > 0 && comissaoAtual >= metaTotalVal * 1.2) {
        await inserirConquista(db, chaveJ, 'meta_superada', 'Superou a Meta!', 'Superou 120% da meta mensal', 'zap');
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
          metaTotal: Number(meta.metaTotal),
          metaConsig: Number(meta.metaConsig),
          metaConsorcio: Number(meta.metaConsorcio),
          metaOurocap: Number(meta.metaOurocap),
          metaCc: Number(meta.metaCc),
        } : null,
        streak: streak ? {
          streakAtual: Number(streak.streakAtual),
          maiorStreak: Number(streak.maiorStreak),
          totalAcessos: Number(streak.totalAcessos),
        } : null,
        conquistas: conquistas.map(c => ({
          codigo: c.codigo,
          titulo: c.titulo,
          descricao: c.descricao,
          icone: c.icone,
          conquistadoEm: c.conquistadoEm,
        })),
        ranking: { posicao: posicaoRanking, total: totalRanking },
        historico: historico.map(h => ({ mesRef: h.mesRef, total: Number(h.total) })),
        docsVencendo: [],
      };
    } catch (err) {
      console.error("[engajamento.painelPessoal] Erro:", err);
      return null;
    }
  }),

  rankingMes: protectedProcedure.input(z.object({ mesRef: z.string().optional() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    const mesRef = input.mesRef || getMesAtualBrasilia();
    const chaveJLogado = await getChaveJFromCtx(ctx, db);
    try {
      const rankingRows = await db
        .select({
          chaveJ: calculos.chaveJ,
          nomeAgente: calculos.nomeAgente,
          empresa: calculos.empresa,
          cidade: calculos.cidade,
          comissaoTotal: sql<number>`SUM(${calculos.comissaoTotal})`,
          rbmTotal: sql<number>`SUM(${calculos.rbmTotal})`,
        })
        .from(calculos)
        .where(eq(calculos.mesRef, mesRef))
        .groupBy(calculos.chaveJ, calculos.nomeAgente, calculos.empresa, calculos.cidade)
        .orderBy(desc(sql`SUM(${calculos.comissaoTotal})`))
        .limit(20);

      return rankingRows.map((r, i) => ({
        posicao: i + 1,
        chaveJ: r.chaveJ,
        nomeAgente: r.nomeAgente,
        empresa: r.empresa,
        cidade: r.cidade,
        comissaoTotal: Number(r.comissaoTotal),
        rbmTotal: Number(r.rbmTotal),
        isMe: r.chaveJ === chaveJLogado,
      }));
    } catch (err) {
      console.error("[engajamento.rankingMes] Erro:", err);
      return [];
    }
  }),

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
    const chaveJ = await getChaveJFromCtx(ctx, db);
    if (!chaveJ) return false;
    try {
      const [existente] = await db.select({ id: agenteMetas.id })
        .from(agenteMetas)
        .where(and(eq(agenteMetas.chaveJ, chaveJ), eq(agenteMetas.mesRef, input.mesRef)))
        .limit(1);
      if (existente) {
        await db.update(agenteMetas)
          .set({
            metaTotal: String(input.metaTotal),
            metaConsig: String(input.metaConsig),
            metaConsorcio: String(input.metaConsorcio),
            metaOurocap: String(input.metaOurocap),
            metaCc: String(input.metaCc),
          })
          .where(and(eq(agenteMetas.chaveJ, chaveJ), eq(agenteMetas.mesRef, input.mesRef)));
      } else {
        await db.insert(agenteMetas).values({
          chaveJ,
          mesRef: input.mesRef,
          metaTotal: String(input.metaTotal),
          metaConsig: String(input.metaConsig),
          metaConsorcio: String(input.metaConsorcio),
          metaOurocap: String(input.metaOurocap),
          metaCc: String(input.metaCc),
        });
      }
      return true;
    } catch (err) {
      console.error("[engajamento.salvarMeta] Erro:", err);
      return false;
    }
  }),

  mesesDisponiveis: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    try {
      const rows = await db
        .selectDistinct({ mesRef: calculos.mesRef })
        .from(calculos)
        .where(isNotNull(calculos.mesRef))
        .orderBy(desc(calculos.mesRef))
        .limit(12);
      return rows.map(r => r.mesRef).filter(Boolean);
    } catch {
      return [];
    }
  }),
});
