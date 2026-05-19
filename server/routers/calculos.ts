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
        .orderBy(sql`CAST(${calculos.mesRef} AS UNSIGNED) DESC`, desc(calculos.createdAt), asc(calculos.empresa), asc(calculos.nomeAgente))
        .limit(input.limit)
        .offset(offset);

      return result;
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
      .orderBy(desc(calculos.mesRef));
    return result.map(r => r.mesRef).filter(Boolean);
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
        // Converter mesRef (ex: "426" ou "0426") para MM/AAAA
        let mesAno = reg.mesRef ?? "";
        if (mesAno.length === 3) mesAno = mesAno.slice(0, 1).padStart(2, "0") + "/20" + mesAno.slice(1);
        else if (mesAno.length === 4) mesAno = mesAno.slice(0, 2) + "/20" + mesAno.slice(2);

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
});
