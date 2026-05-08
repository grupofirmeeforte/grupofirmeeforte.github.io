import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { certificacoes, agentes } from "../../drizzle/schema";
import { eq, asc } from "drizzle-orm";

function calcDiasFaltando(vencto: string | null | undefined): number | null {
  if (!vencto) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const v = new Date(vencto);
  if (isNaN(v.getTime())) return null;
  return Math.floor((v.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

function calcSituacaoCertif(dias: number | null): string {
  if (dias === null) return '-';
  return dias > 0 ? 'A VENCER' : 'VENCIDO';
}

/** Busca empresa, nome e situação do agente pela ChaveJ na tabela de agentes */
async function enriquecerComAgente(db: any, chaveJ: string | null | undefined): Promise<{ empresa: string | null; nomeAgente: string | null; situacao: string | null }> {
  if (!chaveJ) return { empresa: null, nomeAgente: null, situacao: null };
  const found = await db.select({
    nomeAgente: agentes.nomeAgente,
    empresa: agentes.empresa,
    situacao: agentes.situacao,
  }).from(agentes).where(eq(agentes.chaveJ, chaveJ)).limit(1);
  if (found.length > 0) {
    return {
      empresa: found[0].empresa || null,
      nomeAgente: found[0].nomeAgente || null,
      situacao: found[0].situacao || null,
    };
  }
  return { empresa: null, nomeAgente: null, situacao: null };
}

export const certificacoesRouter = router({
  listar: protectedProcedure
    .input(z.object({
      busca: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      let rows = await db.select().from(certificacoes).orderBy(asc(certificacoes.empresa), asc(certificacoes.nomeAgente));
      if (input?.busca) {
        const b = input.busca.toLowerCase();
        rows = rows.filter(r =>
          (r.chaveJ || '').toLowerCase().includes(b) ||
          (r.nomeAgente || '').toLowerCase().includes(b) ||
          (r.cpf || '').toLowerCase().includes(b) ||
          (r.empresa || '').toLowerCase().includes(b)
        );
      }
      // Calcular dias faltando e situação em tempo real
      return rows.map(r => {
        const dias1 = calcDiasFaltando(r.ventoCertif);
        const dias2 = calcDiasFaltando(r.ventoCertif3);
        return {
          ...r,
          diasFaltando: dias1,
          situacaoCertif: calcSituacaoCertif(dias1),
          diasFaltando2: dias2,
          situacaoCertif3: calcSituacaoCertif(dias2),
        };
      });
    }),

  criar: protectedProcedure
    .input(z.object({
      empresa: z.string().optional(),
      chaveJ: z.string().optional(),
      nomeAgente: z.string().optional(),
      cpf: z.string().optional(),
      situacao: z.string().optional(),
      dataCertif: z.string().optional(),
      ventoCertif: z.string().optional(),
      nrCertificadoConsig: z.string().optional(),
      dataCertif2: z.string().optional(),
      ventoCertif3: z.string().optional(),
      nrCertificadoPldft: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");
      // Enriquecer com dados do agente se empresa, nome ou situação estiverem vazios
      let empresa = input.empresa || null;
      let nomeAgente = input.nomeAgente || null;
      let situacao = input.situacao || null;
      if ((!empresa || !nomeAgente || !situacao) && input.chaveJ) {
        const dados = await enriquecerComAgente(db, input.chaveJ);
        if (!empresa) empresa = dados.empresa;
        if (!nomeAgente) nomeAgente = dados.nomeAgente;
        if (!situacao) situacao = dados.situacao;
      }
      const dias1 = calcDiasFaltando(input.ventoCertif);
      const dias2 = calcDiasFaltando(input.ventoCertif3);
      await db.insert(certificacoes).values({
        ...input,
        empresa,
        nomeAgente,
        situacao,
        diasFaltando: dias1,
        situacaoCertif: calcSituacaoCertif(dias1),
        diasFaltando2: dias2,
        situacaoCertif3: calcSituacaoCertif(dias2),
      } as any);
      return { success: true };
    }),

  atualizar: protectedProcedure
    .input(z.object({
      id: z.number(),
      empresa: z.string().optional(),
      chaveJ: z.string().optional(),
      nomeAgente: z.string().optional(),
      cpf: z.string().optional(),
      situacao: z.string().optional(),
      dataCertif: z.string().optional(),
      ventoCertif: z.string().optional(),
      nrCertificadoConsig: z.string().optional(),
      dataCertif2: z.string().optional(),
      ventoCertif3: z.string().optional(),
      nrCertificadoPldft: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");
      const { id, ...dados } = input;
      // Enriquecer com dados do agente se empresa, nome ou situação estiverem vazios
      let empresa = dados.empresa || null;
      let nomeAgente = dados.nomeAgente || null;
      let situacao = dados.situacao || null;
      if ((!empresa || !nomeAgente || !situacao) && dados.chaveJ) {
        const agenteDados = await enriquecerComAgente(db, dados.chaveJ);
        if (!empresa) empresa = agenteDados.empresa;
        if (!nomeAgente) nomeAgente = agenteDados.nomeAgente;
        if (!situacao) situacao = agenteDados.situacao;
      }
      const dias1 = calcDiasFaltando(dados.ventoCertif);
      const dias2 = calcDiasFaltando(dados.ventoCertif3);
      await db.update(certificacoes).set({
        ...dados,
        empresa,
        nomeAgente,
        situacao,
        diasFaltando: dias1,
        situacaoCertif: calcSituacaoCertif(dias1),
        diasFaltando2: dias2,
        situacaoCertif3: calcSituacaoCertif(dias2),
      } as any).where(eq(certificacoes.id, id));
      return { success: true };
    }),

  excluir: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");
      await db.delete(certificacoes).where(eq(certificacoes.id, input.id));
      return { success: true };
    }),

  sincronizarAgentes: protectedProcedure
    .mutation(async () => {
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");

      // Carregar todos os agentes
      const todosAgentes = await db.select({
        chaveJ: agentes.chaveJ,
        nomeAgente: agentes.nomeAgente,
        empresa: agentes.empresa,
        situacao: agentes.situacao,
      }).from(agentes);

      const agenteMap = new Map<string, { nomeAgente: string | null; empresa: string | null; situacao: string | null }>();
      for (const a of todosAgentes) {
        if (a.chaveJ) agenteMap.set(a.chaveJ.toUpperCase(), {
          nomeAgente: a.nomeAgente || null,
          empresa: a.empresa || null,
          situacao: a.situacao || null,
        });
      }

      // Buscar todas as certificações
      const certs = await db.select({ id: certificacoes.id, chaveJ: certificacoes.chaveJ }).from(certificacoes);
      let atualizados = 0;

      for (const cert of certs) {
        if (!cert.chaveJ) continue;
        const agente = agenteMap.get(cert.chaveJ.toUpperCase());
        if (!agente) continue;
        await db.update(certificacoes).set({
          empresa: agente.empresa,
          nomeAgente: agente.nomeAgente,
          situacao: agente.situacao,
        } as any).where(eq(certificacoes.id, cert.id));
        atualizados++;
      }

      return { atualizados };
    }),

  importar: protectedProcedure
    .input(z.array(z.object({
      empresa: z.string().optional(),
      chaveJ: z.string().optional(),
      nomeAgente: z.string().optional(),
      cpf: z.string().optional(),
      situacao: z.string().optional(),
      dataCertif: z.string().optional(),
      ventoCertif: z.string().optional(),
      nrCertificadoConsig: z.string().optional(),
      dataCertif2: z.string().optional(),
      ventoCertif3: z.string().optional(),
      nrCertificadoPldft: z.string().optional(),
    })))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");
      if (input.length === 0) return { count: 0 };

      // Pré-carregar todos os agentes para lookup rápido por ChaveJ
      const todosAgentes = await db.select({
        chaveJ: agentes.chaveJ,
        nomeAgente: agentes.nomeAgente,
        empresa: agentes.empresa,
        situacao: agentes.situacao,
      }).from(agentes);

      const agenteMap = new Map<string, { nomeAgente: string | null; empresa: string | null; situacao: string | null }>();
      for (const a of todosAgentes) {
        if (a.chaveJ) agenteMap.set(a.chaveJ.toUpperCase(), { nomeAgente: a.nomeAgente, empresa: a.empresa, situacao: a.situacao || null });
      }

      const rows = input.map(r => {
        let empresa = r.empresa && r.empresa.trim() ? r.empresa.trim() : null;
        let nomeAgente = r.nomeAgente && r.nomeAgente.trim() ? r.nomeAgente.trim() : null;

        // Buscar na tabela de agentes se empresa ou nome estiverem vazios
        if ((!empresa || !nomeAgente) && r.chaveJ) {
          const agenteDados = agenteMap.get(r.chaveJ.toUpperCase());
          if (agenteDados) {
            if (!empresa) empresa = agenteDados.empresa;
            if (!nomeAgente) nomeAgente = agenteDados.nomeAgente;
          }
        }

        // Buscar situação do agente
        let situacao = r.situacao && r.situacao.trim() ? r.situacao.trim() : null;
        if (!situacao && r.chaveJ) {
          const agenteDados2 = agenteMap.get(r.chaveJ.toUpperCase());
          if (agenteDados2) situacao = (agenteDados2 as any).situacao || null;
        }
        const dias1 = calcDiasFaltando(r.ventoCertif);
        const dias2 = calcDiasFaltando(r.ventoCertif3);
        return {
          ...r,
          empresa,
          nomeAgente,
          situacao,
          diasFaltando: dias1,
          situacaoCertif: calcSituacaoCertif(dias1),
          diasFaltando2: dias2,
          situacaoCertif3: calcSituacaoCertif(dias2),
        };
      });

      // Upsert por chaveJ
      for (const row of rows) {
        if (row.chaveJ) {
          const existing = await db.select({ id: certificacoes.id })
            .from(certificacoes)
            .where(eq(certificacoes.chaveJ, row.chaveJ))
            .limit(1);
          if (existing.length > 0) {
            await db.update(certificacoes).set(row as any).where(eq(certificacoes.id, existing[0].id));
          } else {
            await db.insert(certificacoes).values(row as any);
          }
        } else {
          await db.insert(certificacoes).values(row as any);
        }
      }
      return { count: rows.length };
    }),
});
