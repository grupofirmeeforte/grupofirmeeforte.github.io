import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { pagamentos, agentes } from "../../drizzle/schema";
import { eq, and, like, desc, count, asc } from "drizzle-orm";

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

  // Listar tipos de pagamento disponíveis
  tiposPagto: publicProcedure.query(() => [...TIPOS_PAGTO]),

  // Criar novo pagamento (com bloqueio de duplicatas)
  criar: publicProcedure
    .input(z.object({
      mesAno: z.string().min(1, "Mês/Ano obrigatório"),
      tipoPagto: z.string().min(1, "Tipo de pagamento obrigatório"),
      cidadeUF: z.string().optional(),
      empresa: z.string().optional(),
      chaveJ: z.string().optional(),
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

      const { id, valor, ...rest } = input;
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
};
