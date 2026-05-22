import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { sql, eq, and, desc, isNotNull } from "drizzle-orm";
import {
  agentes, calculos, febraban, agenteStreak, agenteMetas, agenteConquistas
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

// Converte "MM/YYYY" para o formato numérico do febraban (ex: "05/2026" → 526)
function mesAnoParaFebMesano(mesAno: string): number {
  const [mes, ano] = mesAno.split('/');
  return parseInt(mes, 10) * 100 + (parseInt(ano, 10) % 100);
}

// Converte mesano numérico do febraban para "MM/YYYY" (ex: 526 → "05/2026")
function febMesanoParaMesAno(mesano: number): string {
  const mes = Math.floor(mesano / 100);
  const anoSufixo = mesano % 100;
  const anoCompleto = anoSufixo + (anoSufixo < 50 ? 2000 : 1900);
  return `${String(mes).padStart(2, '0')}/${anoCompleto}`;
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
    const febMesano = mesAnoParaFebMesano(mesAtual);
    try {
      const [agente] = await db.select().from(agentes).where(eq(agentes.chaveJ, chaveJ)).limit(1);

      // Produção BB: soma troco das operações Contratadas na tabela febraban
      const [producaoFeb] = await db
        .select({
          totalTroco: sql<number>`COALESCE(SUM(${febraban.troco}), 0)`,
        })
        .from(febraban)
        .where(and(
          eq(febraban.operador, chaveJ),
          eq(febraban.mesano, febMesano),
          eq(febraban.situacao, 'Contratada')
        ));

      // Outros produtos (consórcio, ourocap, c/c, seguros) ainda vêm de calculos
      const [producaoCalc] = await db
        .select({
          comissaoConsorcio: sql<number>`COALESCE(SUM(${calculos.comissaoConsorcio}), 0)`,
          comissaoOurocap: sql<number>`COALESCE(SUM(${calculos.comissaoOurocap}), 0)`,
          comissaoCc: sql<number>`COALESCE(SUM(${calculos.comissaoCc}), 0)`,
          comissaoSeguros: sql<number>`COALESCE(SUM(${calculos.comissaoSeguros}), 0)`,
          rbmTotal: sql<number>`COALESCE(SUM(${calculos.rbmTotal}), 0)`,
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

      // Ranking usa febraban.troco (Produção BB) — apenas Contratadas
      const rankingRows = await db
        .select({
          operador: febraban.operador,
          total: sql<number>`COALESCE(SUM(${febraban.troco}), 0)`,
        })
        .from(febraban)
        .where(and(eq(febraban.mesano, febMesano), eq(febraban.situacao, 'Contratada')))
        .groupBy(febraban.operador)
        .orderBy(desc(sql`COALESCE(SUM(${febraban.troco}), 0)`));
      const posicaoRanking = rankingRows.findIndex(r => r.operador === chaveJ) + 1;
      const totalRanking = rankingRows.length;

      // Histórico usa febraban.troco por mesano
      const historicoFeb = await db
        .select({
          mesano: febraban.mesano,
          total: sql<number>`COALESCE(SUM(${febraban.troco}), 0)`,
        })
        .from(febraban)
        .where(and(eq(febraban.operador, chaveJ), eq(febraban.situacao, 'Contratada')))
        .groupBy(febraban.mesano)
        .orderBy(desc(febraban.mesano))
        .limit(6);

      // Verificar conquistas de ranking
      if (posicaoRanking === 1 && totalRanking > 0) {
        await inserirConquista(db, chaveJ, 'primeiro_ranking', 'Campeão do Mês', 'Ficou em 1º lugar no ranking', 'award');
      }
      if (posicaoRanking <= 3 && posicaoRanking > 0 && totalRanking > 0) {
        await inserirConquista(db, chaveJ, 'top3_ranking', 'Top 3', 'Ficou entre os 3 primeiros do ranking', 'medal');
      }

      const totalFeb = Number(producaoFeb?.totalTroco ?? 0);
      const totalOutros = Number(producaoCalc?.comissaoConsorcio ?? 0) + Number(producaoCalc?.comissaoOurocap ?? 0) + Number(producaoCalc?.comissaoCc ?? 0) + Number(producaoCalc?.comissaoSeguros ?? 0);
      const comissaoAtual = totalFeb + totalOutros;
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
          vrLiquidoC2: totalFeb,          // troco do Febraban (Produção BB) — Contratadas
          vrLiquidoSrcc: 0,
          comissaoConsorcio: Number(producaoCalc?.comissaoConsorcio ?? 0),
          comissaoOurocap: Number(producaoCalc?.comissaoOurocap ?? 0),
          comissaoCc: Number(producaoCalc?.comissaoCc ?? 0),
          comissaoSeguros: Number(producaoCalc?.comissaoSeguros ?? 0),
          rbmTotal: Number(producaoCalc?.rbmTotal ?? 0),
          total: comissaoAtual,
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
        historico: historicoFeb.map(h => ({
          mesRef: h.mesano != null ? febMesanoParaMesAno(Number(h.mesano)) : '',
          total: Number(h.total),
        })),
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
    const febMesanoRanking = mesAnoParaFebMesano(mesRef);
    try {
      // Ranking usa febraban.troco (Produção BB) — apenas Contratadas
      const rankingFeb = await db
        .select({
          operador: febraban.operador,
          vrLiquido: sql<number>`COALESCE(SUM(${febraban.troco}), 0)`,
        })
        .from(febraban)
        .where(and(eq(febraban.mesano, febMesanoRanking), eq(febraban.situacao, 'Contratada')))
        .groupBy(febraban.operador)
        .orderBy(desc(sql`COALESCE(SUM(${febraban.troco}), 0)`))
        .limit(20);

      // Buscar nomes dos agentes pelo chaveJ (operador) — exibir apenas primeiro nome
      const chaveJs = rankingFeb.map(r => r.operador).filter(Boolean) as string[];
      const agentesRanking = chaveJs.length > 0
        ? await db.select({ chaveJ: agentes.chaveJ, nomeAgente: agentes.nomeAgente, empresa: agentes.empresa })
            .from(agentes)
            .where(sql`${agentes.chaveJ} IN (${sql.join(chaveJs.map(c => sql`${c}`), sql`, `)})`)
        : [];
      const agentesMap = new Map(agentesRanking.map(a => [a.chaveJ, a]));

      return rankingFeb.map((r, i) => {
        const ag = agentesMap.get(r.operador ?? '');
        const nomeCompleto = ag?.nomeAgente ?? '';
        const primeiroNome = nomeCompleto.split(' ')[0] || '—';
        return {
          posicao: i + 1,
          chaveJ: r.operador,
          nomeAgente: primeiroNome,
          empresa: ag?.empresa ?? null,
          cidade: null as string | null,
          vrLiquido: Number(r.vrLiquido),
          rbmTotal: 0,
          isMe: r.operador === chaveJLogado,
        };
      });
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
      // Usa febraban.mesano para listar meses disponíveis
      const rows = await db
        .selectDistinct({ mesano: febraban.mesano })
        .from(febraban)
        .where(isNotNull(febraban.mesano))
        .orderBy(desc(febraban.mesano))
        .limit(12);
      return rows
        .map(r => r.mesano != null ? febMesanoParaMesAno(Number(r.mesano)) : null)
        .filter(Boolean);
    } catch {
      return [];
    }
  }),
});
