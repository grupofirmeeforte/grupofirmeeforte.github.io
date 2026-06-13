import { z } from "zod";
import { protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { febraban, consignados, feriados, tabelasComissao, agentes, contratos } from "../../drizzle/schema";
import { eq, and, like, or, desc, asc, sql, isNotNull, isNull, ne } from "drizzle-orm";

// Converte número MESANO (ex: 202601) para string legível (ex: "01/2026")
export function mesanoToStr(mesano: number): string {
  const s = String(mesano).padStart(6, "0");
  const ano = s.slice(0, 4);
  const mes = s.slice(4, 6);
  return `${mes}/${ano}`;
}

export const febrabanRouter = {
  list: protectedProcedure
    .input(z.object({
      page: z.number().default(0),
      limit: z.number().default(100),
      search: z.string().optional(),
      empresa: z.string().optional(),
      mesano: z.number().optional(),
      mesanoInicio: z.number().optional(),
      mesanoFim: z.number().optional(),
      situacao: z.string().optional(),
      operador: z.string().optional(),
      pago: z.enum(["todos", "sim", "nao", "srcc"]).default("todos"),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const offset = input.page * input.limit;

      const conditions: any[] = [];
      if (input.search) {
        // Se filtro de operador já está ativo, busca só em proposta para evitar conflito
        if (input.operador && input.operador !== "__all__") {
          conditions.push(like(febraban.proposta, `%${input.search}%`));
        } else {
          conditions.push(
            or(
              like(febraban.proposta, `%${input.search}%`),
              like(febraban.operador, `%${input.search}%`),
            )
          );
        }
      }
      if (input.empresa && input.empresa !== "__all__") {
        conditions.push(eq(febraban.empresa, input.empresa));
      }
      if (input.mesanoInicio && input.mesanoFim) {
        conditions.push(sql`${febraban.mesano} >= ${input.mesanoInicio} AND ${febraban.mesano} <= ${input.mesanoFim}`);
      } else if (input.mesanoInicio) {
        conditions.push(sql`${febraban.mesano} >= ${input.mesanoInicio}`);
      } else if (input.mesanoFim) {
        conditions.push(sql`${febraban.mesano} <= ${input.mesanoFim}`);
      } else if (input.mesano) {
        conditions.push(eq(febraban.mesano, input.mesano));
      }
      if (input.situacao && input.situacao !== "__all__") {
        conditions.push(eq(febraban.situacao, input.situacao));
      }
      if (input.operador && input.operador !== "__all__") {
        conditions.push(eq(febraban.operador, input.operador));
      }
      // Filtro pago: "nao" = apenas não pagos, "sim" = apenas pagos, "srcc" = apenas SRCC (manual ou auto)
      if (input.pago === "nao") {
        // Não pago: pago manual=0, sem SRCC auto, sem consignado
        conditions.push(sql`
          ${febraban.pago} != 2
          AND NOT EXISTS (
            SELECT 1 FROM consignados c
            WHERE c.nrOperacao = ${febraban.proposta}
            AND LOWER(TRIM(c.restricaoSRCC)) = 'sim'
          )
          AND NOT EXISTS (
            SELECT 1 FROM consignados c
            WHERE c.nrOperacao = ${febraban.proposta}
          )
        `);
      } else if (input.pago === "sim") {
        // Pago: manual=1 OU (existe no consignado sem SRCC)
        conditions.push(sql`
          ${febraban.pago} = 1
          OR (
            ${febraban.pago} != 2
            AND NOT EXISTS (
              SELECT 1 FROM consignados c
              WHERE c.nrOperacao = ${febraban.proposta}
              AND LOWER(TRIM(c.restricaoSRCC)) = 'sim'
            )
            AND EXISTS (
              SELECT 1 FROM consignados c
              WHERE c.nrOperacao = ${febraban.proposta}
            )
          )
        `);
      } else if (input.pago === "srcc") {
        // SRCC: manual=2 OU auto via restricaoSRCC=Sim
        conditions.push(sql`
          ${febraban.pago} = 2
          OR EXISTS (
            SELECT 1 FROM consignados c
            WHERE c.nrOperacao = ${febraban.proposta}
            AND LOWER(TRIM(c.restricaoSRCC)) = 'sim'
          )
        `);
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const rows = await db
        .select({
          id: febraban.id,
          empresa: febraban.empresa,
          mesano: febraban.mesano,
          proposta: febraban.proposta,
          linha: febraban.linha,
          situacao: febraban.situacao,
          operador: febraban.operador,
          solicitacao: febraban.solicitacao,
          prazo: febraban.prazo,
          troco: febraban.troco,
          financiado: febraban.financiado,
          situacao2: febraban.situacao2,
          ordemExcel: febraban.ordemExcel,
          createdAt: febraban.createdAt,
          updatedAt: febraban.updatedAt,
          // pago: 2=SRCC, 1=Sim, 0=Não
          // Prioridade: manual (pago=1 ou pago=2) > auto SRCC (restricaoSRCC=Sim) > auto Sim (existe no consignado) > Não
          pagoManual: febraban.pago,
          pago: sql<number>`CASE
            WHEN ${febraban.pago} = 2 THEN 2
            WHEN ${febraban.pago} = 1 THEN 1
            WHEN EXISTS (
              SELECT 1 FROM consignados c
              WHERE c.nrOperacao = ${febraban.proposta}
              AND LOWER(TRIM(c.restricaoSRCC)) = 'sim'
            ) THEN 2
            WHEN EXISTS (
              SELECT 1 FROM consignados c
              WHERE c.nrOperacao = ${febraban.proposta}
            ) THEN 1
            ELSE 0
          END`,
        })
        .from(febraban)
        .where(where)
        .orderBy(
          sql`STR_TO_DATE(${febraban.solicitacao}, '%d/%m/%Y') DESC`,
          asc(febraban.empresa),
          asc(febraban.ordemExcel),
          desc(febraban.id)
        )
        .limit(input.limit)
        .offset(offset);

      return rows;
    }),

  count: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      empresa: z.string().optional(),
      mesano: z.number().optional(),
      mesanoInicio: z.number().optional(),
      mesanoFim: z.number().optional(),
      situacao: z.string().optional(),
      operador: z.string().optional(),
      pago: z.enum(["todos", "sim", "nao", "srcc"]).default("todos"),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return 0;

      const conditions: any[] = [];
      if (input.search) {
        if (input.operador && input.operador !== "__all__") {
          conditions.push(like(febraban.proposta, `%${input.search}%`));
        } else {
          conditions.push(
            or(
              like(febraban.proposta, `%${input.search}%`),
              like(febraban.operador, `%${input.search}%`),
            )
          );
        }
      }
      if (input.empresa && input.empresa !== "__all__") {
        conditions.push(eq(febraban.empresa, input.empresa));
      }
      if (input.mesanoInicio && input.mesanoFim) {
        conditions.push(sql`${febraban.mesano} >= ${input.mesanoInicio} AND ${febraban.mesano} <= ${input.mesanoFim}`);
      } else if (input.mesanoInicio) {
        conditions.push(sql`${febraban.mesano} >= ${input.mesanoInicio}`);
      } else if (input.mesanoFim) {
        conditions.push(sql`${febraban.mesano} <= ${input.mesanoFim}`);
      } else if (input.mesano) {
        conditions.push(eq(febraban.mesano, input.mesano));
      }
      if (input.situacao && input.situacao !== "__all__") {
        conditions.push(eq(febraban.situacao, input.situacao));
      }
      if (input.operador && input.operador !== "__all__") {
        conditions.push(eq(febraban.operador, input.operador));
      }
      if (input.pago === "nao") {
        conditions.push(sql`
          ${febraban.pago} != 2
          AND NOT EXISTS (
            SELECT 1 FROM consignados c
            WHERE c.nrOperacao = ${febraban.proposta}
            AND LOWER(TRIM(c.restricaoSRCC)) = 'sim'
          )
          AND NOT EXISTS (
            SELECT 1 FROM consignados c
            WHERE c.nrOperacao = ${febraban.proposta}
          )
        `);
      } else if (input.pago === "sim") {
        conditions.push(sql`
          ${febraban.pago} = 1
          OR (
            ${febraban.pago} != 2
            AND NOT EXISTS (
              SELECT 1 FROM consignados c
              WHERE c.nrOperacao = ${febraban.proposta}
              AND LOWER(TRIM(c.restricaoSRCC)) = 'sim'
            )
            AND EXISTS (
              SELECT 1 FROM consignados c
              WHERE c.nrOperacao = ${febraban.proposta}
            )
          )
        `);
      } else if (input.pago === "srcc") {
        conditions.push(sql`
          ${febraban.pago} = 2
          OR EXISTS (
            SELECT 1 FROM consignados c
            WHERE c.nrOperacao = ${febraban.proposta}
            AND LOWER(TRIM(c.restricaoSRCC)) = 'sim'
          )
        `);
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(febraban)
        .where(where);
      return Number(result[0]?.count ?? 0);
    }),

  // Exportar não pagos por empresa (todos os registros, sem paginação)
  naoPagos: protectedProcedure
    .input(z.object({
      empresa: z.string().optional(),
      mesano: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions: any[] = [
        sql`NOT EXISTS (SELECT 1 FROM consignados c WHERE c.nrOperacao = ${febraban.proposta})`,
      ];
      if (input.empresa && input.empresa !== "__all__") {
        conditions.push(eq(febraban.empresa, input.empresa));
      }
      if (input.mesano) {
        conditions.push(eq(febraban.mesano, input.mesano));
      }

      const rows = await db
        .select({
          empresa: febraban.empresa,
          mesano: febraban.mesano,
          proposta: febraban.proposta,
          linha: febraban.linha,
          situacao: febraban.situacao,
          operador: febraban.operador,
          solicitacao: febraban.solicitacao,
          prazo: febraban.prazo,
          troco: febraban.troco,
          financiado: febraban.financiado,
        })
        .from(febraban)
        .where(and(...conditions))
        .orderBy(
          sql`STR_TO_DATE(${febraban.solicitacao}, '%d/%m/%Y') DESC`,
          asc(febraban.empresa),
          asc(febraban.ordemExcel),
          desc(febraban.id)
        );

      return rows;
    }),

  // Exportar contratadas não pagas (situação Contratada + não está na produção consignado)
  contratatasNaoPagas: protectedProcedure
    .input(z.object({
      empresa: z.string().optional(),
      mesano: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions: any[] = [
        sql`NOT EXISTS (SELECT 1 FROM consignados c WHERE c.nrOperacao = ${febraban.proposta})`,
        eq(febraban.situacao, 'Contratada'),
      ];
      if (input.empresa && input.empresa !== '__all__') {
        conditions.push(eq(febraban.empresa, input.empresa));
      }
      if (input.mesano) {
        conditions.push(eq(febraban.mesano, input.mesano));
      }

      const rows = await db
        .select({
          empresa: febraban.empresa,
          mesano: febraban.mesano,
          proposta: febraban.proposta,
          linha: febraban.linha,
          situacao: febraban.situacao,
          operador: febraban.operador,
          solicitacao: febraban.solicitacao,
          prazo: febraban.prazo,
          troco: febraban.troco,
          financiado: febraban.financiado,
        })
        .from(febraban)
        .where(and(...conditions))
        .orderBy(
          sql`STR_TO_DATE(${febraban.solicitacao}, '%d/%m/%Y') DESC`,
          asc(febraban.empresa),
          desc(febraban.id)
        );

      return rows;
    }),

  // Importar registros:
  // modo "novo" = apenas adiciona registros que ainda não existem (por proposta)
  // modo "subscrever" = adiciona novos E atualiza existentes pelo número da proposta
  importar: protectedProcedure
    .input(z.object({
      modo: z.enum(["novo", "subscrever"]),
      offsetInicial: z.number().default(0), // offset para ordemExcel quando enviado em lotes
      registros: z.array(z.object({
        empresa: z.string().optional(),
        mesano: z.number().optional(),
        proposta: z.string(),
        linha: z.number().optional(),
        situacao: z.string().optional(),
        operador: z.string().optional(),
        solicitacao: z.string().optional(),
        prazo: z.string().optional(),
        troco: z.number().optional(),
        financiado: z.number().optional(),
        situacao2: z.string().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let adicionados = 0;
      let atualizados = 0;
      let ignorados = 0;

      const toStr = (v: number | undefined | null) => v != null ? String(v) : undefined;

      // Filtrar registros válidos
      const validos = input.registros
        .map((reg, idx) => ({ reg, idx }))
        .filter(({ reg }) => reg.proposta && reg.proposta.trim() !== "");

      ignorados += input.registros.length - validos.length;

      if (validos.length === 0) return { adicionados, atualizados, ignorados, total: input.registros.length };

      const todasPropostas = validos.map(({ reg }) => reg.proposta!.trim());

      // ── Calcular mesano automaticamente pela data de solicitação ──────────
      // Regra: dado uma data DD/MM/AAAA, determinar a qual mês de referência ela pertence
      // usando a lógica: último dia útil do mês anterior → penúltimo dia útil do mês atual
      const anosEnvolvidos = new Set<number>();
      for (const { reg } of validos) {
        if (reg.solicitacao) {
          const parts = reg.solicitacao.split('/');
          if (parts.length === 3) {
            const ano = parseInt(parts[2]);
            if (!isNaN(ano)) { anosEnvolvidos.add(ano); anosEnvolvidos.add(ano - 1); }
          }
        }
      }
      const feriadosImport = anosEnvolvidos.size > 0
        ? await db.select({ data: feriados.data }).from(feriados)
            .where(sql`ano IN (${sql.join(Array.from(anosEnvolvidos).map(a => sql`${a}`), sql`, `)}) AND tipo = 'nacional'`)
        : [];
      const feriadosSetImport = new Set(feriadosImport.map(f => f.data));

      const isUtilImport = (d: Date): boolean => {
        const dow = d.getDay();
        if (dow === 0 || dow === 6) return false;
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return !feriadosSetImport.has(`${dd}/${mm}/${yyyy}`);
      };

      // Dado uma data DD/MM/AAAA, retorna o mesano (ex: 626) do período vigente ao qual pertence
      const calcMesano = (solicitacaoStr: string): number | undefined => {
        const parts = solicitacaoStr.split('/');
        if (parts.length !== 3) return undefined;
        const dia = parseInt(parts[0]), mes = parseInt(parts[1]), ano = parseInt(parts[2]);
        if (isNaN(dia) || isNaN(mes) || isNaN(ano)) return undefined;
        const dataSolic = new Date(ano, mes - 1, dia);

        for (let delta = -1; delta <= 2; delta++) {
          let mesRef = mes + delta;
          let anoRef = ano;
          if (mesRef > 12) { mesRef -= 12; anoRef++; }
          if (mesRef < 1) { mesRef += 12; anoRef--; }

          const mesAnt = mesRef === 1 ? 12 : mesRef - 1;
          const anoAnt = mesRef === 1 ? anoRef - 1 : anoRef;

          // Último dia útil do mês anterior
          let cursor = new Date(anoAnt, mesAnt, 0);
          while (!isUtilImport(cursor)) cursor.setDate(cursor.getDate() - 1);
          const inicio = new Date(cursor); inicio.setHours(0, 0, 0, 0);

          // Penúltimo dia útil do mês atual
          cursor = new Date(anoRef, mesRef, 0);
          while (!isUtilImport(cursor)) cursor.setDate(cursor.getDate() - 1);
          cursor.setDate(cursor.getDate() - 1);
          while (!isUtilImport(cursor)) cursor.setDate(cursor.getDate() - 1);
          const fim = new Date(cursor); fim.setHours(23, 59, 59, 999);

          if (dataSolic >= inicio && dataSolic <= fim) {
            return parseInt(`${anoRef}${String(mesRef).padStart(2, '0')}`);
          }
        }
        return undefined;
      };

      // 1. Buscar consignados em batch (1 query)
      const consignadosMap = new Map<string, { srcc: boolean }>();
      const consignadosRows = await db
        .select({ nrOperacao: consignados.nrOperacao, restricaoSRCC: consignados.restricaoSRCC })
        .from(consignados)
        .where(sql`${consignados.nrOperacao} IN (${sql.join(todasPropostas.map(p => sql`${p}`), sql`, `)})`)

      for (const row of consignadosRows) {
        if (!row.nrOperacao) continue;
        const chave = row.nrOperacao.trim();
        const isSrcc = row.restricaoSRCC != null && row.restricaoSRCC.trim().toLowerCase() === 'sim';
        if (!consignadosMap.has(chave) || isSrcc) {
          consignadosMap.set(chave, { srcc: isSrcc });
        }
      }

      // 2. Buscar propostas existentes em batch (1 query)
      const existingRows = await db
        .select({ id: febraban.id, proposta: febraban.proposta, pago: febraban.pago })
        .from(febraban)
        .where(sql`${febraban.proposta} IN (${sql.join(todasPropostas.map(p => sql`${p}`), sql`, `)})`);

      const existingMap = new Map<string, { id: number; pago: number | null }>();
      for (const row of existingRows) {
        if (row.proposta) existingMap.set(row.proposta.trim(), { id: row.id, pago: row.pago ?? 0 });
      }

      // 3. Buscar empresa de cada operador no cadastro de agentes (em batch)
      const operadoresUnicos = Array.from(new Set(validos.map(({ reg }) => reg.operador?.trim().toUpperCase()).filter(Boolean))) as string[];
      const agentesEmpresaMap = new Map<string, string>();
      if (operadoresUnicos.length > 0) {
        const agentesRows = await db
          .select({ chaveJ: agentes.chaveJ, empresa: agentes.empresa })
          .from(agentes)
          .where(sql`UPPER(TRIM(${agentes.chaveJ})) IN (${sql.join(operadoresUnicos.map(o => sql`${o}`), sql`, `)})`)
        for (const a of agentesRows) {
          if (a.chaveJ && a.empresa) {
            agentesEmpresaMap.set(a.chaveJ.trim().toUpperCase(), a.empresa);
          }
        }
      }

      // 3. Separar em inserts e updates
      const toInsert: any[] = [];
      const toUpdate: Array<{ proposta: string; values: any }> = [];

      for (const { reg, idx } of validos) {
        const ordemExcel = input.offsetInicial + idx;
        const consigInfo = consignadosMap.get(reg.proposta!.trim());
        const pagoAuto = consigInfo ? (consigInfo.srcc ? 2 : 1) : 0;

        // Empresa: sempre buscar do cadastro de agentes pela chave J; fallback para o que veio na planilha
        const empresaCadastro = reg.operador ? agentesEmpresaMap.get(reg.operador.trim().toUpperCase()) : undefined;
        const values = {
          empresa: empresaCadastro ?? reg.empresa,
          mesano: reg.solicitacao ? (calcMesano(reg.solicitacao) ?? reg.mesano) : reg.mesano,
          linha: reg.linha,
          situacao: reg.situacao,
          operador: reg.operador,
          solicitacao: reg.solicitacao,
          prazo: reg.prazo,
          troco: toStr(reg.troco),
          financiado: toStr(reg.financiado),
          situacao2: reg.situacao2,
          ordemExcel,
          pago: pagoAuto,
        };

        const existing = existingMap.get(reg.proposta!.trim());
        if (existing) {
          if (input.modo === "subscrever") {
            const pagoAtual = existing.pago ?? 0;
            const pagoFinal = pagoAtual !== 0 ? pagoAtual : pagoAuto;
            toUpdate.push({ proposta: reg.proposta!.trim(), values: { ...values, pago: pagoFinal } });
            atualizados++;
          } else {
            ignorados++;
          }
        } else {
          toInsert.push({ ...values, proposta: reg.proposta!.trim() });
          adicionados++;
        }
      }

      // 4. Inserir em batch (1 query para todos os novos)
      if (toInsert.length > 0) {
        // Inserir em sub-lotes de 500 para evitar limite de parâmetros
        const SUB_BATCH = 500;
        for (let i = 0; i < toInsert.length; i += SUB_BATCH) {
          await db.insert(febraban).values(toInsert.slice(i, i + SUB_BATCH));
        }
      }

      // 5. Atualizar individualmente (updates precisam de WHERE por proposta)
      for (const { proposta, values } of toUpdate) {
        await db.update(febraban).set(values).where(eq(febraban.proposta, proposta));
      }

      return { adicionados, atualizados, ignorados, total: input.registros.length };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      empresa: z.string().optional(),
      mesano: z.number().optional(),
      proposta: z.string().optional(),
      linha: z.number().optional(),
      situacao: z.string().optional(),
      operador: z.string().optional(),
      solicitacao: z.string().optional(),
      prazo: z.string().optional(),
      troco: z.number().optional().nullable(),
      financiado: z.number().optional().nullable(),
      situacao2: z.string().optional(),
      pago: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, troco, financiado, pago, ...rest } = input;
      await db.update(febraban).set({
        ...rest,
        troco: troco != null ? String(troco) : undefined,
        financiado: financiado != null ? String(financiado) : undefined,
        ...(pago !== undefined ? { pago } : {}),
      }).where(eq(febraban.id, id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(febraban).where(eq(febraban.id, input.id));
      return { success: true };
    }),

  // Resumo por empresa: totais de líquido (troco) por dia anterior, dia atual, contratado, pendente e ano
  resumo: protectedProcedure
    .input(z.object({
      mesano: z.number().optional(), // filtro de mês/ano; se omitido usa o mês mais recente
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { empresas: [], mesanoAtual: null };

      // Determinar mesano a usar (por empresa, cada uma usa o seu mês mais recente)
      const inputMesano = input.mesano;

      // Data de hoje e último dia útil anterior no formato DD/MM/AAAA
      const pad = (n: number) => String(n).padStart(2, "0");
      const fmtDate = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
      const hoje = new Date();
      const hojeStr = fmtDate(hoje);

      // Buscar feriados do banco para os anos relevantes (ano atual e anterior)
      const anoAtual = hoje.getFullYear();
      const feriadosRows = await db
        .select({ data: feriados.data })
        .from(feriados)
        .where(sql`ano IN (${anoAtual - 1}, ${anoAtual})`);
      const feriadosSet = new Set(feriadosRows.map((f: any) => f.data as string));

      // Retroceder até encontrar o último dia útil (não é sáb/dom/feriado)
      const ultimoDiaUtil = (ref: Date): Date => {
        const d = new Date(ref);
        d.setDate(d.getDate() - 1);
        while (true) {
          const dow = d.getDay(); // 0=dom, 6=sáb
          const ds = fmtDate(d);
          if (dow !== 0 && dow !== 6 && !feriadosSet.has(ds)) break;
          d.setDate(d.getDate() - 1);
        }
        return d;
      };
      const ontem = ultimoDiaUtil(hoje);
      const ontemStr = fmtDate(ontem);

      const empresas = ["BMF", "FLEX"];
      const result = [];

      for (const emp of empresas) {
        // Determinar o mesano mais recente desta empresa
        // MESANO formato MMAA (ex: 626=jun/2026, 1225=dez/2025)
        // mesano agora usa formato AAAAMM (ex: 202606)
        let mesano: number | undefined = inputMesano;
        if (!mesano) {
          const latest = await db
            .select({ v: febraban.mesano })
            .from(febraban)
            .where(sql`empresa = ${emp} AND mesano IS NOT NULL`)
            .orderBy(sql`mesano DESC`)
            .limit(1);
          mesano = latest[0]?.v ?? undefined;
        }
        if (!mesano) continue;

        const anoFull = String(Math.floor(mesano / 100)); // ex: '2026'

        const baseWhere = sql`empresa = ${emp} AND mesano = ${mesano}`;
        // ANO: soma todos os meses do mesmo ano do mesano mais recente desta empresa
        const anoWhere = sql`empresa = ${emp} AND FLOOR(mesano / 100) = ${Math.floor(mesano / 100)}`;

        const [contratado, pendente, diaAtual, diaAnterior, ano,
               qtdContratado, qtdPendente, qtdDiaAtual, qtdDiaAnterior, qtdAno,
               srccValor, qtdSrcc, canceladasValor, qtdCanceladas] = await Promise.all([
          // Líquido contratado (situacao = Contratada)
          db.select({ total: sql<string>`COALESCE(SUM(CAST(troco AS DECIMAL(15,2))), 0)` })
            .from(febraban).where(sql`${baseWhere} AND situacao = 'Contratada'`),
          // Líquido pendente (situacao = Pendente)
          db.select({ total: sql<string>`COALESCE(SUM(CAST(troco AS DECIMAL(15,2))), 0)` })
            .from(febraban).where(sql`${baseWhere} AND situacao = 'Pendente'`),
          // Líquido do dia atual
          db.select({ total: sql<string>`COALESCE(SUM(CAST(troco AS DECIMAL(15,2))), 0)` })
            .from(febraban).where(sql`${baseWhere} AND solicitacao = ${hojeStr} AND situacao = 'Contratada'`),
          // Líquido do dia anterior
          db.select({ total: sql<string>`COALESCE(SUM(CAST(troco AS DECIMAL(15,2))), 0)` })
            .from(febraban).where(sql`${baseWhere} AND solicitacao = ${ontemStr} AND situacao = 'Contratada'`),
          // Líquido do ano
          db.select({ total: sql<string>`COALESCE(SUM(CAST(troco AS DECIMAL(15,2))), 0)` })
            .from(febraban).where(sql`${anoWhere} AND situacao = 'Contratada'`),
          // Contagem de operações contratadas
          db.select({ cnt: sql<number>`COUNT(*)` })
            .from(febraban).where(sql`${baseWhere} AND situacao = 'Contratada'`),
          // Contagem de operações pendentes
          db.select({ cnt: sql<number>`COUNT(*)` })
            .from(febraban).where(sql`${baseWhere} AND situacao = 'Pendente'`),
          // Contagem dia atual
          db.select({ cnt: sql<number>`COUNT(*)` })
            .from(febraban).where(sql`${baseWhere} AND solicitacao = ${hojeStr} AND situacao = 'Contratada'`),
          // Contagem dia anterior
          db.select({ cnt: sql<number>`COUNT(*)` })
            .from(febraban).where(sql`${baseWhere} AND solicitacao = ${ontemStr} AND situacao = 'Contratada'`),
          // Contagem do ano
          db.select({ cnt: sql<number>`COUNT(*)` })
            .from(febraban).where(sql`${anoWhere} AND situacao = 'Contratada'`),
          // SRCC: valor total do ANO VIGENTE (manual pago=2 OU auto via restricaoSRCC=Sim) usando financiado
          db.select({ total: sql<string>`COALESCE(SUM(CAST(financiado AS DECIMAL(15,2))), 0)` })
            .from(febraban).where(sql`${anoWhere} AND (
              pago = 2
              OR EXISTS (
                SELECT 1 FROM consignados c
                WHERE c.nrOperacao = proposta
                AND LOWER(TRIM(c.restricaoSRCC)) = 'sim'
              )
            )`),
          // SRCC: contagem do ANO VIGENTE (manual pago=2 OU auto via restricaoSRCC=Sim)
          db.select({ cnt: sql<number>`COUNT(*)` })
            .from(febraban).where(sql`${anoWhere} AND (
              pago = 2
              OR EXISTS (
                SELECT 1 FROM consignados c
                WHERE c.nrOperacao = proposta
                AND LOWER(TRIM(c.restricaoSRCC)) = 'sim'
              )
            )`),
          // Canceladas: valor troco do ANO VIGENTE
          db.select({ total: sql<string>`COALESCE(SUM(CAST(troco AS DECIMAL(15,2))), 0)` })
            .from(febraban).where(sql`${anoWhere} AND LOWER(situacao) LIKE '%cancel%'`),
          // Canceladas: contagem do ANO VIGENTE
          db.select({ cnt: sql<number>`COUNT(*)` })
            .from(febraban).where(sql`${anoWhere} AND LOWER(situacao) LIKE '%cancel%'`),
        ]);

        result.push({
          empresa: emp,
          contratado: Number(contratado[0]?.total ?? 0),
          pendente: Number(pendente[0]?.total ?? 0),
          diaAtual: Number(diaAtual[0]?.total ?? 0),
          diaAnterior: Number(diaAnterior[0]?.total ?? 0),
          ano: Number(ano[0]?.total ?? 0),
          qtdContratado: Number(qtdContratado[0]?.cnt ?? 0),
          qtdPendente: Number(qtdPendente[0]?.cnt ?? 0),
          qtdDiaAtual: Number(qtdDiaAtual[0]?.cnt ?? 0),
          qtdDiaAnterior: Number(qtdDiaAnterior[0]?.cnt ?? 0),
          qtdAno: Number(qtdAno[0]?.cnt ?? 0),
          srcc: Number(srccValor[0]?.total ?? 0),
          qtdSrcc: Number(qtdSrcc[0]?.cnt ?? 0),
          canceladas: Number(canceladasValor[0]?.total ?? 0),
          qtdCanceladas: Number(qtdCanceladas[0]?.cnt ?? 0),
          hojeStr,
          ontemStr,
          anoFull,
        });
      }

      return { empresas: result, mesanoAtual: inputMesano ?? null };
    }),

  // Perspectiva de Ganho: registros do usuário logado filtrados pela data do mês atual
  perspectiva: protectedProcedure
    .input(z.object({
      chaveJ: z.string().optional(),
      mes: z.number().optional(),
      ano: z.number().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // ChaveJ do usuário logado
      let chaveJLogado: string | null = null;
      // Agente logado via ChaveJ: openId = 'agente_123'
      if (ctx.user?.openId?.startsWith('agente_')) {
        const agenteId = parseInt(ctx.user.openId.replace('agente_', ''), 10);
        const [ag] = await db.select({ chaveJ: agentes.chaveJ })
          .from(agentes).where(eq(agentes.id, agenteId)).limit(1);
        if (ag?.chaveJ) chaveJLogado = ag.chaveJ.toUpperCase().trim();
      } else if (ctx.user?.email && ctx.user.email.includes('@')) {
        // Fallback para login OAuth com email
        chaveJLogado = ctx.user.email.split('@')[0].toUpperCase();
      }
      const chaveJ = input.chaveJ ?? chaveJLogado;

      // ── Calcular mês vigente: último dia útil do mês anterior → penúltimo dia útil do mês atual ──
      // "Dia útil" = segunda a sexta que NÃO seja feriado NACIONAL
      // Feriados municipais/estaduais são ignorados
      let dataInicio: Date;
      let dataFim: Date;

      // Determinar mês/ano de referência
      const agora = new Date();
      const mesRef = input.mes ?? (agora.getMonth() + 1);
      const anoRef = input.ano ?? agora.getFullYear();
      const mesAnteriorRef = mesRef === 1 ? 12 : mesRef - 1;
      const anoAnteriorRef = mesRef === 1 ? anoRef - 1 : anoRef;

      // Buscar apenas feriados NACIONAIS dos dois anos envolvidos
      const feriadosRows = await db
        .select({ data: feriados.data })
        .from(feriados)
        .where(sql`ano IN (${anoAnteriorRef}, ${anoRef}) AND tipo = 'nacional'`);
      const feriadosSet = new Set(feriadosRows.map(f => f.data)); // formato DD/MM/AAAA

      // Dia útil = seg a sex que não seja feriado nacional
      const isUtilDate = (d: Date): boolean => {
        const dow = d.getDay();
        if (dow === 0 || dow === 6) return false;
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return !feriadosSet.has(`${dd}/${mm}/${yyyy}`);
      };

      // Último dia útil do mês anterior
      const ultimoDiaMesAnterior = new Date(anoAnteriorRef, mesAnteriorRef, 0);
      let cursor = new Date(ultimoDiaMesAnterior);
      while (!isUtilDate(cursor)) { cursor.setDate(cursor.getDate() - 1); }
      dataInicio = new Date(cursor);
      dataInicio.setHours(0, 0, 0, 0);

      // Penúltimo dia útil do mês atual (mesRef)
      // Algoritmo: achar o último dia útil (seg-sex), depois recuar exatamente 1 dia útil
      const ultimoDiaMesAtual = new Date(anoRef, mesRef, 0);
      cursor = new Date(ultimoDiaMesAtual);
      while (!isUtilDate(cursor)) { cursor.setDate(cursor.getDate() - 1); } // último dia útil
      cursor.setDate(cursor.getDate() - 1); // recua 1 dia corrido
      while (!isUtilDate(cursor)) { cursor.setDate(cursor.getDate() - 1); } // penúltimo dia útil
      dataFim = new Date(cursor);
      dataFim.setHours(23, 59, 59, 999);

      // ── 1. Buscar contratos PDF do agente no período vigente ────────────────
      // Fonte principal: tabela contratos (PDFs enviados) — todos têm PDF (fileKey NOT NULL)
      // Filtrar pelo período vigente usando dataContrato (data real do contrato extraída do PDF)
      // Fallback: createdAt (data de importação) se dataContrato não estiver preenchido
      // Período vigente: dataInicio (último dia útil mês anterior) → dataFim (penúltimo dia útil mês atual)

      // Buscar contratos do agente sem filtro de data (filtro de período será aplicado após cruzar com Febraban)
      const contratoConditions: any[] = [];
      if (chaveJ) contratoConditions.push(sql`UPPER(TRIM(${contratos.chaveJOperador})) = ${chaveJ.toUpperCase().trim()}`);

      const contratoRows = await db
        .select({
          id: contratos.id,
          numeroProposta: contratos.numeroProposta,
          linhaCredito: contratos.linhaCredito,
          taxaMensalJuros: contratos.taxaMensalJuros,
          prazoMeses: contratos.prazoMeses,
          valorSolicitado: contratos.valorSolicitado,
          nomeCliente: contratos.nomeCliente,
          cpfCliente: contratos.cpfCliente,
          empresa: contratos.empresa,
          chaveJOperador: contratos.chaveJOperador,
          nomeOperador: contratos.nomeOperador,
          situacaoManual: contratos.situacao,
          dataContrato: contratos.dataContrato,
          createdAt: contratos.createdAt,
          telefoneManuais: contratos.telefoneManuais,
        })
        .from(contratos)
        .where(contratoConditions.length > 0 ? and(...contratoConditions) : undefined)
        .orderBy(desc(contratos.createdAt));

      // ── 1b. Buscar propostas que já estão na Produção Consignado (já foram pagas) ──
      // Se o nrOperacao do consignado bate com o numeroProposta do contrato, excluir da perspectiva
      const propostasContratos = contratoRows.map(r => r.numeroProposta).filter(Boolean) as string[];
      const propostasNoProdConsig = new Set<string>();
      if (propostasContratos.length > 0) {
        const consigRows = await db
          .select({ nrOperacao: consignados.nrOperacao })
          .from(consignados)
          .where(sql`TRIM(${consignados.nrOperacao}) IN (${sql.join(propostasContratos.map(p => sql`${p.trim()}`), sql`, `)})`);
        for (const c of consigRows) {
          if (c.nrOperacao) propostasNoProdConsig.add(c.nrOperacao.trim());
        }
      }

      // ── 2. Cruzar com Febraban para obter situação ──────────────────────────
      const propostas = contratoRows.map(r => r.numeroProposta).filter(Boolean) as string[];
      const febMap = new Map<string, { situacao: string; linha: string; prazo: string; troco: string; financiado: string; solicitacao: string }>();
      if (propostas.length > 0) {
        const febRows = await db
          .select({
            proposta: febraban.proposta,
            situacao: febraban.situacao,
            linha: febraban.linha,
            prazo: febraban.prazo,
            troco: febraban.troco,
            financiado: febraban.financiado,
            solicitacao: febraban.solicitacao,
          })
          .from(febraban)
          .where(sql`${febraban.proposta} IN (${sql.join(propostas.map(p => sql`${p}`), sql`, `)})`);
        for (const f of febRows) {
          if (f.proposta) febMap.set(f.proposta, {
            situacao: f.situacao ?? '',
            linha: String(f.linha ?? ''),
            prazo: f.prazo ?? '',
            troco: String(f.troco ?? ''),
            financiado: String(f.financiado ?? ''),
            solicitacao: f.solicitacao ?? '',
          });
        }
      }

      // ── 3. Buscar ativo do agente ───────────────────────────────────────────
      let ativoCol: string = 'ativo03';
      if (chaveJ) {
        const agenteRow = await db
          .select({ situacao: agentes.situacao })
          .from(agentes)
          .where(sql`UPPER(TRIM(${agentes.chaveJ})) = ${chaveJ.toUpperCase().trim()}`)
          .limit(1);
        if (agenteRow.length > 0 && agenteRow[0].situacao) {
          const sit = agenteRow[0].situacao;
          const m = sit.match(/(\d{1,2})/);
          if (m) {
            const num = parseInt(m[1]);
            ativoCol = `ativo${String(num).padStart(2, '0')}`;
          }
        }
      }

      // ── 4. Buscar todas as linhas da tabela de comissões ───────────────────
      const todasTabelas = await db.select().from(tabelasComissao);

      // ── 5. Funções de cálculo ───────────────────────────────────────────────
      const parsePct = (v: any): number => {
        if (v == null) return 0;
        const s = String(v).replace(',', '.').replace('%', '').trim();
        return parseFloat(s) || 0;
      };

      // Normaliza string removendo acentos para comparacao
      const normStr = (s: string): string =>
        s.toUpperCase().trim()
         .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      // Verifica se um valor bate com um campo que pode ter multiplos nomes separados por "/" ou ","
      // Ex: empresa "BMF / FLEX" bate com "BRASIL MAIS FORTE LTDA" (contém BMF)
      const bateMultiNome = (valor: string, campo: string): boolean => {
        const valorNorm = normStr(valor);
        const partes = campo.split(/[/,]/).map(p => normStr(p)).filter(p => p.length > 0);
        return partes.some(parte => {
          return valorNorm === parte || valorNorm.includes(parte) || parte.includes(valorNorm);
        });
      };

      const buscarPercentual = (produto: string, juros: number, parcela: number, empresaContrato: string): number | null => {
        for (const tab of todasTabelas) {
          const conv = (tab.convenio ?? '').trim();
          const tabEmpresa = (tab.empresa ?? '').trim();

          // Se a empresa da tabela esta definida, verificar se bate com a empresa do contrato
          if (tabEmpresa !== '' && empresaContrato !== '') {
            if (!bateMultiNome(empresaContrato, tabEmpresa)) continue;
          }

          // Se o convenio esta definido, verificar se o produto bate
          if (conv !== '') {
            if (!bateMultiNome(produto, conv)) continue;
          }

          // Verificar taxa de juros (tabela em decimal, ex: 0.0185)
          const jDe = parsePct(tab.txJurosDe);
          const jAte = parsePct(tab.txJurosAte);
          if (jAte > 0 && juros > 0 && (juros < jDe - 0.0001 || juros > jAte + 0.0001)) continue;

          // Verificar prazo — OBRIGATORIO respeitar mesesDe e mesesAte
          const mDe = parseInt(String(tab.mesesDe ?? 0)) || 0;
          const mAte = parseInt(String(tab.mesesAte ?? '999')) || 999;
          if (parcela < mDe || parcela > mAte) continue;

          const pct = parsePct((tab as any)[ativoCol]);
          if (pct > 0) return pct;
        }

        // Nenhuma linha da tabela bateu — sem comissao para este produto/prazo
        return null;
      };

      // ── 6. Filtrar contratos pelo período vigente usando data do Febraban ou dataContrato ──
      // Prioridade: data de solicitação do Febraban > dataContrato do PDF > createdAt (importação)
      const parseDateBR = (s: string): Date | null => {
        if (!s) return null;
        const parts = s.split('/');
        if (parts.length === 3) {
          const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
          if (!isNaN(d.getTime())) return d;
        }
        return null;
      };

      const contratoRowsFiltrados = contratoRows.filter(r => {
        const proposta = (r.numeroProposta ?? '').trim();
        // Excluir contratos já na Produção Consignado
        if (propostasNoProdConsig.has(proposta)) return false;

        // Determinar a data de referência do contrato
        const febData = febMap.get(proposta);
        let dataRef: Date | null = null;

        if (febData?.solicitacao) {
          // 1ª prioridade: data de solicitação do Febraban
          dataRef = parseDateBR(febData.solicitacao);
        }
        if (!dataRef && r.dataContrato) {
          // 2ª prioridade: data do contrato extraída do PDF
          dataRef = parseDateBR(String(r.dataContrato));
          if (!dataRef) dataRef = new Date(r.dataContrato as any);
        }
        if (!dataRef && r.createdAt) {
          // 3ª prioridade: data de importação
          dataRef = new Date(r.createdAt as any);
        }

        if (!dataRef) return false;
        dataRef.setHours(12, 0, 0, 0); // normalizar para meio-dia para evitar problemas de timezone
        return dataRef >= dataInicio && dataRef <= dataFim;
      });

      const result = contratoRowsFiltrados.map(r => {
        const febData = febMap.get(r.numeroProposta ?? '');
        // Situação: prioridade Febraban > manual no contrato > 'Pendente'
        const situacao = febData?.situacao || r.situacaoManual || 'Pendente';

        // Ignorar cancelados e pendentes
        const isContratada = situacao.trim().toLowerCase() === 'contratada';

        const jurosRaw = parseFloat(String(r.taxaMensalJuros ?? 0));
        // taxaMensalJuros já está em % (ex: 1.85), normalizar para decimal
        const jurosNorm = jurosRaw > 1 ? jurosRaw / 100 : jurosRaw;
        const parcela = r.prazoMeses ?? 0;
        const produto = r.linhaCredito ?? '';
        const valorLiquido = parseFloat(String(r.valorSolicitado ?? 0));
        const temTelefone = !!(r.telefoneManuais && r.telefoneManuais.trim());

        let perspectivaComissao: number | null = null;
        let percentualUsado: number | null = null;

        const empresaContrato = r.empresa ?? '';
        // Comissão só é calculada se: contratada E tem telefone preenchido
        if (isContratada && valorLiquido > 0 && temTelefone) {
          const pct = buscarPercentual(produto, jurosNorm, parcela, empresaContrato);
          percentualUsado = pct;
          // pct já é decimal (ex: 0.0082 = 0,82%), multiplicar direto pelo valor líquido
          perspectivaComissao = pct != null ? +(valorLiquido * pct).toFixed(2) : null;
        }

        return {
          id: r.id,
          proposta: r.numeroProposta ?? '',
          linha: febData?.linha ?? r.linhaCredito ?? '',
          situacao,
          chaveJOperador: r.chaveJOperador ?? '',
          operador: r.chaveJOperador ?? '',
          nomeOperador: r.nomeOperador ?? '',
          nomeCliente: r.nomeCliente ?? '',
          cpfCliente: r.cpfCliente ?? '',
          solicitacao: febData?.solicitacao ?? (r.createdAt ? new Date(r.createdAt).toLocaleDateString('pt-BR') : ''),
          prazo: febData?.prazo ?? (parcela ? `${parcela} meses` : ''),
          troco: febData?.troco ?? String(valorLiquido),
          financiado: febData?.financiado ?? String(valorLiquido),
          empresa: r.empresa ?? '',
          produtoConsig: produto,
          taxaJuros: jurosRaw,
          prazoMeses: parcela,
          valorSolicitado: valorLiquido,
          ativoCol,
          perspectivaComissao,
          percentualUsado,
          temPdf: true,
          temFebraban: !!febData,
          telefoneManuais: r.telefoneManuais ?? '',
          temTelefone,
        };
      });

      // Formatar datas do período vigente para exibição
      const fmtData = (d: Date) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
      return {
        rows: result,
        chaveJ: chaveJ ?? '',
        ativoCol,
        periodoInicio: fmtData(dataInicio),
        periodoFim: fmtData(dataFim),
        mesRef,
        anoRef,
      };
    }),

  // Produção do Mês: busca direto do Febraban por ChaveJ e período vigente
  producaoMes: protectedProcedure
    .input(z.object({
      chaveJ: z.string().optional(),
      mes: z.number().optional(),
      ano: z.number().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // ChaveJ do usuário logado
      let chaveJLogado: string | null = null;
      if (ctx.user?.openId?.startsWith('agente_')) {
        const agenteId = parseInt(ctx.user.openId.replace('agente_', ''), 10);
        const [ag] = await db.select({ chaveJ: agentes.chaveJ })
          .from(agentes).where(eq(agentes.id, agenteId)).limit(1);
        if (ag?.chaveJ) chaveJLogado = ag.chaveJ.toUpperCase().trim();
      } else if (ctx.user?.email && ctx.user.email.includes('@')) {
        chaveJLogado = ctx.user.email.split('@')[0].toUpperCase();
      }
      const chaveJ = input.chaveJ ?? chaveJLogado;

      // Período vigente: último dia útil do mês anterior → penúltimo dia útil do mês atual
      const agora = new Date();
      const mesRef = input.mes ?? (agora.getMonth() + 1);
      const anoRef = input.ano ?? agora.getFullYear();
      const mesAnteriorRef = mesRef === 1 ? 12 : mesRef - 1;
      const anoAnteriorRef = mesRef === 1 ? anoRef - 1 : anoRef;

      const feriadosRows = await db
        .select({ data: feriados.data })
        .from(feriados)
        .where(sql`ano IN (${anoAnteriorRef}, ${anoRef}) AND tipo = 'nacional'`);
      const feriadosSet = new Set(feriadosRows.map(f => f.data));

      const isUtilDate = (d: Date): boolean => {
        const dow = d.getDay();
        if (dow === 0 || dow === 6) return false;
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return !feriadosSet.has(`${dd}/${mm}/${yyyy}`);
      };

      // Último dia útil do mês anterior
      let cursor = new Date(anoAnteriorRef, mesAnteriorRef, 0);
      while (!isUtilDate(cursor)) { cursor.setDate(cursor.getDate() - 1); }
      const dataInicio = new Date(cursor);
      dataInicio.setHours(0, 0, 0, 0);

      // Penúltimo dia útil do mês atual
      cursor = new Date(anoRef, mesRef, 0);
      while (!isUtilDate(cursor)) { cursor.setDate(cursor.getDate() - 1); }
      cursor.setDate(cursor.getDate() - 1);
      while (!isUtilDate(cursor)) { cursor.setDate(cursor.getDate() - 1); }
      const dataFim = new Date(cursor);
      dataFim.setHours(23, 59, 59, 999);

      const fmtData = (d: Date) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;

      // Parsear data no formato DD/MM/YYYY
      const parseDateBR2 = (s: string): Date | null => {
        if (!s) return null;
        const m = s.match(/(\d{2})[\/\.](\d{2})[\/\.](\d{4})/);
        if (!m) return null;
        const d = new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]));
        return isNaN(d.getTime()) ? null : d;
      };

      // Buscar registros do Febraban no período vigente
      const conditions: any[] = [];
      if (chaveJ) conditions.push(sql`UPPER(TRIM(${febraban.operador})) = ${chaveJ.toUpperCase().trim()}`);

      const febRows = await db
        .select({
          id: febraban.id,
          proposta: febraban.proposta,
          linha: febraban.linha,
          situacao: febraban.situacao,
          operador: febraban.operador,
          solicitacao: febraban.solicitacao,
          prazo: febraban.prazo,
          troco: febraban.troco,
          financiado: febraban.financiado,
          empresa: febraban.empresa,
        })
        .from(febraban)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(febraban.solicitacao));

      // Filtrar pelo período vigente usando a data de solicitação
      const rowsFiltrados = febRows.filter(r => {
        const dataRef = parseDateBR2(r.solicitacao ?? '');
        if (!dataRef) return false;
        dataRef.setHours(12, 0, 0, 0);
        return dataRef >= dataInicio && dataRef <= dataFim;
      });

      // Buscar nome do agente
      let nomeAgente = '';
      if (chaveJ) {
        const [ag] = await db.select({ nomeAgente: agentes.nomeAgente })
          .from(agentes)
          .where(sql`UPPER(TRIM(${agentes.chaveJ})) = ${chaveJ.toUpperCase().trim()}`)
          .limit(1);
        if (ag?.nomeAgente) nomeAgente = ag.nomeAgente;
      }

      const rows = rowsFiltrados.map(r => ({
        id: r.id,
        proposta: r.proposta ?? '',
        convenio: String(r.linha ?? ''),
        linha: String(r.linha ?? ''),
        situacao: r.situacao ?? 'Pendente',
        operador: r.operador ?? '',
        solicitacao: r.solicitacao ?? '',
        prazo: r.prazo ?? '',
        troco: String(r.troco ?? '0'),
        financiado: String(r.financiado ?? '0'),
        empresa: r.empresa ?? '',
      }));

      return {
        rows,
        chaveJ: chaveJ ?? '',
        nomeAgente,
        periodoInicio: fmtData(dataInicio),
        periodoFim: fmtData(dataFim),
        mesRef,
        anoRef,
        total: rows.length,
        totalFinanciado: rows.reduce((acc, r) => acc + parseFloat(r.financiado || '0'), 0),
      };
    }),

    // Acompanhamento Diário: produção por agente por dia no mês selecionado
  acompanhamentoDiario: protectedProcedure
    .input(z.object({
      empresa: z.enum(['BMF', 'FLEX', 'TODAS']),
      mes: z.number().min(1).max(12),
      ano: z.number().min(2025),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { agentes: [], dias: [], totalPorDia: {} };

      const { agentes: agentesTable } = await import('../../drizzle/schema');

      // Calcular mesano no formato usado na Febraban (ex: 526 para maio/2026)
      const mesano = input.ano * 100 + input.mes; // formato AAAAMM ex: 202606
      const isTodas = input.empresa === 'TODAS';

      // Buscar operadores únicos da Febraban para este mesano e empresa
      const operadoresFebraban = await db
        .selectDistinct({ operador: febraban.operador })
        .from(febraban)
        .where(isTodas
          ? sql`mesano = ${mesano} AND operador IS NOT NULL AND operador != ''`
          : sql`empresa = ${input.empresa} AND mesano = ${mesano} AND operador IS NOT NULL AND operador != ''`)
        .orderBy(asc(febraban.operador));

      const operadorList = operadoresFebraban.map(r => r.operador).filter(Boolean) as string[];
      if (operadorList.length === 0) return { agentes: [], dias: [], totalPorDia: {} };

      // Buscar dados dos agentes no cadastro
      const agentesInfo = await db
        .select({ chaveJ: agentesTable.chaveJ, nomeAgente: agentesTable.nomeAgente, situacao: agentesTable.situacao })
        .from(agentesTable)
        .where(sql`chaveJ IN (${sql.raw(operadorList.map(o => `'${o.replace(/'/g, "''")}'`).join(','))})`);

      const agentesMap = new Map(agentesInfo.map(a => [a.chaveJ?.toUpperCase(), a]));

      // Calcular dias do mês (apenas dias úteis: seg-sex, sem sábado e domingo)
      const daysInMonth = new Date(input.ano, input.mes, 0).getDate();
      const dias: number[] = Array.from({ length: daysInMonth }, (_, i) => i + 1)
        .filter(d => { const dow = new Date(input.ano, input.mes - 1, d).getDay(); return dow !== 0 && dow !== 6; });

      // Buscar produção por operador e dia (apenas Contratadas)
      const producaoRows = await db
        .select({
          operador: febraban.operador,
          solicitacao: febraban.solicitacao,
          troco: febraban.troco,
        })
        .from(febraban)
        .where(isTodas
          ? sql`mesano = ${mesano} AND situacao = 'Contratada' AND operador IS NOT NULL`
          : sql`empresa = ${input.empresa} AND mesano = ${mesano} AND situacao = 'Contratada' AND operador IS NOT NULL`);

      // Montar mapa: operador -> dia -> soma troco
      const prodMap = new Map<string, Map<number, number>>();
      const totalPorDia: Record<number, number> = {};

      for (const row of producaoRows) {
        if (!row.operador || !row.solicitacao) continue;
        const op = row.operador.toUpperCase();
        // Parse DD/MM/YYYY
        const parts = String(row.solicitacao).split('/');
        if (parts.length < 3) continue;
        const dia = parseInt(parts[0], 10);
        const mes = parseInt(parts[1], 10);
        const ano = parseInt(parts[2], 10);
        if (mes !== input.mes || ano !== input.ano) continue;
        const valor = parseFloat(String(row.troco ?? 0)) || 0;

        if (!prodMap.has(op)) prodMap.set(op, new Map());
        const diaMap = prodMap.get(op)!;
        diaMap.set(dia, (diaMap.get(dia) ?? 0) + valor);

        totalPorDia[dia] = (totalPorDia[dia] ?? 0) + valor;
      }

      // Calcular dias úteis do mês (seg-sex, excluindo APENAS feriados nacionais)
      // Feriados municipais e estaduais NÃO são descontados dos dias úteis
      const feriadosRows = await db
        .select({ data: feriados.data, nome: feriados.nome })
        .from(feriados)
        .where(sql`MONTH(STR_TO_DATE(data, '%d/%m/%Y')) = ${input.mes} AND YEAR(STR_TO_DATE(data, '%d/%m/%Y')) = ${input.ano} AND tipo = 'nacional'`);
      const feriadosSet = new Set<number>();
      const feriadosNome: Record<number, string> = {};
      for (const f of feriadosRows) {
        const p = String(f.data).split('/');
        if (p.length === 3) {
          const dia = parseInt(p[0], 10);
          feriadosSet.add(dia);
          // Usa o primeiro nome encontrado para o dia (pode haver múltiplos feriados no mesmo dia)
          if (!feriadosNome[dia]) feriadosNome[dia] = f.nome;
        }
      }

      let diasUteisTotal = 0;
      for (const d of dias) {
        const dow = new Date(input.ano, input.mes - 1, d).getDay();
        if (dow !== 0 && dow !== 6 && !feriadosSet.has(d)) diasUteisTotal++;
      }

      // Montar resultado por agente
      const agentesResult = operadorList.map(op => {
        const opUpper = op.toUpperCase();
        const diaMap = prodMap.get(opUpper) ?? new Map<number, number>();
        const info = agentesMap.get(opUpper);

        const producaoPorDia: Record<number, number> = {};
        let total = 0;
        let diasComProducao = 0;

        for (const d of dias) {
          const dow = new Date(input.ano, input.mes - 1, d).getDay();
          const isUtil = dow !== 0 && dow !== 6 && !feriadosSet.has(d);
          const val = diaMap.get(d) ?? 0;
          producaoPorDia[d] = val;
          total += val;
          if (val > 0 && isUtil) diasComProducao++;
        }

        const diasSemProducao = diasUteisTotal - diasComProducao;
        const aproveitamento = diasUteisTotal > 0 ? diasComProducao / diasUteisTotal : 0;
        const mediaPorDiaUtil = diasComProducao > 0 ? total / diasComProducao : 0;

        return {
          chaveJ: op,
          nome: info?.nomeAgente ?? op,
          situacao: info?.situacao ?? 'Ativo',
          total,
          diasComProducao,
          diasSemProducao,
          diasUteisTotal,
          aproveitamento,
          mediaPorDiaUtil,
          producaoPorDia,
        };
      });

       // Ordenar por total decrescente
      agentesResult.sort((a, b) => b.total - a.total);
      return { agentes: agentesResult, dias, totalPorDia, diasUteisTotal, feriadosNome };
    }),

  // ─── GRÁFICOS DE PRODUÇÃO BB ─────────────────────────────────────────────
  // Gráfico por período e por ChaveJ (valor líquido - troco - Contratadas)
  graficoPorPeriodo: protectedProcedure
    .input(z.object({
      periodo: z.enum(['bimestre', 'trimestre', 'semestre', 'ano']),
      empresa: z.string().optional(),
      ano: z.number().optional(), // filtro de ano (ex: 2025, 2026)
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { series: [], labels: [], agentes: [], anos: [] };
      // Buscar todos os anos disponíveis para popular o seletor
      const anosRows = await db
        .selectDistinct({ mesano: febraban.mesano })
        .from(febraban)
        .where(and(
          eq(febraban.situacao, 'Contratada'),
          input.empresa ? eq(febraban.empresa, input.empresa) : sql`1=1`
        ));
      const parseMesano = (m: number) => { const s = String(m).padStart(6, '0'); return { mes: parseInt(s.slice(4, 6)), ano: parseInt(s.slice(0, 4)) }; };
      const anosSet = new Set<number>();
      for (const r of anosRows) { if (r.mesano) { const { ano } = parseMesano(r.mesano); anosSet.add(ano); } }
      const anos = Array.from(anosSet).sort((a, b) => b - a);
      // Determinar ano efetivo: usa o fornecido ou o mais recente
      const anoEfetivo = input.ano ?? (anos[0] ?? new Date().getFullYear());
      const rows = await db
        .select({ mesano: febraban.mesano, operador: febraban.operador, troco: febraban.troco })
        .from(febraban)
        .where(and(
          eq(febraban.situacao, 'Contratada'),
          input.empresa ? eq(febraban.empresa, input.empresa) : sql`1=1`,
          sql`FLOOR(${febraban.mesano} / 100) = ${anoEfetivo}`
        ));
      const getLabel = (m: number) => { const { mes } = parseMesano(m); if (input.periodo === 'bimestre') return `${Math.ceil(mes / 2)}º Bim`; if (input.periodo === 'trimestre') return `${Math.ceil(mes / 3)}º Tri`; if (input.periodo === 'semestre') return `${mes <= 6 ? 1 : 2}º Sem`; return String(anoEfetivo); };
      const getOrder = (m: number) => { const { mes } = parseMesano(m); if (input.periodo === 'bimestre') return Math.ceil(mes / 2); if (input.periodo === 'trimestre') return Math.ceil(mes / 3); if (input.periodo === 'semestre') return mes <= 6 ? 1 : 2; return 1; };
      const mapaAgente: Record<string, Record<string, number>> = {};
      const periodosOrder: Record<string, number> = {};
      for (const row of rows) {
        if (!row.mesano || !row.operador) continue;
        const label = getLabel(row.mesano);
        periodosOrder[label] = getOrder(row.mesano);
        const ag = row.operador.trim();
        if (!mapaAgente[ag]) mapaAgente[ag] = {};
        mapaAgente[ag][label] = (mapaAgente[ag][label] ?? 0) + (parseFloat(String(row.troco ?? '0')) || 0);
      }
      const labels = Object.keys(periodosOrder).sort((a, b) => periodosOrder[a] - periodosOrder[b]);
      const agentes = Object.keys(mapaAgente).sort((a, b) => Object.values(mapaAgente[b]).reduce((s, v) => s + v, 0) - Object.values(mapaAgente[a]).reduce((s, v) => s + v, 0));
      // total = soma do ano selecionado (todos os períodos do ano)
      const series = agentes.map(ag => ({ name: ag, data: labels.map(l => Math.round((mapaAgente[ag][l] ?? 0) * 100) / 100), total: Math.round(Object.values(mapaAgente[ag]).reduce((s, v) => s + v, 0) * 100) / 100 }));
      return { series, labels, agentes, anos };
    }),

  // Gráfico geral por tipo de operação (Financ. Novo / Troco-Refin / Cancelado)
  graficoPorTipo: protectedProcedure
    .input(z.object({
      periodo: z.enum(['bimestre', 'trimestre', 'semestre', 'ano']),
      empresa: z.string().optional(),
      ano: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { data: [], labels: [] };
      const parseMesano = (m: number) => { const s = String(m).padStart(6, '0'); return { mes: parseInt(s.slice(4, 6)), ano: parseInt(s.slice(0, 4)) }; };
      // Determinar ano efetivo
      const anosRows = await db.selectDistinct({ mesano: febraban.mesano }).from(febraban).where(input.empresa ? eq(febraban.empresa, input.empresa) : sql`1=1`);
      const anosSet = new Set<number>(); for (const r of anosRows) { if (r.mesano) { const { ano } = parseMesano(r.mesano); anosSet.add(ano); } }
      const anos = Array.from(anosSet).sort((a, b) => b - a);
      const anoEfetivo = input.ano ?? (anos[0] ?? new Date().getFullYear());
      const rows = await db
        .select({ mesano: febraban.mesano, situacao: febraban.situacao, troco: febraban.troco, financiado: febraban.financiado })
        .from(febraban)
        .where(and(
          input.empresa ? eq(febraban.empresa, input.empresa) : sql`1=1`,
          sql`FLOOR(${febraban.mesano} / 100) = ${anoEfetivo}`
        ));
      const getLabel = (m: number) => { const { mes } = parseMesano(m); if (input.periodo === 'bimestre') return `${Math.ceil(mes / 2)}º Bim`; if (input.periodo === 'trimestre') return `${Math.ceil(mes / 3)}º Tri`; if (input.periodo === 'semestre') return `${mes <= 6 ? 1 : 2}º Sem`; return String(anoEfetivo); };
      const getOrder = (m: number) => { const { mes } = parseMesano(m); if (input.periodo === 'bimestre') return Math.ceil(mes / 2); if (input.periodo === 'trimestre') return Math.ceil(mes / 3); if (input.periodo === 'semestre') return mes <= 6 ? 1 : 2; return 1; };
      const mapa: Record<string, { novo: number; refin: number; cancelado: number }> = {};
      const periodosOrder: Record<string, number> = {};
      for (const row of rows) {
        if (!row.mesano) continue;
        const label = getLabel(row.mesano);
        periodosOrder[label] = getOrder(row.mesano);
        if (!mapa[label]) mapa[label] = { novo: 0, refin: 0, cancelado: 0 };
        const t = Math.round((parseFloat(String(row.troco ?? '0').replace(',', '.')) || 0) * 100);
        const f = Math.round((parseFloat(String(row.financiado ?? '0').replace(',', '.')) || 0) * 100);
        const val = parseFloat(String(row.troco ?? '0')) || 0;
        if (row.situacao && row.situacao.toLowerCase().includes('cancel')) mapa[label].cancelado += val;
        else if (t === f) mapa[label].novo += val;
        else mapa[label].refin += val;
      }
      const labels = Object.keys(mapa).sort((a, b) => (periodosOrder[a] ?? 0) - (periodosOrder[b] ?? 0));
      const data = labels.map(label => ({ periodo: label, novo: Math.round(mapa[label].novo * 100) / 100, refin: Math.round(mapa[label].refin * 100) / 100, cancelado: Math.round(mapa[label].cancelado * 100) / 100 }));
      return { data, labels };
    }),

  // Retorna valores únicos para filtros
  // Relatório por Chave J: Trimestre/Semestre/Ano Valores e Operações, por Tipo OP
  relatorioChaveJ: protectedProcedure
    .input(z.object({
      ano: z.number().optional(), // ano de referência; se omitido usa o mais recente
      empresa: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { rows: [], ano: null };

      // Determinar o ano de referência
      let anoRef = input.ano;
      if (!anoRef) {
        const latest = await db
          .select({ v: febraban.mesano })
          .from(febraban)
          .where(sql`mesano IS NOT NULL${input.empresa ? sql` AND empresa = ${input.empresa}` : sql``}`)
          .orderBy(sql`mesano DESC`)
          .limit(1);
        if (latest[0]?.v) {
          anoRef = Math.floor(latest[0].v / 100);
        }
      }
      if (!anoRef) return { rows: [], ano: null };

      // Buscar todos os registros do ano de referência (formato AAAAMM: FLOOR(mesano/100) = ano)
      const allRows = await db
        .select({
          mesano: febraban.mesano,
          operador: febraban.operador,
          situacao: febraban.situacao,
          troco: febraban.troco,
          financiado: febraban.financiado,
          empresa: febraban.empresa,
        })
        .from(febraban)
        .where(sql`FLOOR(mesano / 100) = ${anoRef}${input.empresa ? sql` AND empresa = ${input.empresa}` : sql``}`);

      // Classificar tipo de operação
      const getTipo = (row: { situacao?: string | null; troco?: any; financiado?: any }): 'NOVO' | 'REFIN' | 'CANC' => {
        if (row.situacao && row.situacao.toLowerCase().includes('cancel')) return 'CANC';
        const t = Math.round((parseFloat(String(row.troco ?? '0').replace(',', '.')) || 0) * 100);
        const f = Math.round((parseFloat(String(row.financiado ?? '0').replace(',', '.')) || 0) * 100);
        if (t === f) return 'NOVO';
        return 'REFIN';
      };

      // Extrair mês de mesano (formato AAAAMM: ex: 202601 → mes=1, 202612 → mes=12)
      const getMes = (mesano: number): number => {
        return mesano % 100;
      };

      // Trimestre do mês (1-4)
      const getTri = (mes: number): number => Math.ceil(mes / 3);
      // Semestre do mês (1-2)
      const getSem = (mes: number): number => mes <= 6 ? 1 : 2;

      // Acumular por operador + tipo
      type Acc = { valor: number; qtd: number };
      type AgenteTipo = {
        tri1: Acc; tri2: Acc; tri3: Acc; tri4: Acc;
        sem1: Acc; sem2: Acc;
        ano: Acc;
      };
      const mapa: Record<string, Record<'NOVO'|'REFIN'|'CANC', AgenteTipo>> = {};

      const emptyAcc = (): Acc => ({ valor: 0, qtd: 0 });
      const emptyTipo = (): AgenteTipo => ({
        tri1: emptyAcc(), tri2: emptyAcc(), tri3: emptyAcc(), tri4: emptyAcc(),
        sem1: emptyAcc(), sem2: emptyAcc(),
        ano: emptyAcc(),
      });

      for (const row of allRows) {
        if (!row.mesano || !row.operador) continue;
        const op = row.operador.trim();
        const tipo = getTipo(row);
        const mes = getMes(row.mesano);
        const tri = getTri(mes);
        const sem = getSem(mes);
        const val = parseFloat(String(row.troco ?? '0').replace(',', '.')) || 0;

        if (!mapa[op]) mapa[op] = { NOVO: emptyTipo(), REFIN: emptyTipo(), CANC: emptyTipo() };
        const t = mapa[op][tipo];

        // Trimestre
        if (tri === 1) { t.tri1.valor += val; t.tri1.qtd++; }
        else if (tri === 2) { t.tri2.valor += val; t.tri2.qtd++; }
        else if (tri === 3) { t.tri3.valor += val; t.tri3.qtd++; }
        else if (tri === 4) { t.tri4.valor += val; t.tri4.qtd++; }

        // Semestre
        if (sem === 1) { t.sem1.valor += val; t.sem1.qtd++; }
        else { t.sem2.valor += val; t.sem2.qtd++; }

        // Ano
        t.ano.valor += val; t.ano.qtd++;
      }

      // Montar resultado ordenado por operador
      const resultado: Array<{
        chaveJ: string;
        tipo: 'NOVO' | 'REFIN' | 'CANC';
        tri1v: number; tri2v: number; tri3v: number; tri4v: number;
        sem1v: number; sem2v: number; anov: number;
        tri1q: number; tri2q: number; tri3q: number; tri4q: number;
        sem1q: number; sem2q: number; anoq: number;
      }> = [];

      const round2 = (n: number) => Math.round(n * 100) / 100;

      for (const [chaveJ, tipos] of Object.entries(mapa).sort(([a], [b]) => a.localeCompare(b))) {
        for (const tipo of ['NOVO', 'REFIN', 'CANC'] as const) {
          const t = tipos[tipo];
          // Só inclui se tiver algum dado
          if (t.ano.qtd === 0) continue;
          resultado.push({
            chaveJ,
            tipo,
            tri1v: round2(t.tri1.valor), tri2v: round2(t.tri2.valor),
            tri3v: round2(t.tri3.valor), tri4v: round2(t.tri4.valor),
            sem1v: round2(t.sem1.valor), sem2v: round2(t.sem2.valor),
            anov: round2(t.ano.valor),
            tri1q: t.tri1.qtd, tri2q: t.tri2.qtd,
            tri3q: t.tri3.qtd, tri4q: t.tri4.qtd,
            sem1q: t.sem1.qtd, sem2q: t.sem2.qtd,
            anoq: t.ano.qtd,
          });
        }
      }

      return { rows: resultado, ano: anoRef };
    }),

  filtros: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { empresas: [], mesanos: [], situacoes: [], operadores: [] };

    const [empresas, mesanos, situacoes, operadores] = await Promise.all([
      db.selectDistinct({ v: febraban.empresa }).from(febraban).where(sql`empresa IS NOT NULL`),
      db.selectDistinct({ v: febraban.mesano }).from(febraban).where(sql`mesano IS NOT NULL`).orderBy(desc(febraban.mesano)),
      db.selectDistinct({ v: febraban.situacao }).from(febraban).where(sql`situacao IS NOT NULL`),
      db.selectDistinct({ v: febraban.operador }).from(febraban).where(sql`operador IS NOT NULL`).orderBy(asc(febraban.operador)),
    ]);

    return {
      empresas: empresas.map(r => r.v).filter(Boolean) as string[],
      mesanos: mesanos.map(r => ({ value: r.v!, label: mesanoToStr(r.v!) })),
      situacoes: situacoes.map(r => r.v).filter(Boolean) as string[],
      operadores: operadores.map(r => r.v).filter(Boolean) as string[],
    };
  }),
};
