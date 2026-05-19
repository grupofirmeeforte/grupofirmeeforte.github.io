import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { consorcios, agentes } from "../../drizzle/schema";
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

      // ── REGRA 1: Para PARC1, buscar nome do agente pelo ChaveJ no cadastro ──
      // Coletar todos os ChaveJ únicos das PARC1
      const chaveJsParc1 = Array.from(new Set(
        rows.filter(r => r.parcLiberada === 'PARC1' && r.chaveJ)
            .map(r => r.chaveJ!.toUpperCase())
      ));

      const nomesPorChaveJ = new Map<string, string>();
      if (chaveJsParc1.length > 0) {
        const CHUNK_AG = 200;
        for (let i = 0; i < chaveJsParc1.length; i += CHUNK_AG) {
          const chunk = chaveJsParc1.slice(i, i + CHUNK_AG);
          const found = await db.select({ chaveJ: agentes.chaveJ, nomeAgente: agentes.nomeAgente })
            .from(agentes)
            .where(sql`chaveJ IN (${sql.raw(chunk.map(c => `'${c.replace(/'/g, "''")}'`).join(','))})`);
          found.forEach(a => { if (a.chaveJ && a.nomeAgente) nomesPorChaveJ.set(a.chaveJ.toUpperCase(), a.nomeAgente); });
        }
      }

      // ── REGRA 2: Para PARC2+, buscar ChaveJ e nome da PARC1 da mesma proposta ──
      // Primeiro checar no próprio lote de importação
      const parc1NoBatch = new Map<string, { chaveJ: string; nomeAgente: string }>();
      for (const r of rows) {
        if (r.parcLiberada === 'PARC1' && r.proposta && r.chaveJ) {
          const nome = nomesPorChaveJ.get(r.chaveJ.toUpperCase()) || r.nomeAgente || '';
          parc1NoBatch.set(r.proposta, { chaveJ: r.chaveJ.toUpperCase(), nomeAgente: nome });
        }
      }

      // Para propostas não encontradas no lote, buscar no banco
      const propostasParc2Plus = Array.from(new Set(
        rows.filter(r => r.parcLiberada && r.parcLiberada !== 'PARC1' && r.proposta && !parc1NoBatch.has(r.proposta!))
            .map(r => r.proposta!)
      ));

      if (propostasParc2Plus.length > 0) {
        const CHUNK_P = 200;
        for (let i = 0; i < propostasParc2Plus.length; i += CHUNK_P) {
          const chunk = propostasParc2Plus.slice(i, i + CHUNK_P);
          const found = await db.select({ proposta: consorcios.proposta, chaveJ: consorcios.chaveJ, nomeAgente: consorcios.nomeAgente })
            .from(consorcios)
            .where(sql`proposta IN (${sql.raw(chunk.map(p => `'${p.replace(/'/g, "''")}'`).join(','))}) AND parcLiberada = 'PARC1'`);
          found.forEach(f => {
            if (f.proposta && f.chaveJ) {
              parc1NoBatch.set(f.proposta, { chaveJ: f.chaveJ, nomeAgente: f.nomeAgente || '' });
            }
          });
        }
      }

      // Enriquecer cada row com o agente correto
      const rowsEnriquecidos = rows.map(r => {
        if (!r.proposta) return r;
        if (r.parcLiberada === 'PARC1' && r.chaveJ) {
          // PARC1: buscar nome no cadastro
          const nomeDosCadastro = nomesPorChaveJ.get(r.chaveJ.toUpperCase());
          return { ...r, chaveJ: r.chaveJ.toUpperCase(), nomeAgente: nomeDosCadastro || r.nomeAgente || '' };
        } else if (r.parcLiberada && r.parcLiberada !== 'PARC1') {
          // PARC2+: copiar da PARC1 da mesma proposta
          const parc1 = parc1NoBatch.get(r.proposta);
          if (parc1) {
            return { ...r, chaveJ: parc1.chaveJ, nomeAgente: parc1.nomeAgente };
          }
        }
        return r;
      });

      // Buscar propostas existentes em batch
      const propostas = rowsEnriquecidos.map(r => r.proposta).filter(Boolean);
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

  // Recalcular agentes nos registros já importados
  recalcularAgentes: protectedProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error('Banco não disponível');

    // 1. Buscar todas as PARC1 com chaveJ
    const parc1s = await db.select({
      proposta: consorcios.proposta,
      chaveJ: consorcios.chaveJ,
      nomeAgente: consorcios.nomeAgente,
    }).from(consorcios).where(sql`parcLiberada = 'PARC1' AND chaveJ IS NOT NULL AND chaveJ != ''`);

    // 2. Para cada PARC1, buscar nome no cadastro
    const chaveJsUnicos = Array.from(new Set(parc1s.map(r => r.chaveJ!.toUpperCase())));
    const nomesPorChaveJ = new Map<string, string>();
    if (chaveJsUnicos.length > 0) {
      const CHUNK = 200;
      for (let i = 0; i < chaveJsUnicos.length; i += CHUNK) {
        const chunk = chaveJsUnicos.slice(i, i + CHUNK);
        const found = await db.select({ chaveJ: agentes.chaveJ, nomeAgente: agentes.nomeAgente })
          .from(agentes)
          .where(sql`chaveJ IN (${sql.raw(chunk.map(c => `'${c.replace(/'/g, "''")}'`).join(','))})`);
        found.forEach(a => { if (a.chaveJ && a.nomeAgente) nomesPorChaveJ.set(a.chaveJ.toUpperCase(), a.nomeAgente); });
      }
    }

    // 3. Atualizar PARC1 com nome do cadastro
    let atualizadosParc1 = 0;
    for (const p of parc1s) {
      const nome = nomesPorChaveJ.get(p.chaveJ!.toUpperCase());
      if (nome && nome !== p.nomeAgente) {
        await db.update(consorcios)
          .set({ nomeAgente: nome, chaveJ: p.chaveJ!.toUpperCase() })
          .where(sql`proposta = '${sql.raw(p.proposta!.replace(/'/g, "''"))}' AND parcLiberada = 'PARC1'`);
        atualizadosParc1++;
      }
    }

    // 4. Atualizar PARC2+ copiando da PARC1
    const parc1Map = new Map<string, { chaveJ: string; nomeAgente: string }>();
    for (const p of parc1s) {
      if (p.proposta && p.chaveJ) {
        const nome = nomesPorChaveJ.get(p.chaveJ.toUpperCase()) || p.nomeAgente || '';
        parc1Map.set(p.proposta, { chaveJ: p.chaveJ.toUpperCase(), nomeAgente: nome });
      }
    }

    let atualizadosParcMais = 0;
    const propostas = Array.from(parc1Map.keys());
    for (const proposta of propostas) {
      const parc1 = parc1Map.get(proposta)!;
      try {
        await db.update(consorcios)
          .set({ chaveJ: parc1.chaveJ, nomeAgente: parc1.nomeAgente })
          .where(sql`proposta = '${sql.raw(proposta.replace(/'/g, "''"))}' AND (parcLiberada != 'PARC1' OR parcLiberada IS NULL)`);
        atualizadosParcMais++;
      } catch { /* ignora */ }
    }

    return { atualizadosParc1, atualizadosParcMais, total: atualizadosParc1 + atualizadosParcMais };
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
      qtdParcPadrao1: z.string().optional(),
      pctComissaoPadrao2: z.string().optional(),
      qtdParcPadrao2: z.string().optional(),
      pctComissaoEspecial1: z.string().optional(),
      qtdParcEspecial1: z.string().optional(),
      pctComissaoEspecial2: z.string().optional(),
      qtdParcEspecial2: z.string().optional(),
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

  // Calcular RBM e Comissão
  calcular: protectedProcedure
    .input(z.object({
      mesAno: z.string().optional(), // se vazio, calcula todos
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Banco não disponível');

      // 1. Ler configurações de comissão
      const cfgRows = await db.execute(sql`SELECT chave, valor FROM consorcio_config`) as any;
      const cfgData = Array.isArray(cfgRows) ? cfgRows[0] : cfgRows;
      const cfg: Record<string, string> = {};
      if (Array.isArray(cfgData)) {
        cfgData.forEach((r: any) => { if (r.chave) cfg[r.chave] = r.valor ?? ''; });
      }

      const pct1Padrao   = parseFloat(cfg['pctComissaoPadrao1']   || '0') / 100;
      const pct2Padrao   = parseFloat(cfg['pctComissaoPadrao2']   || '0') / 100;
      const parc1Padrao  = parseInt(cfg['qtdParcPadrao1']         || '3');
      const parc2Padrao  = parseInt(cfg['qtdParcPadrao2']         || '3');
      const pct1Especial = parseFloat(cfg['pctComissaoEspecial1'] || '0') / 100;
      const pct2Especial = parseFloat(cfg['pctComissaoEspecial2'] || '0') / 100;
      const parc1Especial= parseInt(cfg['qtdParcEspecial1']       || '4');
      const parc2Especial= parseInt(cfg['qtdParcEspecial2']       || '4');
      const agentesEspeciaisStr = cfg['agentesEspeciais'] || '';
      const agentesEspeciais = new Set(
        agentesEspeciaisStr.split('\n').map((s: string) => s.trim().toUpperCase()).filter(Boolean)
      );

      // 2. Buscar registros do mês (ou todos)
      const conditions: any[] = [];
      if (input.mesAno) conditions.push(eq(consorcios.mesAno, input.mesAno));
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const registros = await db.select({
        id: consorcios.id,
        segmento: consorcios.segmento,
        valorBem: consorcios.valorBem,
        parcLiberada: consorcios.parcLiberada,
        chaveJ: consorcios.chaveJ,
      }).from(consorcios).where(where);

      // 3. Calcular e atualizar cada registro
      let calculados = 0;
      let zerados = 0;

      for (const r of registros) {
        const valorBem = parseFloat(r.valorBem ?? '0') || 0;
        const parcNum = parseInt((r.parcLiberada ?? '').replace(/\D/g, '')) || 0;
        const isImovel = (r.segmento ?? '').toUpperCase().includes('IMOVEL') ||
                         (r.segmento ?? '').toUpperCase().includes('IMÓVEL');
        const isEspecial = agentesEspeciais.has((r.chaveJ ?? '').toUpperCase());

        // Determinar limites de parcelas para este agente/segmento
        let limParc1: number;
        let limParc2: number;
        let pct1: number;
        let pct2: number;

        if (isImovel) {
          // IMÓVEL: paga até 10 parcelas para ambos padrão e especial
          limParc1 = 10;
          limParc2 = 10;
          pct1 = isEspecial ? pct1Especial : pct1Padrao;
          pct2 = isEspecial ? pct2Especial : pct2Padrao;
        } else {
          // DEMAIS
          if (isEspecial) {
            limParc1 = parc1Especial; // configurado (padrão 4)
            limParc2 = parc2Especial;
            pct1 = pct1Especial;
            pct2 = pct2Especial;
          } else {
            limParc1 = parc1Padrao; // configurado (padrão 3)
            limParc2 = parc2Padrao;
            pct1 = pct1Padrao;
            pct2 = pct2Padrao;
          }
        }

        // RBM: zera se parcela acima do limite de Com.1
        const rbmVal = parcNum <= limParc1 ? +(valorBem * pct1).toFixed(2) : 0;
        // Comissão: zera se parcela acima do limite de Com.2
        const comissaoVal = parcNum <= limParc2 ? +(valorBem * pct2).toFixed(2) : 0;

        await db.update(consorcios)
          .set({
            pctComissao1: String(pct1),
            rbm: String(rbmVal),
            pctComissao2: String(pct2),
            comissao: String(comissaoVal),
          })
          .where(eq(consorcios.id, r.id));

        if (rbmVal === 0 && comissaoVal === 0) zerados++;
        else calculados++;
      }

      return { calculados, zerados, total: registros.length };
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
