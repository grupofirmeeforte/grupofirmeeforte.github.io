import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { pagamentos, agentes, despesasFixas } from "../../drizzle/schema";
import { eq, and, like, desc, count, asc, sql } from "drizzle-orm";

export const TIPOS_PAGTO = [
  "Agua",
  "Ajuda de Custo",
  "Aluguel",
  "Cancelado",
  "Comissão",
  "DespesasLoja",
  "DespesasViagem",
  "Energia",
  "Internet",
  "Outros",
  "Propaganda",
  "Reajuste",
  "Reembolso",
] as const;

export const pagamentosRouter = {
  // Listar pagamentos com filtros e paginação
  list: publicProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().default(100),
      mesAno: z.string().optional(),
      empresa: z.string().optional(),
      tipoPagto: z.string().optional(),
      pago: z.enum(["todos", "sim", "nao"]).default("todos"),
      chaveJ: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const offset = (input.page - 1) * input.limit;

      const conditions: any[] = [];
      if (input.mesAno) conditions.push(eq(pagamentos.mesAno, input.mesAno));
      if (input.empresa) conditions.push(eq(pagamentos.empresa, input.empresa));
      if (input.tipoPagto) conditions.push(eq(pagamentos.tipoPagto, input.tipoPagto));
      if (input.chaveJ) conditions.push(like(pagamentos.chaveJ, `%${input.chaveJ}%`));
      if (input.pago === "sim") conditions.push(eq(pagamentos.pago, true));
      if (input.pago === "nao") conditions.push(eq(pagamentos.pago, false));

      return await db
        .select()
        .from(pagamentos)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(pagamentos.id))
        .limit(input.limit)
        .offset(offset);
    }),

  // Contar total de registros
  count: publicProcedure
    .input(z.object({
      mesAno: z.string().optional(),
      empresa: z.string().optional(),
      tipoPagto: z.string().optional(),
      pago: z.enum(["todos", "sim", "nao"]).default("todos"),
      chaveJ: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return 0;

      const conditions: any[] = [];
      if (input.mesAno) conditions.push(eq(pagamentos.mesAno, input.mesAno));
      if (input.empresa) conditions.push(eq(pagamentos.empresa, input.empresa));
      if (input.tipoPagto) conditions.push(eq(pagamentos.tipoPagto, input.tipoPagto));
      if (input.chaveJ) conditions.push(like(pagamentos.chaveJ, `%${input.chaveJ}%`));
      if (input.pago === "sim") conditions.push(eq(pagamentos.pago, true));
      if (input.pago === "nao") conditions.push(eq(pagamentos.pago, false));

      const result = await db
        .select({ total: count() })
        .from(pagamentos)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return result[0]?.total ?? 0;
    }),

  // Buscar dados do agente pela ChaveJ (para preencher formulário automaticamente)
  buscarAgente: publicProcedure
    .input(z.object({ chaveJ: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db
        .select({
          empresa: agentes.empresa,
          numCadastro: agentes.numCadastro,
          nomeAgente: agentes.nomeAgente,
          favorecido: agentes.favorecido,
          banco: agentes.banco,
          agencia: agentes.agencia,
          conta: agentes.conta,
          tipo: agentes.tipo,
          cpfAgente: agentes.cpfAgente,
          pix: agentes.pix,
          cidade: agentes.cidade,
          uf: agentes.uf,
        })
        .from(agentes)
        .where(eq(agentes.chaveJ, input.chaveJ))
        .limit(1);
      return rows[0] ?? null;
    }),

  // Buscar agentes por chaveJ ou nome (para autocomplete do campo Chave J Responsável)
  buscarAgenteResp: publicProcedure
    .input(z.object({ termo: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db || input.termo.length < 2) return [];
      const rows = await db
        .select({
          chaveJ: agentes.chaveJ,
          nomeAgente: agentes.nomeAgente,
          favorecido: agentes.favorecido,
          empresa: agentes.empresa,
          cidade: agentes.cidade,
          uf: agentes.uf,
        })
        .from(agentes)
        .where(
          sql`(${agentes.chaveJ} LIKE ${`%${input.termo}%`} OR ${agentes.nomeAgente} LIKE ${`%${input.termo}%`} OR ${agentes.favorecido} LIKE ${`%${input.termo}%`})`
        )
        .orderBy(asc(agentes.chaveJ))
        .limit(10);
      return rows;
    }),

  // Listar tipos de pagamento disponíveis
  tiposPagto: publicProcedure.query(() => [...TIPOS_PAGTO]),

  // Criar novo pagamento (com bloqueio de duplicatas)
  criar: publicProcedure
    .input(z.object({
      mesAno: z.string().optional(),
      tipoPagto: z.string().optional(),
      cidadeUF: z.string().optional(),
      empresa: z.string().optional(),
      chaveJ: z.string().optional(),
      chaveJResp: z.string().optional(),
      cadastro: z.string().optional(),
      nomeFavorecido: z.string().optional(),
      banco: z.string().optional(),
      agencia: z.string().optional(),
      conta: z.string().optional(),
      cpfCnpj: z.string().optional(),
      tipoConta: z.string().optional(),
      pix: z.string().optional(),
      valor: z.string().optional(),
      pago: z.boolean().default(false),
      dataPagto: z.string().optional(),
      dataVencer: z.string().optional(),
      origem: z.string().default("manual"),
      observacao: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      // Verificar duplicata: mesma chaveJ + mesAno + tipoPagto
      if (input.chaveJ && input.mesAno && input.tipoPagto) {
        const existente = await db
          .select({ id: pagamentos.id })
          .from(pagamentos)
          .where(
            and(
              eq(pagamentos.chaveJ, input.chaveJ),
              eq(pagamentos.mesAno, input.mesAno),
              eq(pagamentos.tipoPagto, input.tipoPagto)
            )
          )
          .limit(1);

        if (existente.length > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Já existe um lançamento de "${input.tipoPagto}" para a Chave J "${input.chaveJ}" no mês ${input.mesAno}.`,
          });
        }
      }

      // Converter valor em formato BR (ex: "R$4.326,88" ou "4.326,88" ou "4326.88") para número
      const parseValorBR = (v: string | null | undefined): number | null => {
        if (!v) return null;
        const s = v.replace(/R\$\s*/g, '').replace(/\s/g, '').trim();
        if (!s) return null;
        let clean: string;
        if (s.includes(',')) {
          clean = s.replace(/\./g, '').replace(',', '.');
        } else {
          clean = s;
        }
        const n = parseFloat(clean);
        return isNaN(n) ? null : n;
      };
      const valorNum = parseValorBR(input.valor);

      await db.insert(pagamentos).values({
        mesAno: input.mesAno,
        tipoPagto: input.tipoPagto,
        cidadeUF: input.cidadeUF ?? null,
        empresa: input.empresa ?? null,
        chaveJ: input.chaveJ ?? null,
        chaveJResp: input.chaveJResp ?? null,
        cadastro: input.cadastro ?? null,
        nomeFavorecido: input.nomeFavorecido ?? null,
        banco: input.banco ?? null,
        agencia: input.agencia ?? null,
        conta: input.conta ?? null,
        cpfCnpj: input.cpfCnpj ?? null,
        tipoConta: input.tipoConta ?? null,
        pix: input.pix ?? null,
        valor: valorNum !== null ? String(valorNum) : null,
        pago: input.pago,
        dataPagto: input.dataPagto ?? null,
        dataVencer: input.dataVencer ?? null,
        origem: input.origem,
        observacao: input.observacao ?? null,
      });

      return { success: true };
    }),

  // Editar pagamento existente
  editar: publicProcedure
    .input(z.object({
      id: z.number(),
      mesAno: z.string().optional(),
      tipoPagto: z.string().optional(),
      cidadeUF: z.string().optional(),
      empresa: z.string().optional(),
      chaveJ: z.string().optional(),
      chaveJResp: z.string().optional(),
      cadastro: z.string().optional(),
      nomeFavorecido: z.string().optional(),
      banco: z.string().optional(),
      agencia: z.string().optional(),
      conta: z.string().optional(),
      cpfCnpj: z.string().optional(),
      tipoConta: z.string().optional(),
      pix: z.string().optional(),
      valor: z.string().optional(),
      pago: z.boolean().optional(),
      dataPagto: z.string().optional(),
      dataVencer: z.string().optional(),
      observacao: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const { id, valor, ...rest } = input;;
      const updateData: Record<string, any> = {};

      // Só incluir campos definidos
      for (const [k, v] of Object.entries(rest)) {
        if (v !== undefined) updateData[k] = v;
      }
      if (valor !== undefined) {
        const parseValorBREdit = (v: string | null | undefined): number | null => {
          if (!v) return null;
          const s = v.replace(/R\$\s*/g, '').replace(/\s/g, '').trim();
          if (!s) return null;
          const clean = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
          const n = parseFloat(clean);
          return isNaN(n) ? null : n;
        };
        const vNum = parseValorBREdit(valor);
        updateData.valor = vNum !== null ? String(vNum) : null;
      }

      if (Object.keys(updateData).length > 0) {
        await db.update(pagamentos).set(updateData).where(eq(pagamentos.id, id));
      }
      return { success: true };
    }),

  // Deletar pagamento
  deletar: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      await db.delete(pagamentos).where(eq(pagamentos.id, input.id));
      return { success: true };
    }),

  // Listar empresas distintas para filtro
  empresas: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db
      .select({ empresa: pagamentos.empresa })
      .from(pagamentos)
      .groupBy(pagamentos.empresa)
      .orderBy(asc(pagamentos.empresa));
    return rows.map((r: any) => r.empresa).filter(Boolean) as string[];
  }),

  // Listar unificado: pagamentos + despesas fixas
  listUnificado: publicProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().default(100),
      mesAno: z.string().optional(),
      empresa: z.string().optional(),
      tipoPagto: z.string().optional(),
      pago: z.enum(["todos", "sim", "nao"]).default("todos"),
      chaveJ: z.string().optional(),
      nome: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { rows: [], total: 0 };
      const offset = (input.page - 1) * input.limit;

      // Buscar pagamentos
      const condPag: any[] = [];
      if (input.mesAno) condPag.push(eq(pagamentos.mesAno, input.mesAno));
      if (input.empresa) condPag.push(eq(pagamentos.empresa, input.empresa));
      if (input.tipoPagto) condPag.push(eq(pagamentos.tipoPagto, input.tipoPagto));
      if (input.chaveJ) condPag.push(like(pagamentos.chaveJ, `%${input.chaveJ}%`));
      if (input.nome) condPag.push(like(pagamentos.nomeFavorecido, `%${input.nome}%`));
      if (input.pago === "sim") condPag.push(eq(pagamentos.pago, true));
      if (input.pago === "nao") condPag.push(eq(pagamentos.pago, false));
      const rowsPag = await db.select().from(pagamentos)
        .where(condPag.length > 0 ? and(...condPag) : undefined)
        .orderBy(desc(pagamentos.id));

      // Buscar despesas fixas
      const condDesp: any[] = [];
      if (input.mesAno) condDesp.push(eq(despesasFixas.mesAno, input.mesAno));
      if (input.empresa) condDesp.push(eq(despesasFixas.empresa, input.empresa));
      if (input.tipoPagto) condDesp.push(eq(despesasFixas.tipoPagto, input.tipoPagto));
      if (input.nome) condDesp.push(like(despesasFixas.nome, `%${input.nome}%`));
      if (input.pago === "sim") condDesp.push(eq(despesasFixas.pago, true));
      if (input.pago === "nao") condDesp.push(eq(despesasFixas.pago, false));
      const rowsDesp = await db.select().from(despesasFixas)
        .where(condDesp.length > 0 ? and(...condDesp) : undefined)
        .orderBy(desc(despesasFixas.id));

      // Normalizar despesas fixas para o mesmo formato
      const despNorm = rowsDesp.map(d => ({
        id: d.id,
        mesAno: d.mesAno,
        tipoPagto: d.tipoPagto,
        cidadeUF: d.cidadeUF,
        empresa: d.empresa,
        chaveJ: d.chaveResp ?? null,
        chaveJResp: d.chaveResp ?? null,
        cadastro: null as string | null,
        nomeFavorecido: d.nome,
        banco: d.banco,
        agencia: d.agencia,
        conta: d.conta,
        cpfCnpj: d.cpfCnpj,
        tipoConta: d.tipoConta,
        pix: d.pix,
        valor: d.valor != null ? String(d.valor) : null,
        pago: d.pago ?? false,
        dataPagto: d.dataPagto,
        dataVencer: d.dataVencer,
        origem: 'despesa_fixa' as string,
        observacao: null as string | null,
        _fonte: 'despesa_fixa' as const,
      }));

      const pagNorm = rowsPag.map(p => ({ ...p, chaveJResp: p.chaveJResp ?? null, _fonte: 'pagamento' as const }));

      // Ordenar: não pagos primeiro (vencimento mais próximo sobe), depois pagos (mais recentes primeiro)
      const parseDataBR = (s: string | null | undefined): number => {
        if (!s) return 99999999; // sem data vai para o fim dos não pagos
        const p = s.split('/');
        if (p.length !== 3) return 99999999;
        return Number(p[2]) * 10000 + Number(p[1]) * 100 + Number(p[0]);
      };
      // Data de hoje como número AAAAMMDD
      const hoje = new Date();
      const hojeNum = hoje.getFullYear() * 10000 + (hoje.getMonth() + 1) * 100 + hoje.getDate();
      // Prioridade dos não pagos: 0=atrasado, 1=hoje, 2=futuro, 3=sem data
      const prioridade = (dataVencer: string | null | undefined): number => {
        const v = parseDataBR(dataVencer);
        if (v === 99999999) return 3; // sem data
        if (v < hojeNum) return 0;   // atrasado
        if (v === hojeNum) return 1; // vence hoje
        return 2;                    // futuro
      };
      // Considera como pago: campo pago=true OU dataPagto preenchido
      const isPago = (row: { pago: boolean | number | null; dataPagto: string | null }) =>
        !!(row.pago) || !!(row.dataPagto && row.dataPagto.length >= 8);
      const all = [...pagNorm, ...despNorm].sort((a, b) => {
        const aPago = isPago(a);
        const bPago = isPago(b);
        // Não pagos TODOS antes dos pagos
        if (aPago !== bPago) return aPago ? 1 : -1;
        if (!aPago) {
          const aPrio = prioridade(a.dataVencer);
          const bPrio = prioridade(b.dataVencer);
          // Primeiro por prioridade (atrasado=0 sobe, sem data=3 desce)
          if (aPrio !== bPrio) return aPrio - bPrio;
          // Dentro do mesmo grupo: data crescente (mais antigo/urgente primeiro)
          const aV = parseDataBR(a.dataVencer);
          const bV = parseDataBR(b.dataVencer);
          if (aV !== bV) return aV - bV;
          return b.id - a.id;
        } else {
          // Entre pagos: mais recente (maior id) primeiro
          return b.id - a.id;
        }
      });

      const total = all.length;
      const rows = all.slice(offset, offset + input.limit);
      return { rows, total };
    }),

  // Exportar todos os pagamentos filtrados (sem paginação)
  exportar: publicProcedure
    .input(z.object({
      mesAno: z.string().optional(),
      empresa: z.string().optional(),
      tipoPagto: z.string().optional(),
      pago: z.enum(["todos", "sim", "nao"]).default("todos"),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions: any[] = [];
      if (input.mesAno) conditions.push(eq(pagamentos.mesAno, input.mesAno));
      if (input.empresa) conditions.push(eq(pagamentos.empresa, input.empresa));
      if (input.tipoPagto) conditions.push(eq(pagamentos.tipoPagto, input.tipoPagto));
      if (input.pago === "sim") conditions.push(eq(pagamentos.pago, true));
      if (input.pago === "nao") conditions.push(eq(pagamentos.pago, false));

      return await db
        .select()
        .from(pagamentos)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(asc(pagamentos.empresa), asc(pagamentos.nomeFavorecido));
    }),

  // Resumo mensal: totais por tipo — filtra pela DATA DE PAGAMENTO (mês em que foi pago)
  // Para itens não pagos, usa mesAno como referência
  resumoMensal: publicProcedure
    .input(z.object({ mesAno: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const empty = { comissoes: { aPagar: 0, pago: 0 }, salarios: { aPagar: 0, pago: 0 }, alugueis: { aPagar: 0, pago: 0 }, energia: { aPagar: 0, pago: 0 }, agua: { aPagar: 0, pago: 0 }, internet: { aPagar: 0, pago: 0 }, outros: { aPagar: 0, pago: 0 }, total: { aPagar: 0, pago: 0 } };
      if (!db) return empty;

      // Extrair mês e ano do input (formato MM/AAAA)
      const [mesStr, anoStr] = input.mesAno.split('/');
      if (!mesStr || !anoStr) return empty;
      const mes = mesStr.padStart(2, '0');
      const ano = anoStr;

      // Pagamentos PAGOS neste mês: dataPagto contém o mês/ano (formato DD/MM/AAAA)
      // Usa SUBSTRING para extrair MM/AAAA da dataPagto
      const pagPagos = await db.select({
        tipoPagto: pagamentos.tipoPagto,
        total: sql<string>`COALESCE(SUM(CAST(valor AS DECIMAL(12,2))), 0)`,
      }).from(pagamentos)
        .where(and(
          eq(pagamentos.pago, true),
          sql`SUBSTRING(${pagamentos.dataPagto}, 4, 7) = ${`${mes}/${ano}`}`
        ))
        .groupBy(pagamentos.tipoPagto);

      // Pagamentos NÃO PAGOS: usa dataVencer (data prevista para pagamento) no mês selecionado
      // Se não tem dataVencer, usa mesAno como fallback
      const pagNaoPagos = await db.select({
        tipoPagto: pagamentos.tipoPagto,
        total: sql<string>`COALESCE(SUM(CAST(valor AS DECIMAL(12,2))), 0)`,
      }).from(pagamentos)
        .where(and(
          eq(pagamentos.pago, false),
          sql`(
            (${pagamentos.dataVencer} IS NOT NULL AND ${pagamentos.dataVencer} != '' AND SUBSTRING(${pagamentos.dataVencer}, 4, 7) = ${`${mes}/${ano}`})
            OR
            (${pagamentos.dataVencer} IS NULL OR ${pagamentos.dataVencer} = '') AND ${pagamentos.mesAno} = ${input.mesAno}
          )`
        ))
        .groupBy(pagamentos.tipoPagto);

      // Despesas fixas PAGAS neste mês
      const despPagas = await db.select({
        tipoPagto: despesasFixas.tipoPagto,
        total: sql<string>`COALESCE(SUM(CAST(valor AS DECIMAL(12,2))), 0)`,
      }).from(despesasFixas)
        .where(and(
          eq(despesasFixas.pago, true),
          sql`SUBSTRING(${despesasFixas.dataPagto}, 4, 7) = ${`${mes}/${ano}`}`
        ))
        .groupBy(despesasFixas.tipoPagto);

      // Despesas fixas NÃO PAGAS: usa dataVencer no mês selecionado, fallback para mesAno
      const despNaoPagas = await db.select({
        tipoPagto: despesasFixas.tipoPagto,
        total: sql<string>`COALESCE(SUM(CAST(valor AS DECIMAL(12,2))), 0)`,
      }).from(despesasFixas)
        .where(and(
          eq(despesasFixas.pago, false),
          sql`(
            (${despesasFixas.dataVencer} IS NOT NULL AND ${despesasFixas.dataVencer} != '' AND SUBSTRING(${despesasFixas.dataVencer}, 4, 7) = ${`${mes}/${ano}`})
            OR
            (${despesasFixas.dataVencer} IS NULL OR ${despesasFixas.dataVencer} = '') AND ${despesasFixas.mesAno} = ${input.mesAno}
          )`
        ))
        .groupBy(despesasFixas.tipoPagto);

      // Categorizar
      let comissoesPago = 0, comissoesAPagar = 0;
      let salariosPago = 0, salariosAPagar = 0;
      let alugueisPago = 0, alugueisAPagar = 0;
      let energiaPago = 0, energiaAPagar = 0;
      let aguaPago = 0, aguaAPagar = 0;
      let internetPago = 0, internetAPagar = 0;
      let outrosPago = 0, outrosAPagar = 0;

      const categorizar = (tipo: string, val: number, isPago: boolean) => {
        const t = (tipo || '').toLowerCase();
        if (t.includes('comiss')) {
          if (isPago) comissoesPago += val; else comissoesAPagar += val;
        } else if (t.includes('sal') && (t.includes('rio') || t.includes('ário') || t === 'salário' || t === 'salario')) {
          if (isPago) salariosPago += val; else salariosAPagar += val;
        } else if (t.includes('aluguel')) {
          if (isPago) alugueisPago += val; else alugueisAPagar += val;
        } else if (t.includes('energia') || t.includes('energ')) {
          if (isPago) energiaPago += val; else energiaAPagar += val;
        } else if (t.includes('agua') || t.includes('água')) {
          if (isPago) aguaPago += val; else aguaAPagar += val;
        } else if (t.includes('internet')) {
          if (isPago) internetPago += val; else internetAPagar += val;
        } else {
          if (isPago) outrosPago += val; else outrosAPagar += val;
        }
      };

      for (const row of pagPagos) categorizar(row.tipoPagto || '', parseFloat(String(row.total)) || 0, true);
      for (const row of pagNaoPagos) categorizar(row.tipoPagto || '', parseFloat(String(row.total)) || 0, false);
      for (const row of despPagas) categorizar(row.tipoPagto || '', parseFloat(String(row.total)) || 0, true);
      for (const row of despNaoPagas) categorizar(row.tipoPagto || '', parseFloat(String(row.total)) || 0, false);

      const totalAPagar = comissoesAPagar + salariosAPagar + alugueisAPagar + energiaAPagar + aguaAPagar + internetAPagar + outrosAPagar;
      const totalPago = comissoesPago + salariosPago + alugueisPago + energiaPago + aguaPago + internetPago + outrosPago;

      return {
        comissoes: { aPagar: comissoesAPagar, pago: comissoesPago },
        salarios: { aPagar: salariosAPagar, pago: salariosPago },
        alugueis: { aPagar: alugueisAPagar, pago: alugueisPago },
        energia: { aPagar: energiaAPagar, pago: energiaPago },
        agua: { aPagar: aguaAPagar, pago: aguaPago },
        internet: { aPagar: internetAPagar, pago: internetPago },
        outros: { aPagar: outrosAPagar, pago: outrosPago },
        total: { aPagar: totalAPagar, pago: totalPago },
      };
    }),

  // Gerar próximo código automático para lançamento avulso (ex: 001A, 002A, ...)
  nextCodigo: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return "001A";
    // Busca o maior id existente para gerar um código único
    const result = await db.select({ maxId: sql<number>`MAX(id)` }).from(pagamentos);
    const maxId = result[0]?.maxId ?? 0;
    const nextNum = (maxId + 1).toString().padStart(3, '0');
    return `${nextNum}A`;
  }),
};
