import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { consorcios } from "../../drizzle/schema";
import { eq, and, like, desc, asc, sql, or } from "drizzle-orm";

export const consorcioRouter = router({
  // Listagem com filtros e paginação
  list: protectedProcedure
    .input(z.object({
      page: z.number().default(0),
      limit: z.number().default(100),
      search: z.string().optional(),
      empresa: z.string().optional(),
      mesAno: z.string().optional(),
      segmento: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { rows: [], total: 0 };

      const conditions: any[] = [];

      if (input.empresa && input.empresa !== "__all__") {
        conditions.push(eq(consorcios.empresa, input.empresa));
      }
      if (input.mesAno && input.mesAno !== "__all__") {
        conditions.push(eq(consorcios.mesAno, input.mesAno));
      }
      if (input.segmento && input.segmento !== "__all__") {
        conditions.push(eq(consorcios.segmento, input.segmento));
      }
      if (input.search) {
        const s = `%${input.search}%`;
        conditions.push(
          or(
            like(consorcios.proposta, s),
            like(consorcios.chaveJ, s),
            like(consorcios.nomeAgente, s),
          )
        );
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      // Ordenar por mês/ano do mais novo para o mais antigo (MM/AAAA → AAAA/MM)
      const [rows, countResult] = await Promise.all([
        db.select().from(consorcios)
          .where(where)
          .orderBy(
            desc(sql`CONCAT(SUBSTRING(mesAno, 4, 4), SUBSTRING(mesAno, 1, 2))`),
            asc(consorcios.empresa),
            asc(consorcios.nomeAgente)
          )
          .limit(input.limit)
          .offset(input.page * input.limit),
        db.select({ count: sql<number>`COUNT(*)` }).from(consorcios).where(where),
      ]);

      return { rows, total: Number(countResult[0]?.count ?? 0) };
    }),

  // Filtros disponíveis
  filtros: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { empresas: [], mesanos: [], segmentos: [] };

    const [empresas, mesanos, segmentos] = await Promise.all([
      db.selectDistinct({ v: consorcios.empresa }).from(consorcios)
        .where(sql`empresa IS NOT NULL AND empresa != ''`)
        .orderBy(asc(consorcios.empresa)),
      db.selectDistinct({ v: consorcios.mesAno }).from(consorcios)
        .where(sql`mesAno IS NOT NULL AND mesAno != ''`)
        .orderBy(desc(sql`CONCAT(SUBSTRING(mesAno, 4, 4), SUBSTRING(mesAno, 1, 2))`)),
      db.selectDistinct({ v: consorcios.segmento }).from(consorcios)
        .where(sql`segmento IS NOT NULL AND segmento != ''`)
        .orderBy(asc(consorcios.segmento)),
    ]);

    return {
      empresas: empresas.map(r => r.v!).filter(Boolean),
      mesanos: mesanos.map(r => r.v!).filter(Boolean),
      segmentos: segmentos.map(r => r.v!).filter(Boolean),
    };
  }),

  // Resumo por empresa/mês
  resumo: protectedProcedure
    .input(z.object({
      mesAno: z.string().optional(),
      empresa: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions: any[] = [];
      if (input.mesAno && input.mesAno !== "__all__") {
        conditions.push(eq(consorcios.mesAno, input.mesAno));
      }
      if (input.empresa && input.empresa !== "__all__") {
        conditions.push(eq(consorcios.empresa, input.empresa));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      return await db.select({
        empresa: consorcios.empresa,
        mesAno: consorcios.mesAno,
        qtd: sql<number>`COUNT(*)`,
        totalRbm: sql<number>`SUM(CAST(rbm AS DECIMAL(15,2)))`,
        totalComissao: sql<number>`SUM(CAST(comissao AS DECIMAL(15,2)))`,
        totalValorBem: sql<number>`SUM(CAST(valorBem AS DECIMAL(15,2)))`,
      })
        .from(consorcios)
        .where(where)
        .groupBy(consorcios.empresa, consorcios.mesAno)
        .orderBy(desc(consorcios.mesAno), asc(consorcios.empresa));
    }),

  // Importação batch (upsert por proposta)
  importar: protectedProcedure
    .input(z.object({
      rows: z.array(z.object({
        empresa: z.string(),
        mesAno: z.string(),
        proposta: z.string(),
        data: z.string().optional(),
        segmento: z.string().optional(),
        valorBem: z.number().optional(),
        parcLiberada: z.string().optional(),
        pctComissao1: z.number().optional(),
        rbm: z.number().optional(),
        pctComissao2: z.number().optional(),
        comissao: z.number().optional(),
        chaveJ: z.string().optional(),
        nomeAgente: z.string().optional(),
      })),
      modo: z.enum(["inserir", "subscrever"]).default("subscrever"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco não disponível");

      const { rows, modo } = input;
      if (rows.length === 0) return { inseridos: 0, atualizados: 0, erros: 0 };

      let inseridos = 0;
      let atualizados = 0;
      let erros = 0;

      // Buscar propostas existentes em batch
      const propostas = rows.map(r => r.proposta).filter(Boolean);
      const existentes = new Set<string>();

      if (propostas.length > 0) {
        const CHUNK = 500;
        for (let i = 0; i < propostas.length; i += CHUNK) {
          const chunk = propostas.slice(i, i + CHUNK);
          const found = await db
            .select({ proposta: consorcios.proposta })
            .from(consorcios)
            .where(sql`proposta IN (${sql.raw(chunk.map(p => `'${p.replace(/'/g, "''")}'`).join(','))})`);
          found.forEach(r => { if (r.proposta) existentes.add(r.proposta); });
        }
      }

      // Separar em inserções e atualizações
      const toInsert: typeof rows = [];
      const toUpdate: typeof rows = [];

      for (const row of rows) {
        if (!row.proposta || !row.empresa) continue;
        if (existentes.has(row.proposta)) {
          if (modo === "subscrever") toUpdate.push(row);
        } else {
          toInsert.push(row);
        }
      }

      // Inserções em batch de 200
      const BATCH = 200;
      for (let i = 0; i < toInsert.length; i += BATCH) {
        const chunk = toInsert.slice(i, i + BATCH);
        try {
          await db.insert(consorcios).values(chunk.map(r => ({
            empresa: r.empresa,
            mesAno: r.mesAno,
            proposta: r.proposta,
            data: r.data ?? null,
            segmento: r.segmento ?? null,
            valorBem: r.valorBem != null ? String(r.valorBem) : null,
            parcLiberada: r.parcLiberada ?? null,
            pctComissao1: r.pctComissao1 != null ? String(r.pctComissao1) : null,
            rbm: r.rbm != null ? String(r.rbm) : null,
            pctComissao2: r.pctComissao2 != null ? String(r.pctComissao2) : null,
            comissao: r.comissao != null ? String(r.comissao) : null,
            chaveJ: r.chaveJ ?? null,
            nomeAgente: r.nomeAgente ?? null,
          })));
          inseridos += chunk.length;
        } catch (e) {
          erros += chunk.length;
        }
      }

      // Atualizações individuais
      for (const r of toUpdate) {
        try {
          await db.update(consorcios)
            .set({
              empresa: r.empresa,
              mesAno: r.mesAno,
              data: r.data ?? null,
              segmento: r.segmento ?? null,
              valorBem: r.valorBem != null ? String(r.valorBem) : null,
              parcLiberada: r.parcLiberada ?? null,
              pctComissao1: r.pctComissao1 != null ? String(r.pctComissao1) : null,
              rbm: r.rbm != null ? String(r.rbm) : null,
              pctComissao2: r.pctComissao2 != null ? String(r.pctComissao2) : null,
              comissao: r.comissao != null ? String(r.comissao) : null,
              chaveJ: r.chaveJ ?? null,
              nomeAgente: r.nomeAgente ?? null,
            })
            .where(eq(consorcios.proposta, r.proposta));
          atualizados++;
        } catch (e) {
          erros++;
        }
      }

      return { inseridos, atualizados, erros, total: rows.length };
    }),

  // Ler configurações de comissão
  getConfig: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return null;
    const rows = await db.execute(
      sql`SELECT chave, valor FROM consorcio_config`
    ) as any;
    const result: Record<string, string> = {};
    const data = Array.isArray(rows) ? rows[0] : rows;
    if (Array.isArray(data)) {
      data.forEach((r: any) => { if (r.chave) result[r.chave] = r.valor ?? ''; });
    }
    return result;
  }),

  // Salvar configurações de comissão
  saveConfig: protectedProcedure
    .input(z.object({
      pctComissaoPadrao1: z.string().optional(),
      pctComissaoPadrao2: z.string().optional(),
      qtdParcPadrao: z.string().optional(),
      pctComissaoEspecial1: z.string().optional(),
      pctComissaoEspecial2: z.string().optional(),
      qtdParcEspecial: z.string().optional(),
      agentesEspeciais: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Banco não disponível');
      const entries = Object.entries(input) as [string, string][];
      for (const [chave, valor] of entries) {
        await db.execute(
          sql`INSERT INTO consorcio_config (chave, valor) VALUES (${chave}, ${valor ?? ''})
              ON DUPLICATE KEY UPDATE valor = ${valor ?? ''}`
        );
      }
      return { ok: true };
    }),

  // Excluir registro
  excluir: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco não disponível");
      await db.delete(consorcios).where(eq(consorcios.id, input.id));
      return { ok: true };
    }),

  // Atualizar registro
  atualizar: protectedProcedure
    .input(z.object({
      id: z.number(),
      empresa: z.string().optional(),
      mesAno: z.string().optional(),
      proposta: z.string().optional(),
      data: z.string().optional(),
      segmento: z.string().optional(),
      valorBem: z.number().optional().nullable(),
      parcLiberada: z.string().optional(),
      pctComissao1: z.number().optional().nullable(),
      rbm: z.number().optional().nullable(),
      pctComissao2: z.number().optional().nullable(),
      comissao: z.number().optional().nullable(),
      chaveJ: z.string().optional(),
      nomeAgente: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco não disponível");
      const { id, ...data } = input;
      await db.update(consorcios).set({
        ...data,
        valorBem: data.valorBem != null ? String(data.valorBem) : null,
        pctComissao1: data.pctComissao1 != null ? String(data.pctComissao1) : null,
        rbm: data.rbm != null ? String(data.rbm) : null,
        pctComissao2: data.pctComissao2 != null ? String(data.pctComissao2) : null,
        comissao: data.comissao != null ? String(data.comissao) : null,
      }).where(eq(consorcios.id, id));
      return { ok: true };
    }),
});
