import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { despesasFixas } from "../../drizzle/schema";
import { eq, and, like, desc, count } from "drizzle-orm";

export const despesasFixasRouter = router({
  // Listar com filtros e paginação
  list: publicProcedure
    .input(z.object({
      mesAno: z.string().optional(),
      empresa: z.string().optional(),
      tipoPagto: z.string().optional(),
      pago: z.enum(["todos", "sim", "nao"]).default("todos"),
      nome: z.string().optional(),
      page: z.number().default(1),
      limit: z.number().default(100),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      const offset = (input.page - 1) * input.limit;
      const conditions: any[] = [];
      if (input.mesAno) conditions.push(eq(despesasFixas.mesAno, input.mesAno));
      if (input.empresa) conditions.push(eq(despesasFixas.empresa, input.empresa));
      if (input.tipoPagto) conditions.push(eq(despesasFixas.tipoPagto, input.tipoPagto));
      if (input.nome) conditions.push(like(despesasFixas.nome, `%${input.nome}%`));
      if (input.pago === "sim") conditions.push(eq(despesasFixas.pago, true));
      if (input.pago === "nao") conditions.push(eq(despesasFixas.pago, false));

      // Ordenar por mesAno desc (MM/AAAA -> converter para AAAA/MM para ordenar)
      const rows = await db!
        .select()
        .from(despesasFixas)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .limit(input.limit)
        .offset(offset);

      // Ordenar no JS: MM/AAAA -> AAAA/MM para comparação
      rows.sort((a, b) => {
        const toSort = (s: string | null) => {
          if (!s) return '';
          const parts = s.split('/');
          if (parts.length === 2) return `${parts[1]}/${parts[0]}`;
          return s;
        };
        return toSort(b.mesAno) > toSort(a.mesAno) ? 1 : -1;
      });
      return rows;
    }),

  // Contar total
  count: publicProcedure
    .input(z.object({
      mesAno: z.string().optional(),
      empresa: z.string().optional(),
      tipoPagto: z.string().optional(),
      pago: z.enum(["todos", "sim", "nao"]).default("todos"),
      nome: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      const conditions: any[] = [];
      if (input.mesAno) conditions.push(eq(despesasFixas.mesAno, input.mesAno));
      if (input.empresa) conditions.push(eq(despesasFixas.empresa, input.empresa));
      if (input.tipoPagto) conditions.push(eq(despesasFixas.tipoPagto, input.tipoPagto));
      if (input.nome) conditions.push(like(despesasFixas.nome, `%${input.nome}%`));
      if (input.pago === "sim") conditions.push(eq(despesasFixas.pago, true));
      if (input.pago === "nao") conditions.push(eq(despesasFixas.pago, false));

      const result = await db!
        .select({ total: count() })
        .from(despesasFixas)
        .where(conditions.length > 0 ? and(...conditions) : undefined);
      return result[0]?.total ?? 0;
    }),

  // Meses disponíveis
  meses: publicProcedure.query(async () => {
    const db = await getDb();
    const rows = await db!
      .selectDistinct({ mesAno: despesasFixas.mesAno })
      .from(despesasFixas);
    const meses = rows.map((r: any) => r.mesAno).filter(Boolean) as string[];
    // Ordenar MM/AAAA do mais recente para o mais antigo
    meses.sort((a, b) => {
      const toSort = (s: string) => { const p = s.split('/'); return p.length === 2 ? `${p[1]}/${p[0]}` : s; };
      return toSort(b) > toSort(a) ? 1 : -1;
    });
    return meses;
  }),

  // Empresas disponíveis
  empresas: publicProcedure.query(async () => {
    const db = await getDb();
    const rows = await db!
      .selectDistinct({ empresa: despesasFixas.empresa })
      .from(despesasFixas)
      .orderBy(despesasFixas.empresa);
    return rows.map((r: any) => r.empresa).filter(Boolean) as string[];
  }),

  // Criar
  criar: publicProcedure
    .input(z.object({
      mesAno: z.string().optional(),
      tipoPagto: z.string().optional(),
      cidadeUF: z.string().optional(),
      empresa: z.string().optional(),
      chaveResp: z.string().optional(),
      nome: z.string().optional(),
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
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db!.insert(despesasFixas).values({
        mesAno: input.mesAno || null,
        tipoPagto: input.tipoPagto || null,
        cidadeUF: input.cidadeUF || null,
        empresa: input.empresa || null,
        chaveResp: input.chaveResp || null,
        nome: input.nome || null,
        banco: input.banco || null,
        agencia: input.agencia || null,
        conta: input.conta || null,
        cpfCnpj: input.cpfCnpj || null,
        tipoConta: input.tipoConta || null,
        pix: input.pix || null,
        valor: input.valor || null,
        pago: input.pago ?? false,
        dataPagto: input.dataPagto || null,
        dataVencer: input.dataVencer || null,
      });
      return { ok: true };
    }),

  // Editar
  editar: publicProcedure
    .input(z.object({
      id: z.number(),
      mesAno: z.string().optional(),
      tipoPagto: z.string().optional(),
      cidadeUF: z.string().optional(),
      empresa: z.string().optional(),
      chaveResp: z.string().optional(),
      nome: z.string().optional(),
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
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const { id, ...rest } = input;
      const update: any = {};
      if (rest.mesAno !== undefined) update.mesAno = rest.mesAno || null;
      if (rest.tipoPagto !== undefined) update.tipoPagto = rest.tipoPagto || null;
      if (rest.cidadeUF !== undefined) update.cidadeUF = rest.cidadeUF || null;
      if (rest.empresa !== undefined) update.empresa = rest.empresa || null;
      if (rest.chaveResp !== undefined) update.chaveResp = rest.chaveResp || null;
      if (rest.nome !== undefined) update.nome = rest.nome || null;
      if (rest.banco !== undefined) update.banco = rest.banco || null;
      if (rest.agencia !== undefined) update.agencia = rest.agencia || null;
      if (rest.conta !== undefined) update.conta = rest.conta || null;
      if (rest.cpfCnpj !== undefined) update.cpfCnpj = rest.cpfCnpj || null;
      if (rest.tipoConta !== undefined) update.tipoConta = rest.tipoConta || null;
      if (rest.pix !== undefined) update.pix = rest.pix || null;
      if (rest.valor !== undefined) update.valor = rest.valor || null;
      if (rest.pago !== undefined) update.pago = rest.pago;
      if (rest.dataPagto !== undefined) update.dataPagto = rest.dataPagto || null;
      if (rest.dataVencer !== undefined) update.dataVencer = rest.dataVencer || null;
      await db!.update(despesasFixas).set(update).where(eq(despesasFixas.id, id));
      return { ok: true };
    }),

  // Deletar
  deletar: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db!.delete(despesasFixas).where(eq(despesasFixas.id, input.id));
      return { ok: true };
    }),
});
