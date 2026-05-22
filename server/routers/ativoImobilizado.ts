import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { ativosImobilizados } from "../../drizzle/schema";
import { eq, like, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { storagePut } from "../storage";

const CATEGORIAS = ["Móvel", "Equipamento", "Veículo", "Imóvel", "Eletrônico", "Outros"] as const;
const SITUACOES = ["Ativo", "Em Manutenção", "Baixado", "Extraviado"] as const;

export const ativoImobilizadoRouter = router({
  // Listar com filtros
  listar: publicProcedure
    .input(z.object({
      descricao: z.string().optional(),
      categoria: z.string().optional(),
      situacao: z.string().optional(),
      responsavel: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const conditions: any[] = [];
      if (input?.descricao) conditions.push(like(ativosImobilizados.descricao, `%${input.descricao}%`));
      if (input?.categoria) conditions.push(eq(ativosImobilizados.categoria, input.categoria));
      if (input?.situacao) conditions.push(eq(ativosImobilizados.situacao, input.situacao));
      if (input?.responsavel) conditions.push(like(ativosImobilizados.responsavel, `%${input.responsavel}%`));
      return await db
        .select()
        .from(ativosImobilizados)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(ativosImobilizados.createdAt));
    }),

  // Criar novo ativo
  criar: publicProcedure
    .input(z.object({
      descricao: z.string().min(1),
      categoria: z.string().optional(),
      numeroPatrimonio: z.string().optional(),
      valorAquisicao: z.string().optional(),
      dataAquisicao: z.string().optional(),
      vidaUtilAnos: z.number().optional(),
      taxaDepreciacao: z.string().optional(),
      valorResidual: z.string().optional(),
      localizacao: z.string().optional(),
      responsavel: z.string().optional(),
      situacao: z.string().optional(),
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });
      const result = await db.insert(ativosImobilizados).values({
        descricao: input.descricao,
        categoria: input.categoria ?? null,
        numeroPatrimonio: input.numeroPatrimonio ?? null,
        valorAquisicao: input.valorAquisicao ?? null,
        dataAquisicao: input.dataAquisicao ?? null,
        vidaUtilAnos: input.vidaUtilAnos ?? null,
        taxaDepreciacao: input.taxaDepreciacao ?? null,
        valorResidual: input.valorResidual ?? null,
        localizacao: input.localizacao ?? null,
        responsavel: input.responsavel ?? null,
        situacao: input.situacao ?? "Ativo",
        observacoes: input.observacoes ?? null,
      } as any);
      return { success: true, id: (result as any).insertId };
    }),

  // Editar ativo
  editar: publicProcedure
    .input(z.object({
      id: z.number(),
      descricao: z.string().min(1).optional(),
      categoria: z.string().optional(),
      numeroPatrimonio: z.string().optional(),
      valorAquisicao: z.string().optional(),
      dataAquisicao: z.string().optional(),
      vidaUtilAnos: z.number().optional(),
      taxaDepreciacao: z.string().optional(),
      valorResidual: z.string().optional(),
      localizacao: z.string().optional(),
      responsavel: z.string().optional(),
      situacao: z.string().optional(),
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });
      const { id, ...data } = input;
      await db.update(ativosImobilizados).set(data as any).where(eq(ativosImobilizados.id, id));
      return { success: true };
    }),

  // Deletar ativo
  deletar: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });
      await db.delete(ativosImobilizados).where(eq(ativosImobilizados.id, input.id));
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
      const fileKey = `ativos-imobilizados/${input.id}/${Date.now()}.${ext}`;
      const { url, key } = await storagePut(fileKey, buffer, input.arquivoTipo);
      await db.update(ativosImobilizados)
        .set({ fotoUrl: url, fotoKey: key } as any)
        .where(eq(ativosImobilizados.id, input.id));
      return { success: true, url };
    }),

  // Listar categorias e situações
  opcoes: publicProcedure.query(() => ({
    categorias: [...CATEGORIAS],
    situacoes: [...SITUACOES],
  })),
});
