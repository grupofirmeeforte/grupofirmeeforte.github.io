import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { contasBancarias, extratosBancarios } from "../../drizzle/schema";
import { eq, and, like, desc, asc } from "drizzle-orm";

export const extratosBancariosRouter = router({

  // ── Contas Bancárias ──────────────────────────────────────────────────────
  listarContas: protectedProcedure
    .input(z.object({ empresa: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb(); if (!db) return [] as any;
      const conditions: any[] = [eq(contasBancarias.ativa, 1)];
      if (input?.empresa) conditions.push(eq(contasBancarias.empresa, input.empresa));
      return db.select().from(contasBancarias)
        .where(and(...conditions))
        .orderBy(asc(contasBancarias.empresa), asc(contasBancarias.banco));
    }),

  criarConta: protectedProcedure
    .input(z.object({
      empresa: z.string().min(1),
      banco: z.string().min(1),
      agencia: z.string().optional(),
      conta: z.string().optional(),
      tipoConta: z.string().optional(),
      descricao: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb(); if (!db) return [] as any;
      await db.insert(contasBancarias).values({ ...input, ativa: 1 });
      return { ok: true };
    }),

  editarConta: protectedProcedure
    .input(z.object({
      id: z.number(),
      empresa: z.string().min(1),
      banco: z.string().min(1),
      agencia: z.string().optional(),
      conta: z.string().optional(),
      tipoConta: z.string().optional(),
      descricao: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb(); if (!db) return [] as any;
      const { id, ...data } = input;
      await db.update(contasBancarias).set(data).where(eq(contasBancarias.id, id));
      return { ok: true };
    }),

  desativarConta: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb(); if (!db) return [] as any;
      await db.update(contasBancarias).set({ ativa: 0 }).where(eq(contasBancarias.id, input.id));
      return { ok: true };
    }),

  // ── Lançamentos ──────────────────────────────────────────────────────────
  listar: protectedProcedure
    .input(z.object({
      contaId: z.number().optional(),
      empresa: z.string().optional(),
      mesRef: z.string().optional(),
      tipo: z.string().optional(),
      busca: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(100),
    }))
    .query(async ({ input }) => {
      const db = await getDb(); if (!db) return [] as any;
      const conditions: any[] = [];
      if (input.contaId) conditions.push(eq(extratosBancarios.contaId, input.contaId));
      if (input.empresa) conditions.push(eq(extratosBancarios.empresa, input.empresa));
      if (input.mesRef) conditions.push(eq(extratosBancarios.mesRef, input.mesRef));
      if (input.tipo) conditions.push(eq(extratosBancarios.tipo, input.tipo));
      if (input.busca) conditions.push(like(extratosBancarios.descricao, `%${input.busca}%`));

      return db.select().from(extratosBancarios)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(extratosBancarios.data), desc(extratosBancarios.id))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize);
    }),

  totais: protectedProcedure
    .input(z.object({
      contaId: z.number().optional(),
      empresa: z.string().optional(),
      mesRef: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb(); if (!db) return [] as any;
      const conditions: any[] = [];
      if (input.contaId) conditions.push(eq(extratosBancarios.contaId, input.contaId));
      if (input.empresa) conditions.push(eq(extratosBancarios.empresa, input.empresa));
      if (input.mesRef) conditions.push(eq(extratosBancarios.mesRef, input.mesRef));

      const rows = await db.select().from(extratosBancarios)
        .where(conditions.length ? and(...conditions) : undefined);

      let totalCredito = 0;
      let totalDebito = 0;
      for (const r of rows) {
        const v = parseFloat(String(r.valor)) || 0;
        if (r.tipo === "CRÉDITO") totalCredito += v;
        else totalDebito += v;
      }
      return { totalCredito, totalDebito, saldo: totalCredito - totalDebito, count: rows.length };
    }),

  criar: protectedProcedure
    .input(z.object({
      contaId: z.number(),
      empresa: z.string().min(1),
      data: z.string().min(1),
      descricao: z.string().min(1),
      valor: z.number(),
      tipo: z.enum(["CRÉDITO", "DÉBITO"]),
      categoria: z.string().optional(),
      numeroDocumento: z.string().optional(),
      saldo: z.number().optional(),
      origem: z.string().optional(),
      mesRef: z.string().optional(),
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb(); if (!db) return [] as any;
      let mesRef = input.mesRef;
      if (!mesRef && input.data && input.data.length >= 7) {
        const parts = input.data.split("/");
        if (parts.length === 3) mesRef = `${parts[1]}/${parts[2]}`;
      }
      await db.insert(extratosBancarios).values({
        contaId: input.contaId,
        empresa: input.empresa,
        data: input.data,
        descricao: input.descricao,
        valor: String(input.valor) as any,
        tipo: input.tipo,
        categoria: input.categoria,
        numeroDocumento: input.numeroDocumento,
        saldo: input.saldo !== undefined ? String(input.saldo) as any : undefined,
        origem: input.origem || "MANUAL",
        mesRef,
        observacoes: input.observacoes,
      });
      return { ok: true };
    }),

  editar: protectedProcedure
    .input(z.object({
      id: z.number(),
      data: z.string().optional(),
      descricao: z.string().optional(),
      valor: z.number().optional(),
      tipo: z.enum(["CRÉDITO", "DÉBITO"]).optional(),
      categoria: z.string().optional(),
      numeroDocumento: z.string().optional(),
      saldo: z.number().optional(),
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb(); if (!db) return [] as any;
      const { id, valor, saldo, ...rest } = input;
      const update: Record<string, any> = { ...rest };
      if (valor !== undefined) update.valor = String(valor);
      if (saldo !== undefined) update.saldo = String(saldo);
      await db.update(extratosBancarios).set(update).where(eq(extratosBancarios.id, id));
      return { ok: true };
    }),

  excluir: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb(); if (!db) return [] as any;
      await db.delete(extratosBancarios).where(eq(extratosBancarios.id, input.id));
      return { ok: true };
    }),

  mesesDisponiveis: protectedProcedure
    .input(z.object({ empresa: z.string().optional(), contaId: z.number().optional() }))
    .query(async ({ input }) => {
      const db = await getDb(); if (!db) return [] as any;
      const conditions: any[] = [];
      if (input.empresa) conditions.push(eq(extratosBancarios.empresa, input.empresa));
      if (input.contaId) conditions.push(eq(extratosBancarios.contaId, input.contaId));

      const rows = await db.select({ mesRef: extratosBancarios.mesRef })
        .from(extratosBancarios)
        .where(conditions.length ? and(...conditions) : undefined);

      const mesesSet = new Set<string>();
      rows.forEach((r) => { if (r.mesRef) mesesSet.add(r.mesRef); });
      return Array.from(mesesSet).sort().reverse();
    }),
});
