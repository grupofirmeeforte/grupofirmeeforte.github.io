import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { uniformesCrachas, agentes } from "../../drizzle/schema";
import { eq, like, and, or, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { storagePut } from "../storage";

const TIPOS_ITEM = ["Uniforme", "Crachá", "Colete", "Boné", "Camisa", "Calça", "Outros"] as const;
const TAMANHOS = ["PP", "P", "M", "G", "GG", "XGG", "Único"] as const;
const SITUACOES = ["Entregue", "Pendente", "Devolvido", "Extraviado"] as const;

export const uniformesCrachasRouter = router({
  // Listar com filtros
  listar: publicProcedure
    .input(z.object({
      chaveJ: z.string().optional(),
      nomeAgente: z.string().optional(),
      tipoItem: z.string().optional(),
      situacao: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const conditions: any[] = [];
      if (input?.chaveJ) conditions.push(like(uniformesCrachas.chaveJ, `%${input.chaveJ}%`));
      if (input?.nomeAgente) conditions.push(like(uniformesCrachas.nomeAgente, `%${input.nomeAgente}%`));
      if (input?.tipoItem) conditions.push(eq(uniformesCrachas.tipoItem, input.tipoItem));
      if (input?.situacao) conditions.push(eq(uniformesCrachas.situacao, input.situacao));
      return await db
        .select()
        .from(uniformesCrachas)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(uniformesCrachas.createdAt));
    }),

  // Buscar agente pelo chaveJ para autocompletar nome
  buscarAgente: publicProcedure
    .input(z.object({ chaveJ: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db
        .select({ chaveJ: agentes.chaveJ, nomeAgente: agentes.nomeAgente })
        .from(agentes)
        .where(like(agentes.chaveJ, `%${input.chaveJ}%`))
        .limit(1);
      return rows[0] ?? null;
    }),

  // Criar novo registro
  criar: publicProcedure
    .input(z.object({
      chaveJ: z.string().optional(),
      nomeAgente: z.string().optional(),
      tipoItem: z.string().min(1),
      tamanho: z.string().optional(),
      quantidade: z.number().optional(),
      dataEntrega: z.string().optional(),
      situacao: z.string().optional(),
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });
      const result = await db.insert(uniformesCrachas).values({
        chaveJ: input.chaveJ ?? null,
        nomeAgente: input.nomeAgente ?? null,
        tipoItem: input.tipoItem,
        tamanho: input.tamanho ?? null,
        quantidade: input.quantidade ?? 1,
        dataEntrega: input.dataEntrega ?? null,
        situacao: input.situacao ?? "Entregue",
        observacoes: input.observacoes ?? null,
      } as any);
      return { success: true, id: (result as any).insertId };
    }),

  // Editar registro
  editar: publicProcedure
    .input(z.object({
      id: z.number(),
      chaveJ: z.string().optional(),
      nomeAgente: z.string().optional(),
      tipoItem: z.string().optional(),
      tamanho: z.string().optional(),
      quantidade: z.number().optional(),
      dataEntrega: z.string().optional(),
      situacao: z.string().optional(),
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });
      const { id, ...data } = input;
      await db.update(uniformesCrachas).set(data as any).where(eq(uniformesCrachas.id, id));
      return { success: true };
    }),

  // Deletar registro
  deletar: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });
      await db.delete(uniformesCrachas).where(eq(uniformesCrachas.id, input.id));
      return { success: true };
    }),

  // Upload de foto
  uploadFoto: publicProcedure
    .input(z.object({
      id: z.number(),
      arquivoNome: z.string().min(1),
      arquivoTipo: z.string().min(1),
      arquivoBase64: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });
      const buffer = Buffer.from(input.arquivoBase64, "base64");
      const ext = input.arquivoNome.split(".").pop() ?? "jpg";
      const fileKey = `uniformes-crachas/${input.id}/${Date.now()}.${ext}`;
      const { url, key } = await storagePut(fileKey, buffer, input.arquivoTipo);
      await db.update(uniformesCrachas)
        .set({ fotoUrl: url, fotoKey: key } as any)
        .where(eq(uniformesCrachas.id, input.id));
      return { success: true, url };
    }),

  // Listar opções
  opcoes: publicProcedure.query(() => ({
    tiposItem: [...TIPOS_ITEM],
    tamanhos: [...TAMANHOS],
    situacoes: [...SITUACOES],
  })),
});
