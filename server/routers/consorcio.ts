import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { consorcios, agentes, calculos } from "../../drizzle/schema";
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
        empresa: z.string().optional(),
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

      // ── REGRA 3: Buscar empresa pelo chaveJ no cadastro de agentes ──
      // Coletar todos os chaveJs únicos que precisam de empresa
      const todosChaveJs = Array.from(new Set(
        rows.filter(r => r.chaveJ && !r.empresa)
            .map(r => r.chaveJ!.toUpperCase())
      ));

      const empresaPorChaveJ = new Map<string, string>();
      if (todosChaveJs.length > 0) {
        const CHUNK_EMP = 200;
        for (let i = 0; i < todosChaveJs.length; i += CHUNK_EMP) {
          const chunk = todosChaveJs.slice(i, i + CHUNK_EMP);
          const found = await db.select({ chaveJ: agentes.chaveJ, empresa: agentes.empresa })
            .from(agentes)
            .where(sql`chaveJ IN (${sql.raw(chunk.map(c => `'${c.replace(/'/g, "''")}'`).join(','))})`);
          found.forEach(a => { if (a.chaveJ && a.empresa) empresaPorChaveJ.set(a.chaveJ.toUpperCase(), a.empresa.toUpperCase()); });
        }
      }

      // Enriquecer cada row com o agente correto
      const rowsEnriquecidos = rows.map(r => {
        if (!r.proposta) return r;
        let enriched = { ...r };

        if (r.parcLiberada === 'PARC1' && r.chaveJ) {
          // PARC1: buscar nome no cadastro
          const nomeDosCadastro = nomesPorChaveJ.get(r.chaveJ.toUpperCase());
          enriched = { ...enriched, chaveJ: r.chaveJ.toUpperCase(), nomeAgente: nomeDosCadastro || r.nomeAgente || '' };
        } else if (r.parcLiberada && r.parcLiberada !== 'PARC1') {
          // PARC2+: copiar da PARC1 da mesma proposta
          const parc1 = parc1NoBatch.get(r.proposta);
          if (parc1) {
            enriched = { ...enriched, chaveJ: parc1.chaveJ, nomeAgente: parc1.nomeAgente };
          }
        }

        // Buscar empresa pelo chaveJ se não veio no arquivo
        if (!enriched.empresa && enriched.chaveJ) {
          const empDoAgente = empresaPorChaveJ.get(enriched.chaveJ.toUpperCase());
          if (empDoAgente) enriched = { ...enriched, empresa: empDoAgente };
        }

        return enriched;
      });

      // Buscar registros existentes por proposta+parcLiberada+mesAno (chave composta real)
      const chaveExistentes = new Set<string>();
      const idPorChave = new Map<string, number>();

      if (rowsEnriquecidos.length > 0) {
        const propostasSet = new Set(rowsEnriquecidos.map(r => r.proposta).filter(Boolean) as string[]);
        const propostas = Array.from(propostasSet);
        const CHUNK = 500;
        for (let i = 0; i < propostas.length; i += CHUNK) {
          const chunk = propostas.slice(i, i + CHUNK);
          const found = await db
            .select({ id: consorcios.id, proposta: consorcios.proposta, parcLiberada: consorcios.parcLiberada, mesAno: consorcios.mesAno })
            .from(consorcios)
            .where(sql`proposta IN (${sql.raw(chunk.map(p => `'${p.replace(/'/g, "''")}'`).join(','))})`);
          found.forEach(r => {
            if (r.proposta && r.parcLiberada && r.mesAno) {
              const key = `${r.proposta}|${r.parcLiberada}|${r.mesAno}`;
              chaveExistentes.add(key);
              idPorChave.set(key, r.id);
            }
          });
        }
      }

      // Separar em inserções e atualizações
      const toInsert: typeof rowsEnriquecidos = [];
      const toUpdate: typeof rowsEnriquecidos = [];

      for (const row of rowsEnriquecidos) {
        if (!row.proposta) continue;
        // Calcular comissão: rbm * pctComissao1 (se disponíveis)
        if (row.rbm != null && row.pctComissao1 != null && !row.comissao) {
          row.comissao = Number(row.rbm) * Number(row.pctComissao1);
        }
        const key = `${row.proposta}|${row.parcLiberada ?? ''}|${row.mesAno ?? ''}`;
        if (chaveExistentes.has(key)) {
          // Sempre atualiza quando a combinação proposta+parcela+mês já existe
          toUpdate.push(row);
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
            .where(sql`proposta = ${r.proposta} AND parcLiberada = ${r.parcLiberada ?? ''} AND mesAno = ${r.mesAno ?? ''}`);
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

    // 4. Montar mapa de PARC1 com chaveJ
    const parc1Map = new Map<string, { chaveJ: string; nomeAgente: string }>();
    for (const p of parc1s) {
      if (p.proposta && p.chaveJ) {
        const nome = nomesPorChaveJ.get(p.chaveJ.toUpperCase()) || p.nomeAgente || '';
        parc1Map.set(p.proposta, { chaveJ: p.chaveJ.toUpperCase(), nomeAgente: nome });
      }
    }

    // 5. Para propostas sem PARC1, buscar qualquer parcela com chaveJ preenchido (a menor parcela)
    const todasComChaveJ = await db.select({
      proposta: consorcios.proposta,
      chaveJ: consorcios.chaveJ,
      nomeAgente: consorcios.nomeAgente,
    }).from(consorcios).where(sql`chaveJ IS NOT NULL AND chaveJ != '' AND chaveJ != 'NULL'`)
      .orderBy(asc(consorcios.parcLiberada));

    for (const r of todasComChaveJ) {
      if (r.proposta && r.chaveJ && !parc1Map.has(r.proposta)) {
        const nome = nomesPorChaveJ.get(r.chaveJ.toUpperCase()) || r.nomeAgente || '';
        parc1Map.set(r.proposta, { chaveJ: r.chaveJ.toUpperCase(), nomeAgente: nome });
      }
    }

    let atualizadosParcMais = 0;
    const propostas = Array.from(parc1Map.keys());
    for (const proposta of propostas) {
      const ref = parc1Map.get(proposta)!;
      try {
        // Atualizar apenas registros sem chaveJ preenchido
        await db.update(consorcios)
          .set({ chaveJ: ref.chaveJ, nomeAgente: ref.nomeAgente })
          .where(sql`proposta = '${sql.raw(proposta.replace(/'/g, "''"))}' AND (chaveJ IS NULL OR chaveJ = '' OR chaveJ = 'NULL')`);
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
      // Padrão
      pctPadraoDemais1: z.string().optional(),        // % Demais
      qtdPadraoDemaisParc1: z.string().optional(),    // Parc. Demais De
      qtdPadraoDemaisParc1Ate: z.string().optional(), // Parc. Demais Até
      pctPadraoDemais2: z.string().optional(),        // % Imóvel
      qtdPadraoImovelParc1: z.string().optional(),    // Parc. Imóvel De
      qtdPadraoImovelParc2: z.string().optional(),    // Parc. Imóvel Até
      // Especial
      pctEspecialDemais1: z.string().optional(),        // % Demais
      qtdEspecialDemaisParc1: z.string().optional(),    // Parc. Demais De
      qtdEspecialDemaisParc1Ate: z.string().optional(), // Parc. Demais Até
      pctEspecialDemais2: z.string().optional(),        // % Imóvel
      qtdEspecialImovelParc1: z.string().optional(),    // Parc. Imóvel De
      qtdEspecialImovelParc2: z.string().optional(),    // Parc. Imóvel Até
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

      // Helper: aceita vírgula ou ponto como separador decimal
      const parsePct = (v: string) => parseFloat((v || '0').replace(',', '.'));

      // Padrão
      const pctPadraoDemais    = parsePct(cfg['pctPadraoDemais1']       || '0') / 100;
      const parcPadraoDemaisDe = parseInt(cfg['qtdPadraoDemaisParc1']   || '1');
      const parcPadraoDemaisAte= parseInt(cfg['qtdPadraoDemaisParc1Ate']|| '0');
      const pctPadraoImovel    = parsePct(cfg['pctPadraoDemais2']       || '0') / 100;
      const parcPadraoImovelDe = parseInt(cfg['qtdPadraoImovelParc1']   || '1');
      const parcPadraoImovelAte= parseInt(cfg['qtdPadraoImovelParc2']   || '0');

      // Especial
      const pctEspecialDemais    = parsePct(cfg['pctEspecialDemais1']       || '0') / 100;
      const parcEspecialDemaisDe = parseInt(cfg['qtdEspecialDemaisParc1']   || '1');
      const parcEspecialDemaisAte= parseInt(cfg['qtdEspecialDemaisParc1Ate']|| '0');
      const pctEspecialImovel    = parsePct(cfg['pctEspecialDemais2']       || '0') / 100;
      const parcEspecialImovelDe = parseInt(cfg['qtdEspecialImovelParc1']   || '1');
      const parcEspecialImovelAte= parseInt(cfg['qtdEspecialImovelParc2']   || '0');

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
        // Extrai número da parcela (ex: "PARC3" → 3, "3" → 3)
        const parcNum = parseInt((r.parcLiberada ?? '').replace(/\D/g, '')) || 0;

        // Passo 1: verificar segmento
        const segUpper = (r.segmento ?? '').toUpperCase();
        const isImovel = segUpper.includes('IMOVEL') || segUpper.includes('IMÓVEL');

        // Passo 2: verificar se é agente especial
        const isEspecial = agentesEspeciais.has((r.chaveJ ?? '').toUpperCase());

        // Passo 3: selecionar percentual e intervalo de parcelas conforme segmento + tipo
        let pct2: number;
        let parcDe: number;
        let parcAte: number;

        if (isImovel) {
          pct2    = isEspecial ? pctEspecialImovel   : pctPadraoImovel;
          parcDe  = isEspecial ? parcEspecialImovelDe : parcPadraoImovelDe;
          parcAte = isEspecial ? parcEspecialImovelAte: parcPadraoImovelAte;
        } else {
          // DEMAIS
          pct2    = isEspecial ? pctEspecialDemais   : pctPadraoDemais;
          parcDe  = isEspecial ? parcEspecialDemaisDe : parcPadraoDemaisDe;
          parcAte = isEspecial ? parcEspecialDemaisAte: parcPadraoDemaisAte;
        }

        // Passo 4: verificar se a parcela está dentro do intervalo autorizado
        const dentroDoIntervalo = parcAte > 0 && parcNum >= parcDe && parcNum <= parcAte;
        const comissaoVal = dentroDoIntervalo ? +(valorBem * pct2).toFixed(2) : 0;
        const pct2Str = dentroDoIntervalo ? String(pct2) : '0';

        // Apenas pctComissao2 e comissao são calculados pelo sistema
        // pctComissao1 e rbm são fixos do Excel - não alterar
        await db.update(consorcios)
          .set({
            pctComissao2: pct2Str,
            comissao: String(comissaoVal),
          })
          .where(eq(consorcios.id, r.id));

        if (comissaoVal === 0) zerados++;
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

  // Enviar dados consolidados de consórcio para Financeiro → Cálculo
  enviarParaCalculo: protectedProcedure
    .input(z.object({
      ids: z.array(z.number()), // IDs dos registros selecionados
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Banco não disponível');
      if (input.ids.length === 0) throw new Error('Nenhum registro selecionado');

      // 1. Buscar os registros selecionados
      const registros = await db.select({
        chaveJ: consorcios.chaveJ,
        nomeAgente: consorcios.nomeAgente,
        empresa: consorcios.empresa,
        mesAno: consorcios.mesAno,
        comissao: consorcios.comissao,
        rbm: consorcios.rbm,
      }).from(consorcios).where(sql`${consorcios.id} IN (${sql.join(input.ids.map(id => sql`${id}`), sql`, `)})`);

      if (registros.length === 0) throw new Error('Nenhum registro encontrado');

      // 2. Agrupar por ChaveJ+MesAno: somar comissao (Comissão 2) e rbm
      const agrupado = new Map<string, {
        chaveJ: string;
        nomeAgente: string;
        empresa: string;
        mesAno: string;
        comissaoConsorcio: number;
        rbmTotal: number;
        qtd: number;
      }>();

      // Helper: converte "05/2026" ou "05/26" → "526", "426" → "426"
      const normalizarMes = (m: string): string => {
        if (!m) return m;
        // Formato MM/AAAA → MMAA (ex: "05/2026" → "526")
        const matchLong = m.match(/^(\d{1,2})\/(\d{4})$/);
        if (matchLong) {
          const mm = parseInt(matchLong[1], 10);
          const aa = matchLong[2].slice(2); // últimos 2 dígitos do ano
          return `${mm}${aa}`;
        }
        // Formato MM/AA → MMAA (ex: "05/26" → "526")
        const matchShort = m.match(/^(\d{1,2})\/(\d{2})$/);
        if (matchShort) {
          const mm = parseInt(matchShort[1], 10);
          return `${mm}${matchShort[2]}`;
        }
        return m; // já no formato correto (ex: "526", "426")
      };

      for (const r of registros) {
        const chave = (r.chaveJ ?? '').trim().toUpperCase();
        const mes = normalizarMes(r.mesAno ?? '');
        if (!chave) continue;
        const mapKey = `${chave}||${mes}`;
        const comissao = parseFloat((r.comissao ?? '0').replace(',', '.')) || 0;
        const rbm = parseFloat((r.rbm ?? '0').replace(',', '.')) || 0;
        if (agrupado.has(mapKey)) {
          const entry = agrupado.get(mapKey)!;
          entry.comissaoConsorcio += comissao;
          entry.rbmTotal += rbm;
          entry.qtd += 1;
        } else {
          agrupado.set(mapKey, {
            chaveJ: chave,
            nomeAgente: r.nomeAgente ?? '',
            empresa: r.empresa ?? '',
            mesAno: mes,
            comissaoConsorcio: comissao,
            rbmTotal: rbm,
            qtd: 1,
          });
        }
      }

      let inseridos = 0;
      let atualizados = 0;

      // 3. Para cada ChaveJ agrupada: upsert na tabela calculos
      for (const entry of Array.from(agrupado.values())) {
        // Verificar se já existe registro para esta ChaveJ + mês
        const existente = await db.select({ id: calculos.id })
          .from(calculos)
          .where(and(
            eq(calculos.chaveJ, entry.chaveJ),
            eq(calculos.mesRef, entry.mesAno)
          ))
          .limit(1);

        const comissaoStr = entry.comissaoConsorcio.toFixed(2);
        const rbmStr = entry.rbmTotal.toFixed(2);

        if (existente.length > 0) {
          // Já existe: atualiza apenas comissaoConsorcio e rbmConsorcioC2
          await db.update(calculos)
            .set({
              comissaoConsorcio: comissaoStr,
              rbmConsorcioC2: rbmStr,
            })
            .where(eq(calculos.id, existente[0].id));
          atualizados++;
        } else {
          // Não existe: insere nova linha
          await db.insert(calculos).values({
            mesRef: entry.mesAno,
            tipoPagamento: 'Comissão',
            empresa: entry.empresa,
            chaveJ: entry.chaveJ,
            nomeAgente: entry.nomeAgente,
            comissaoConsorcio: comissaoStr,
            rbmConsorcioC2: rbmStr,
          });
          inseridos++;
        }
      }

      return { ok: true, inseridos, atualizados, total: agrupado.size };
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
