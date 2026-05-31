import { z } from "zod";
import { publicProcedure, router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { calculos, pagamentos, agentes } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { eq, and, like, or, sql, desc, asc } from "drizzle-orm";

export const calculosRouter = router({
  // Listar com filtros
  listar: publicProcedure
    .input(z.object({
      mesRef: z.string().optional(),
      empresa: z.string().optional(),
      chaveJ: z.string().optional(),
      nomeAgente: z.string().optional(),
      page: z.number().optional().default(1),
      limit: z.number().optional().default(100),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const conditions = [];

      if (input.mesRef) {
        conditions.push(eq(calculos.mesRef, input.mesRef));
      }
      if (input.empresa && input.empresa !== "Todas") {
        conditions.push(eq(calculos.empresa, input.empresa));
      }
      if (input.chaveJ) {
        conditions.push(like(calculos.chaveJ, `%${input.chaveJ}%`));
      }
      if (input.nomeAgente) {
        conditions.push(like(calculos.nomeAgente, `%${input.nomeAgente}%`));
      }

      const offset = (input.page - 1) * input.limit;
      const result = await db
        .select()
        .from(calculos)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(sql`STR_TO_DATE(CONCAT('01/', ${calculos.mesRef}), '%d/%m/%Y') DESC`, desc(calculos.createdAt), asc(calculos.empresa), asc(calculos.nomeAgente))
        .limit(input.limit)
        .offset(offset);

      // A partir de 05/2026: buscar adiantamento automaticamente da tabela pagamentos
      const isMesNovo = (mes: string) => {
        if (!mes) return false;
        const parts = mes.split('/');
        if (parts.length !== 2) return false;
        const mm = parseInt(parts[0], 10);
        const aaaa = parseInt(parts[1], 10);
        return aaaa > 2026 || (aaaa === 2026 && mm >= 5);
      };

      const resultComAdto = await Promise.all(result.map(async (reg) => {
        if (!isMesNovo(reg.mesRef ?? '') || !reg.chaveJ) return reg;
        const adtoRows = await db.execute(
          sql`SELECT COALESCE(SUM(valor), 0) as total FROM pagamentos WHERE tipoPagto = 'Adto' AND chaveJ = ${reg.chaveJ} AND mesAno = ${reg.mesRef}`
        ) as any;
        const adtoArr = Array.isArray(adtoRows) ? adtoRows[0] : adtoRows;
        const adtoList = Array.isArray(adtoArr) ? adtoArr : [adtoArr];
        const adiantamento = parseFloat(String(adtoList[0]?.total ?? 0)) || 0;
        const toN = (v: any) => parseFloat(String(v ?? 0)) || 0;
        const novaComissaoTotal =
          toN(reg.comissaoConsig) +
          toN(reg.comissaoConsorcio) +
          toN(reg.comissaoOurocap) +
          toN(reg.comissaoCc) +
          toN(reg.comissaoSeguros) +
          toN(reg.ajudaCusto) +
          toN(reg.creditosDebitos) -
          adiantamento;
        // Atualizar no banco silenciosamente
        await db.update(calculos)
          .set({ comissaoTotal: String(novaComissaoTotal), adiantamento: String(adiantamento) })
          .where(eq(calculos.id, reg.id));
        return { ...reg, adiantamento: String(adiantamento), comissaoTotal: String(novaComissaoTotal) };
      }));

      return resultComAdto;
    }),

  // Contar total de registros
  contar: publicProcedure
    .input(z.object({
      mesRef: z.string().optional(),
      empresa: z.string().optional(),
      chaveJ: z.string().optional(),
      nomeAgente: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return 0;
      const conditions = [];
      if (input.mesRef) conditions.push(eq(calculos.mesRef, input.mesRef));
      if (input.empresa && input.empresa !== "Todas") conditions.push(eq(calculos.empresa, input.empresa));
      if (input.chaveJ) conditions.push(like(calculos.chaveJ, `%${input.chaveJ}%`));
      if (input.nomeAgente) conditions.push(like(calculos.nomeAgente, `%${input.nomeAgente}%`));
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(calculos)
        .where(conditions.length > 0 ? and(...conditions) : undefined);
      return Number(result[0]?.count ?? 0);
    }),

  // Listar meses disponíveis
  mesesDisponiveis: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const result = await db
      .selectDistinct({ mesRef: calculos.mesRef })
      .from(calculos)
      .orderBy(sql`STR_TO_DATE(CONCAT('01/', ${calculos.mesRef}), '%d/%m/%Y') DESC`);
    return result.map(r => r.mesRef).filter(Boolean);
  }),

  // Listar anos disponíveis (extraídos do mesRef MM/AAAA)
  anosDisponiveis: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return ['2026'];
    const result = await db
      .selectDistinct({ mesRef: calculos.mesRef })
      .from(calculos)
      .orderBy(sql`STR_TO_DATE(CONCAT('01/', ${calculos.mesRef}), '%d/%m/%Y') DESC`);
    const anos = new Set<string>();
    for (const r of result) {
      if (r.mesRef) {
        const parts = r.mesRef.split('/');
        if (parts.length === 2 && parts[1]) anos.add(parts[1]);
      }
    }
    const lista = Array.from(anos).sort((a, b) => Number(b) - Number(a));
    return lista.length > 0 ? lista : ['2026'];
  }),

  // Listar empresas disponíveis
  empresasDisponiveis: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const result = await db
      .selectDistinct({ empresa: calculos.empresa })
      .from(calculos)
      .orderBy(calculos.empresa);
    return result.map(r => r.empresa).filter(Boolean);
  }),

  // Criar registro
  criar: publicProcedure
    .input(z.object({
      tipoPagamento: z.string().optional(),
      empresa: z.string().optional(),
      situacao: z.string().optional(),
      mesRef: z.string().optional(),
      chaveJ: z.string().optional(),
      nomeAgente: z.string().optional(),
      cidade: z.string().optional(),
      percentual: z.number().optional(),
      comissaoTotal: z.number().optional(),
      rbmTotal: z.number().optional(),
      comissaoConsig: z.number().optional(),
      comissaoConsorcio: z.number().optional(),
      comissaoOurocap: z.number().optional(),
      comissaoCc: z.number().optional(),
      comissaoSeguros: z.number().optional(),
      ajudaCusto: z.number().optional(),
      creditosDebitos: z.number().optional(),
      adiantamento: z.number().optional(),
      reajuste: z.number().optional(),
      rbmCreditoC2: z.number().optional(),
      rbmContaCorrente: z.number().optional(),
      rbmConsorcioC2: z.number().optional(),
      rbmOurocap: z.number().optional(),
      rbmSeguros: z.number().optional(),
      qtdeContas: z.number().optional(),
      vrLiquidoC2: z.number().optional(),
      srccC2: z.number().optional(),
      vrLiquidoSrcc: z.number().optional(),
      dtPagto: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB unavailable');
      const [result] = await db.insert(calculos).values(input as any);
      return result;
    }),

  // Editar registro
  editar: publicProcedure
    .input(z.object({
      id: z.number(),
      tipoPagamento: z.string().optional(),
      empresa: z.string().optional(),
      situacao: z.string().optional(),
      mesRef: z.string().optional(),
      chaveJ: z.string().optional(),
      nomeAgente: z.string().optional(),
      cidade: z.string().optional(),
      percentual: z.number().optional(),
      comissaoTotal: z.number().optional(),
      rbmTotal: z.number().optional(),
      comissaoConsig: z.number().optional(),
      comissaoConsorcio: z.number().optional(),
      comissaoOurocap: z.number().optional(),
      comissaoCc: z.number().optional(),
      comissaoSeguros: z.number().optional(),
      ajudaCusto: z.number().optional(),
      creditosDebitos: z.number().optional(),
      adiantamento: z.number().optional(),
      reajuste: z.number().optional(),
      rbmCreditoC2: z.number().optional(),
      rbmContaCorrente: z.number().optional(),
      rbmConsorcioC2: z.number().optional(),
      rbmOurocap: z.number().optional(),
      rbmSeguros: z.number().optional(),
      qtdeContas: z.number().optional(),
      vrLiquidoC2: z.number().optional(),
      srccC2: z.number().optional(),
      vrLiquidoSrcc: z.number().optional(),
      dtPagto: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB unavailable');
      const { id, ...dados } = input;
      await db.update(calculos).set(dados as any).where(eq(calculos.id, id));
      return { success: true };
    }),

  // Deletar registro
  deletar: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('DB unavailable');
      await db.delete(calculos).where(eq(calculos.id, input.id));
      return { success: true };
    }),

  // Enviar selecionados para Pagamentos
  enviarParaPagto: publicProcedure
    .input(z.object({ ids: z.array(z.number()) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      // Buscar os registros de cálculo selecionados
      const regs = await db
        .select()
        .from(calculos)
        .where(sql`${calculos.id} IN (${sql.join(input.ids.map((id) => sql`${id}`), sql`, `)})`);

      const resultados: { chaveJ: string; status: string; mensagem: string }[] = [];

      for (const reg of regs) {
        // mesRef já está no formato MM/AAAA (ex: "05/2026")
        const mesAno = reg.mesRef ?? "";

        const tipoPagto = reg.tipoPagamento ?? "Comissão";
        const empresa = reg.empresa ?? "";
        const chaveJ = reg.chaveJ ?? "";
        const valor = reg.comissaoTotal ? String(parseFloat(reg.comissaoTotal)) : null;
        const dataPagto = reg.dtPagto ?? null;

        // Buscar dados do favorecido em Cadastro (agentes) pela Chave J
        let nomeFavorecido: string | null = null;
        let banco: string | null = null;
        let agencia: string | null = null;
        let conta: string | null = null;
        let cpfCnpj: string | null = null;
        let tipoConta: string | null = null;
        let pix: string | null = null;
        let cadastro: string | null = null;
        let cidadeUF: string | null = null;

        if (chaveJ) {
          const agente = await db
            .select()
            .from(agentes)
            .where(eq(agentes.chaveJ, chaveJ))
            .limit(1);

          if (agente.length > 0) {
            const a = agente[0];
            nomeFavorecido = a.favorecido ?? a.nomeAgente ?? null;
            banco = a.banco ?? null;
            agencia = a.agencia ?? null;
            conta = a.conta ?? null;
            cpfCnpj = a.cpfAgente ?? null;
            tipoConta = a.tipo ?? null;
            pix = a.pix ?? null;
            cadastro = a.numCadastro ?? null;
            cidadeUF = a.cidade ? (a.uf ? `${a.cidade}/${a.uf}` : a.cidade) : null;
          }
        }

        // Verificar duplicata
        if (chaveJ && mesAno && tipoPagto) {
          const existente = await db
            .select({ id: pagamentos.id })
            .from(pagamentos)
            .where(and(eq(pagamentos.chaveJ, chaveJ), eq(pagamentos.mesAno, mesAno), eq(pagamentos.tipoPagto, tipoPagto)))
            .limit(1);

          if (existente.length > 0) {
            resultados.push({ chaveJ, status: "duplicado", mensagem: `Já existe lançamento de "${tipoPagto}" para ${chaveJ} em ${mesAno}` });
            continue;
          }
        }

        await db.insert(pagamentos).values({
          mesAno,
          tipoPagto,
          empresa: empresa || null,
          chaveJ: chaveJ || null,
          cadastro,
          nomeFavorecido,
          banco,
          agencia,
          conta,
          cpfCnpj,
          tipoConta,
          pix,
          cidadeUF,
          valor,
          dataPagto: null,        // preenchido pelo financeiro ao pagar
          dataVencer: dataPagto,  // data vinda do Cálculo é a data de vencimento
          pago: false,
          origem: "sistema",
        });

        resultados.push({ chaveJ, status: "ok", mensagem: `Enviado com sucesso` });
      }

      const enviados = resultados.filter((r) => r.status === "ok").length;
      const duplicados = resultados.filter((r) => r.status === "duplicado").length;
      return { enviados, duplicados, resultados };
    }),
  // Relatório RBM x Despesas por agente (apenas CEO)
  relatorioRbmDespesas: protectedProcedure
    .input(z.object({
      ano: z.string(), // ex: "2026"
      empresa: z.string().optional(), // "BMF" | "FLEX" | undefined = todas
      mes: z.string().optional(), // ex: "05" | undefined = todos os meses
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB indisponivel' });

      const toN = (v: any) => parseFloat(String(v ?? 0)) || 0;

      // 1. Buscar todos os cálculos do ano (e mês) filtrado
      // mesRef formato: MM/AAAA
      const mesPattern = input.mes ? `${input.mes}/${input.ano}` : `%/${input.ano}`;
      const calcConds: any[] = [input.mes
        ? eq(calculos.mesRef, mesPattern)
        : like(calculos.mesRef, mesPattern)
      ];
      if (input.empresa && input.empresa !== 'Todas') {
        calcConds.push(eq(calculos.empresa, input.empresa));
      }
      const calcRows = await db.select().from(calculos)
        .where(and(...calcConds))
        .orderBy(asc(calculos.nomeAgente), asc(calculos.mesRef));

      // 2. Agregar por agente (chaveJ)
      const agentMap = new Map<string, {
        chaveJ: string; nomeAgente: string; cidade: string; empresa: string;
        rbmTotal: number; rbmConsig: number; rbmCC: number; rbmConsorcio: number;
        rbmOurocap: number; rbmSeguros: number;
        comissaoTotal: number; meses: Set<string>;
      }>();

      for (const r of calcRows) {
        const key = `${r.chaveJ}__${r.empresa}`;
        if (!agentMap.has(key)) {
          agentMap.set(key, {
            chaveJ: r.chaveJ ?? '', nomeAgente: r.nomeAgente ?? '',
            cidade: r.cidade ?? '', empresa: r.empresa ?? '',
            rbmTotal: 0, rbmConsig: 0, rbmCC: 0, rbmConsorcio: 0,
            rbmOurocap: 0, rbmSeguros: 0, comissaoTotal: 0, meses: new Set(),
          });
        }
        const ag = agentMap.get(key)!;
        ag.rbmTotal     += toN(r.rbmTotal);
        ag.rbmConsig    += toN(r.rbmCreditoC2);
        ag.rbmCC        += toN(r.rbmContaCorrente);
        ag.rbmConsorcio += toN(r.rbmConsorcioC2);
        ag.rbmOurocap   += toN(r.rbmOurocap);
        ag.rbmSeguros   += toN(r.rbmSeguros);
        ag.comissaoTotal += toN(r.comissaoTotal);
        if (r.mesRef) ag.meses.add(r.mesRef);
      }

      // 3. Buscar despesas fixas do ano (e mês)
      const { despesasFixas } = await import('../../drizzle/schema');
      const dfConds: any[] = [input.mes
        ? eq(despesasFixas.mesAno, mesPattern)
        : like(despesasFixas.mesAno, mesPattern)
      ];
      if (input.empresa && input.empresa !== 'Todas') {
        dfConds.push(eq(despesasFixas.empresa, input.empresa));
      }
      const dfRows = await db.select().from(despesasFixas).where(and(...dfConds));

      // 4. Buscar despesas avulsas (pagamentos) do ano (e mês) — excluindo comissões de agentes
      const pgConds: any[] = [input.mes
        ? eq(pagamentos.mesAno, mesPattern)
        : like(pagamentos.mesAno, mesPattern)
      ];
      if (input.empresa && input.empresa !== 'Todas') {
        pgConds.push(eq(pagamentos.empresa, input.empresa));
      }
      // Excluir tipos que são comissão de agente
      pgConds.push(sql`${pagamentos.tipoPagto} NOT IN ('Comissão','Comissao','Adto','Adiantamento')`);
      const pgRows = await db.select().from(pagamentos).where(and(...pgConds));

      // 5. Montar mapa cidade -> nAgentes
      const cidadeAgentes = new Map<string, Set<string>>();
      for (const [, ag] of Array.from(agentMap)) {
        if (!ag.cidade) continue;
        if (!cidadeAgentes.has(ag.cidade)) cidadeAgentes.set(ag.cidade, new Set());
        cidadeAgentes.get(ag.cidade)!.add(ag.chaveJ);
      }

      // 6. Somar despesas por cidade
      const despCidade = new Map<string, { fixas: number; avulsas: number; tipos: Map<string, number> }>();
      const addDesp = (cidade: string, tipo: string, valor: number, fonte: 'fixas'|'avulsas') => {
        if (!cidade) return;
        if (!despCidade.has(cidade)) despCidade.set(cidade, { fixas: 0, avulsas: 0, tipos: new Map() });
        const d = despCidade.get(cidade)!;
        d[fonte] += valor;
        d.tipos.set(tipo, (d.tipos.get(tipo) ?? 0) + valor);
      };
      for (const r of dfRows) {
        const cidade = r.chaveResp ?? r.cidadeUF ?? '';
        addDesp(cidade, r.tipoPagto ?? 'Outros', toN(r.valor), 'fixas');
      }
      for (const r of pgRows) {
        const cidade = r.chaveJ ?? r.cidadeUF ?? '';
        addDesp(cidade, r.tipoPagto ?? 'Outros', toN(r.valor), 'avulsas');
      }

      // 7. Montar resultado final
      const resultado = Array.from(agentMap.values()).map(ag => {
        const nAgentes = cidadeAgentes.get(ag.cidade)?.size ?? 1;
        const d = despCidade.get(ag.cidade);
        const totalDespFixas = (d?.fixas ?? 0) / nAgentes;
        const totalDespAvulsas = (d?.avulsas ?? 0) / nAgentes;
        const totalDesp = totalDespFixas + totalDespAvulsas;
        const tiposDesp: Record<string, number> = {};
        d?.tipos.forEach((v, k) => { tiposDesp[k] = v / nAgentes; });
        const saldo = ag.comissaoTotal - totalDesp;
        const pctConsumido = ag.rbmTotal > 0
          ? ((ag.comissaoTotal + totalDesp) / ag.rbmTotal) * 100
          : 0;
        return {
          chaveJ: ag.chaveJ,
          nomeAgente: ag.nomeAgente,
          cidade: ag.cidade,
          empresa: ag.empresa,
          nAgentesNaCidade: nAgentes,
          meses: ag.meses.size,
          rbmTotal: ag.rbmTotal,
          rbmConsig: ag.rbmConsig,
          rbmCC: ag.rbmCC,
          rbmConsorcio: ag.rbmConsorcio,
          rbmOurocap: ag.rbmOurocap,
          rbmSeguros: ag.rbmSeguros,
          comissaoTotal: ag.comissaoTotal,
          totalDespFixas,
          totalDespAvulsas,
          totalDesp,
          tiposDesp,
          saldo,
          pctConsumido,
        };
      }).sort((a, b) => a.nomeAgente.localeCompare(b.nomeAgente, 'pt-BR', { sensitivity: 'base' }));

      return resultado;
    }),

  // Recalcular comissaoTotal pela nova formula (a partir de 05/2026)
  // Formula: consig + consorcio + ourocap + cc + seguros + ajudaCusto + creditosDebitos - adiantamento
  // Adiantamento e buscado na tabela pagamentos (tipoPagto = 'Adto')
  // Campo reajuste NAO entra no calculo
  recalcularComissaoTotal: publicProcedure
    .input(z.object({
      mesRef: z.string(), // formato MM/AAAA
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB indisponivel' });

      // Buscar todos os registros do mes
      const regs = await db.select().from(calculos).where(eq(calculos.mesRef, input.mesRef));

      let atualizados = 0;
      for (const reg of regs) {
        const chaveJ = reg.chaveJ;
        if (!chaveJ) continue;

        // Buscar adiantamento na tabela pagamentos
        const adtoRows = await db.execute(
          sql`SELECT COALESCE(SUM(valor), 0) as total FROM pagamentos WHERE tipoPagto = 'Adto' AND chaveJ = ${chaveJ} AND mesAno = ${input.mesRef}`
        ) as any;
        const adtoArr = Array.isArray(adtoRows) ? adtoRows[0] : adtoRows;
        const adtoList = Array.isArray(adtoArr) ? adtoArr : [adtoArr];
        const adiantamento = parseFloat(String(adtoList[0]?.total ?? 0)) || 0;

        const toN = (v: any) => parseFloat(String(v ?? 0)) || 0;
        const novaComissaoTotal =
          toN(reg.comissaoConsig) +
          toN(reg.comissaoConsorcio) +
          toN(reg.comissaoOurocap) +
          toN(reg.comissaoCc) +
          toN(reg.comissaoSeguros) +
          toN(reg.ajudaCusto) +
          toN(reg.creditosDebitos) -
          adiantamento;

        await db.update(calculos)
          .set({ comissaoTotal: String(novaComissaoTotal), adiantamento: String(adiantamento) })
          .where(eq(calculos.id, reg.id));
        atualizados++;
      }
      return { atualizados };
    }),
});
