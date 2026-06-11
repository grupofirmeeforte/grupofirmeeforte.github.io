import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { reajustes, pagamentos, agentes } from "../../drizzle/schema";
import { eq, and, desc, inArray } from "drizzle-orm";

export const reajustesRouter = {
  // Listar reajustes com filtros
  list: protectedProcedure
    .input(z.object({
      mesRef: z.string().optional(),
      empresa: z.string().optional(),
      status: z.enum(["pendente", "enviado", "cancelado", "todos"]).default("todos"),
      chaveJ: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const conditions: any[] = [];
      if (input.mesRef) conditions.push(eq(reajustes.mesRef, input.mesRef));
      if (input.empresa) conditions.push(eq(reajustes.empresa, input.empresa));
      if (input.chaveJ) conditions.push(eq(reajustes.chaveJ, input.chaveJ));
      if (input.status !== "todos") conditions.push(eq(reajustes.status, input.status));
      return await db
        .select()
        .from(reajustes)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(reajustes.createdAt));
    }),

  // Criar reajuste manualmente
  create: protectedProcedure
    .input(z.object({
      mesRef: z.string(),
      empresa: z.string().optional(),
      chaveJ: z.string(),
      nomeAgente: z.string().optional(),
      nrOperacao: z.string().optional(),
      tipoProduto: z.string().optional(),
      convenio: z.string().optional(),
      valorPagoAnterior: z.number().default(0),
      novoValor: z.number(),
      observacao: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Buscar nome do agente se não fornecido
      let nomeAgente = input.nomeAgente;
      if (!nomeAgente && input.chaveJ) {
        const ag = await db.select({ nomeAgente: agentes.nomeAgente }).from(agentes).where(eq(agentes.chaveJ, input.chaveJ)).limit(1);
        nomeAgente = ag[0]?.nomeAgente ?? undefined;
      }

      const diferenca = parseFloat((input.novoValor - input.valorPagoAnterior).toFixed(2));

      await db.insert(reajustes).values({
        mesRef: input.mesRef,
        empresa: input.empresa ?? null,
        chaveJ: input.chaveJ,
        nomeAgente: nomeAgente ?? null,
        nrOperacao: input.nrOperacao ?? null,
        tipoProduto: input.tipoProduto ?? null,
        convenio: input.convenio ?? null,
        valorPagoAnterior: String(input.valorPagoAnterior),
        novoValor: String(input.novoValor),
        diferenca: String(diferenca),
        status: "pendente",
        observacao: input.observacao ?? null,
      });

      return { ok: true };
    }),

  // Enviar reajustes selecionados para pagamento
  enviarParaPagamento: protectedProcedure
    .input(z.object({
      ids: z.array(z.number()),
      mesAno: z.string(), // MM/AAAA do mês de pagamento
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Buscar os reajustes selecionados
      const itens = await db.select().from(reajustes).where(inArray(reajustes.id, input.ids));
      if (!itens.length) throw new TRPCError({ code: "NOT_FOUND", message: "Nenhum reajuste encontrado" });

      const hoje = new Date();
      const dataHoje = `${String(hoje.getDate()).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`;
      const nomeEnviador = (ctx.user as any)?.name ?? "Sistema";

      for (const item of itens) {
        if (item.status === "enviado") continue;

        // Buscar dados bancários do agente
        const ag = await db.select().from(agentes).where(eq(agentes.chaveJ, item.chaveJ)).limit(1);
        const agente = ag[0];

        // Criar lançamento de pagamento
        const [result] = await db.insert(pagamentos).values({
          mesAno: input.mesAno,
          tipoPagto: "Reajuste",
          empresa: item.empresa ?? null,
          chaveJ: item.chaveJ,
          nomeFavorecido: item.nomeAgente ?? agente?.nomeAgente ?? null,
          banco: agente?.banco ?? null,
          agencia: agente?.agencia ?? null,
          conta: agente?.conta ?? null,
          cpfCnpj: agente?.cpfAgente ?? null,
          tipoConta: agente?.tipo ?? null,
          pix: agente?.pix ?? null,
          valor: String(item.diferenca),
          pago: false,
          dataVencer: dataHoje,
          origem: "sistema",
          observacao: `Reajuste ref. operação ${item.nrOperacao ?? ''} - ${item.tipoProduto ?? ''} - Mês ref: ${item.mesRef}`,
          chaveJResp: (ctx.user as any)?.chaveJ ?? null,
        } as any);

        // Atualizar status do reajuste
        await db.update(reajustes)
          .set({
            status: "enviado",
            enviadoPor: nomeEnviador,
            dataEnvio: dataHoje,
          })
          .where(eq(reajustes.id, item.id));
      }

      return { ok: true, enviados: itens.length };
    }),

  // Cancelar reajuste
  cancelar: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(reajustes).set({ status: "cancelado" }).where(eq(reajustes.id, input.id));
      return { ok: true };
    }),

  // Deletar reajuste
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(reajustes).where(eq(reajustes.id, input.id));
      return { ok: true };
    }),
};
