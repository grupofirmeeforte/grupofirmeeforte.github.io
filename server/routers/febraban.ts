import { z } from "zod";
import { protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { febraban, consignados, feriados } from "../../drizzle/schema";
import { eq, and, like, or, desc, asc, sql, isNotNull, isNull, ne } from "drizzle-orm";

// Converte número MESANO (ex: 126) para string legível (ex: "01/2026")
export function mesanoToStr(mesano: number): string {
  const s = String(mesano);
  const mes = s.slice(0, s.length - 2).padStart(2, "0");
  const ano = "20" + s.slice(-2);
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
      if (input.mesano) {
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
      if (input.mesano) {
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

      // Buscar todas as propostas de uma vez para evitar N+1 queries
      const todasPropostas = input.registros
        .map(r => r.proposta?.trim())
        .filter(Boolean) as string[];

      // Consultar consignados para todas as propostas em batch
      const consignadosMap = new Map<string, { srcc: boolean }>();
      if (todasPropostas.length > 0) {
        const consignadosRows = await db
          .select({ nrOperacao: consignados.nrOperacao, restricaoSRCC: consignados.restricaoSRCC })
          .from(consignados)
          .where(sql`${consignados.nrOperacao} IN (${sql.join(todasPropostas.map(p => sql`${p}`), sql`, `)})`)

        for (const row of consignadosRows) {
          if (!row.nrOperacao) continue;
          const chave = row.nrOperacao.trim();
          const jaTem = consignadosMap.get(chave);
          const isSrcc = row.restricaoSRCC != null && row.restricaoSRCC.trim().toLowerCase() === 'sim';
          // Se já existe entrada, só atualiza se for SRCC (prioridade SRCC > Sim)
          if (!jaTem || isSrcc) {
            consignadosMap.set(chave, { srcc: isSrcc });
          }
        }
      }

      for (let idx = 0; idx < input.registros.length; idx++) {
        const reg = input.registros[idx];
        if (!reg.proposta || reg.proposta.trim() === "") { ignorados++; continue; }

        const ordemExcel = input.offsetInicial + idx;
        const toStr = (v: number | undefined | null) => v != null ? String(v) : undefined;

        // Calcular pago automaticamente via consignados
        const consigInfo = consignadosMap.get(reg.proposta.trim());
        let pagoAuto = 0;
        if (consigInfo) {
          pagoAuto = consigInfo.srcc ? 2 : 1;
        }

        const values = {
          empresa: reg.empresa,
          mesano: reg.mesano,
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

        // Verificar se já existe
        const existing = await db
          .select({ id: febraban.id, pago: febraban.pago })
          .from(febraban)
          .where(eq(febraban.proposta, reg.proposta))
          .limit(1);

        if (existing.length > 0) {
          if (input.modo === "subscrever") {
            // Preservar pago manual: só atualiza pago se o valor atual for 0 (não foi definido manualmente)
            const pagoAtual = existing[0].pago ?? 0;
            const pagoFinal = pagoAtual !== 0 ? pagoAtual : pagoAuto;
            await db.update(febraban).set({ ...values, pago: pagoFinal }).where(eq(febraban.proposta, reg.proposta));
            atualizados++;
          } else {
            ignorados++;
          }
        } else {
          await db.insert(febraban).values({ ...values, proposta: reg.proposta });
          adicionados++;
        }
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
        // Para ordenar corretamente, converter para AAAAMM: ano=20+AA, mes=MM
        // RIGHT(LPAD(mesano,6,'0'),2) = AA, LEFT(LPAD(mesano,6,'0'),4) = MMXX
        // Ordem real: CONCAT('20',RIGHT(LPAD(mesano,6,'0'),2), LPAD(LEFT(LPAD(mesano,6,'0'),LENGTH(mesano)-2),2,'0'))
        let mesano: number | undefined = inputMesano;
        if (!mesano) {
          const latest = await db
            .select({ v: febraban.mesano })
            .from(febraban)
            .where(sql`empresa = ${emp} AND mesano IS NOT NULL`)
            .orderBy(sql`CONCAT('20', RIGHT(LPAD(CAST(mesano AS CHAR),6,'0'),2), LPAD(FLOOR(mesano / 100),2,'0')) DESC`)
            .limit(1);
          mesano = latest[0]?.v ?? undefined;
        }
        if (!mesano) continue;

        const mesanoStr = String(mesano);
        const anoSuffix = mesanoStr.slice(-2);
        const anoFull = "20" + anoSuffix;

        const baseWhere = sql`empresa = ${emp} AND mesano = ${mesano}`;
        // ANO: soma todos os meses do mesmo ano do mesano mais recente desta empresa
        const anoWhere = sql`empresa = ${emp} AND RIGHT(LPAD(CAST(mesano AS CHAR), 6, '0'), 2) = ${anoSuffix}`;

        const [contratado, pendente, diaAtual, diaAnterior, ano,
               qtdContratado, qtdPendente, qtdDiaAtual, qtdDiaAnterior, qtdAno,
               srccValor, qtdSrcc] = await Promise.all([
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
      // mes e ano para filtro por data (padrão: mês atual)
      mes: z.number().optional(),
      ano: z.number().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const { calculos } = await import('../../drizzle/schema');

      // ChaveJ do usuário logado
      let chaveJLogado: string | null = null;
      if (ctx.user?.email && ctx.user.email.includes('@')) {
        chaveJLogado = ctx.user.email.split('@')[0].toUpperCase();
      }
      const chaveJ = input.chaveJ ?? chaveJLogado;

      // Mês e ano para filtro — padrão: mês atual
      const agora = new Date();
      const mes = input.mes ?? (agora.getMonth() + 1);
      const ano = input.ano ?? agora.getFullYear();

      const conditions: any[] = [];
      // Filtrar por operador: usa o ChaveJ real do agente (código J, ex: J1234568)
      // Match exato case-insensitive
      if (chaveJ) conditions.push(sql`UPPER(TRIM(${febraban.operador})) = ${chaveJ.toUpperCase().trim()}`);
      // Filtrar por data de solicitação no mês/ano atual (campo DD/MM/AAAA)
      conditions.push(
        sql`MONTH(STR_TO_DATE(${febraban.solicitacao}, '%d/%m/%Y')) = ${mes} AND YEAR(STR_TO_DATE(${febraban.solicitacao}, '%d/%m/%Y')) = ${ano}`
      );

      const rows = await db
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
          mesano: febraban.mesano,
        })
        .from(febraban)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(
          sql`STR_TO_DATE(${febraban.solicitacao}, '%d/%m/%Y') DESC`,
          asc(febraban.proposta)
        );

      // Buscar percentual do agente na tabela calculos (último registro disponível)
      let percentualAgente: number | null = null;
      if (chaveJ) {
        const calcRow = await db
          .select({ percentual: calculos.percentual })
          .from(calculos)
          .where(sql`UPPER(TRIM(${calculos.chaveJ})) = ${chaveJ.toUpperCase().trim()}`)
          .orderBy(desc(calculos.mesRef))
          .limit(1);
        if (calcRow.length > 0 && calcRow[0].percentual != null) {
          percentualAgente = parseFloat(String(calcRow[0].percentual));
        }
      }

      // Calcular PerspectivaComissão = Líquido (troco) × percentual / 100
      // Canceladas e Pendentes sempre têm comissão = R$0,00
      const result = rows.map(r => {
        const isContratada = (r.situacao ?? '').trim().toLowerCase() === 'contratada';
        const liquido = (isContratada && r.troco != null) ? parseFloat(String(r.troco)) : 0;
        const perspectivaComissao = !isContratada
          ? 0
          : percentualAgente != null
            ? (liquido * percentualAgente) / 100
            : null;
        return { ...r, percentualAgente, perspectivaComissao };
      });

      return { rows: result, chaveJ: chaveJ ?? '', percentualAgente };
    }),

  // Retorna valores únicos para filtros
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
