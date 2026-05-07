import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { certificacoes } from "../../drizzle/schema";
import { eq, like, or, desc, asc } from "drizzle-orm";

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

export const certificacoesRouter = router({
  listar: protectedProcedure
    .input(z.object({
      busca: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      if (!db) return [];
      let rows = await db.select().from(certificacoes).orderBy(asc(certificacoes.nomeAgente));
      if (input?.busca) {
        const b = input.busca.toLowerCase();
        rows = rows.filter(r =>
          (r.chaveJ || '').toLowerCase().includes(b) ||
          (r.nomeAgente || '').toLowerCase().includes(b) ||
          (r.cpf || '').toLowerCase().includes(b)
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
      const db = getDb();
      if (!db) throw new Error("DB indisponível");
      const dias1 = calcDiasFaltando(input.ventoCertif);
      const dias2 = calcDiasFaltando(input.ventoCertif3);
      await db.insert(certificacoes).values({
        ...input,
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
      const db = getDb();
      if (!db) throw new Error("DB indisponível");
      const { id, ...dados } = input;
      const dias1 = calcDiasFaltando(dados.ventoCertif);
      const dias2 = calcDiasFaltando(dados.ventoCertif3);
      await db.update(certificacoes).set({
        ...dados,
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
      const db = getDb();
      if (!db) throw new Error("DB indisponível");
      await db.delete(certificacoes).where(eq(certificacoes.id, input.id));
      return { success: true };
    }),

  importar: protectedProcedure
    .input(z.array(z.object({
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
      const db = getDb();
      if (!db) throw new Error("DB indisponível");
      if (input.length === 0) return { count: 0 };

      const rows = input.map(r => {
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
