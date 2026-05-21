import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { contasLojas } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { storagePut } from "../storage";
import { TRPCError } from "@trpc/server";

export const contasLojasRouter = router({
  // Listar contas com filtros opcionais
  listar: protectedProcedure
    .input(z.object({
      loja: z.string().optional(),
      tipo: z.string().optional(),
      mesAno: z.string().optional(),
      pago: z.enum(["todos", "pago", "nao_pago"]).default("todos"),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const rows = await db.select().from(contasLojas)
        .orderBy(desc(contasLojas.createdAt));

      return rows.filter(r => {
        if (input.loja && !r.loja.toLowerCase().includes(input.loja.toLowerCase())) return false;
        if (input.tipo && !r.tipo.toLowerCase().includes(input.tipo.toLowerCase())) return false;
        if (input.mesAno && r.mesAno !== input.mesAno) return false;
        if (input.pago === "pago" && !r.pago) return false;
        if (input.pago === "nao_pago" && r.pago) return false;
        return true;
      });
    }),

  // Criar nova conta
  criar: protectedProcedure
    .input(z.object({
      loja: z.string().min(1),
      tipo: z.string().min(1),
      mesAno: z.string().optional(),
      valor: z.string().optional(),
      vencimento: z.string().optional(),
      observacao: z.string().optional(),
      arquivoUrl: z.string().optional(),
      arquivoKey: z.string().optional(),
      arquivoNome: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const adicionadoPor = (ctx.user as any)?.nomeAgente || (ctx.user as any)?.name || "Sistema";

      await db.insert(contasLojas).values({
        ...input,
        pago: false,
        adicionadoPor,
      });

      return { success: true };
    }),

  // Upload de arquivo (base64 → S3)
  uploadArquivo: protectedProcedure
    .input(z.object({
      fileName: z.string(),
      fileBase64: z.string(),
      mimeType: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const buffer = Buffer.from(input.fileBase64, "base64");
      const userId = (ctx.user as any)?.id ?? "anon";
      const key = `contas-lojas/${userId}-${Date.now()}-${input.fileName}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      return { url, key, fileName: input.fileName };
    }),

  // Marcar como pago / desmarcar
  marcarPago: protectedProcedure
    .input(z.object({
      id: z.number(),
      pago: z.boolean(),
      dataPagto: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const pagoPor = input.pago
        ? ((ctx.user as any)?.nomeAgente || (ctx.user as any)?.name || "Sistema")
        : null;

      await db.update(contasLojas)
        .set({
          pago: input.pago,
          dataPagto: input.dataPagto ?? null,
          pagoPor: pagoPor ?? undefined,
        })
        .where(eq(contasLojas.id, input.id));

      return { success: true };
    }),

  // Editar conta
  editar: protectedProcedure
    .input(z.object({
      id: z.number(),
      loja: z.string().min(1).optional(),
      tipo: z.string().min(1).optional(),
      mesAno: z.string().optional(),
      valor: z.string().optional(),
      vencimento: z.string().optional(),
      observacao: z.string().optional(),
      arquivoUrl: z.string().optional(),
      arquivoKey: z.string().optional(),
      arquivoNome: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const { id, ...data } = input;
      await db.update(contasLojas).set(data).where(eq(contasLojas.id, id));
      return { success: true };
    }),

  // Deletar conta
  deletar: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      await db.delete(contasLojas).where(eq(contasLojas.id, input.id));
      return { success: true };
    }),

  // Listar lojas distintas para o filtro
  listarLojas: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.select({ loja: contasLojas.loja }).from(contasLojas);
    const unique = Array.from(new Set(rows.map(r => r.loja))).sort();
    return unique;
  }),
});
