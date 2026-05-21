import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { documentosAgentes, agentes } from "../../drizzle/schema";
import { eq, and, like, or, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { storagePut } from "../storage";

const TIPOS_DOCUMENTO = [
  "Contrato",
  "RG",
  "CPF",
  "Comprovante de Endereço",
  "CNH",
  "Comprovante de Conta Bancária",
  "Foto 3x4",
  "Outros",
] as const;

export const documentosAgentesRouter = router({
  // Listar documentos com filtros
  listar: publicProcedure
    .input(z.object({
      chaveJ: z.string().optional(),
      nomeAgente: z.string().optional(),
      tipoDocumento: z.string().optional(),
      empresa: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const conditions: any[] = [];
      if (input?.chaveJ) conditions.push(like(documentosAgentes.chaveJ, `%${input.chaveJ}%`));
      if (input?.nomeAgente) conditions.push(like(documentosAgentes.nomeAgente, `%${input.nomeAgente}%`));
      if (input?.tipoDocumento) conditions.push(eq(documentosAgentes.tipoDocumento, input.tipoDocumento));
      if (input?.empresa) conditions.push(eq(documentosAgentes.empresa, input.empresa));
      return await db
        .select()
        .from(documentosAgentes)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(documentosAgentes.createdAt));
    }),

  // Buscar agentes do cadastro (para autocomplete - sem repetição)
  buscarAgentes: publicProcedure
    .input(z.object({ busca: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const conditions: any[] = [];
      if (input?.busca && input.busca.trim()) {
        conditions.push(
          or(
            like(agentes.chaveJ, `%${input.busca}%`),
            like(agentes.nomeAgente, `%${input.busca}%`)
          )
        );
      }
      const rows = await db
        .select({
          chaveJ: agentes.chaveJ,
          nomeAgente: agentes.nomeAgente,
          empresa: agentes.empresa,
        })
        .from(agentes)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(agentes.nomeAgente)
        .limit(500);
      return rows.filter(r => r.chaveJ);
    }),

  // Upload de documento (recebe base64)
  upload: publicProcedure
    .input(z.object({
      chaveJ: z.string().min(1),
      nomeAgente: z.string().optional(),
      empresa: z.string().optional(),
      tipoDocumento: z.string().min(1),
      descricao: z.string().optional(),
      observacao: z.string().optional(),
      adicionadoPor: z.string().optional(),
      arquivoNome: z.string().min(1),
      arquivoTipo: z.string().min(1),
      arquivoBase64: z.string().min(1), // base64 sem prefixo data:...
      tamanho: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });

      // Converter base64 para Buffer
      const buffer = Buffer.from(input.arquivoBase64, "base64");

      // Gerar chave única no S3
      const ext = input.arquivoNome.split(".").pop() ?? "bin";
      const timestamp = Date.now();
      const fileKey = `docs-agentes/${input.chaveJ}/${timestamp}-${input.arquivoNome.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

      const { url } = await storagePut(fileKey, buffer, input.arquivoTipo);

      // Salvar no banco
      await db.insert(documentosAgentes).values({
        chaveJ: input.chaveJ,
        nomeAgente: input.nomeAgente ?? null,
        empresa: input.empresa ?? null,
        tipoDocumento: input.tipoDocumento,
        descricao: input.descricao ?? null,
        arquivoUrl: url,
        arquivoKey: fileKey,
        arquivoNome: input.arquivoNome,
        arquivoTipo: input.arquivoTipo,
        tamanho: input.tamanho ?? buffer.length,
        adicionadoPor: input.adicionadoPor ?? null,
        observacao: input.observacao ?? null,
      } as any);

      return { success: true, url };
    }),

  // Deletar documento
  deletar: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });
      await db.delete(documentosAgentes).where(eq(documentosAgentes.id, input.id));
      return { success: true };
    }),

  // Listar tipos de documento disponíveis
  tiposDocumento: publicProcedure.query(() => {
    return [...TIPOS_DOCUMENTO];
  }),

  // Listar todos os agentes do cadastro com contagem de documentos
  listarAgentesComDocs: publicProcedure
    .input(z.object({ busca: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const { sql: sqlD, count } = await import('drizzle-orm');

      // Buscar todos os agentes
      const conditions: any[] = [];
      if (input?.busca && input.busca.trim()) {
        conditions.push(
          or(
            like(agentes.chaveJ, `%${input.busca}%`),
            like(agentes.nomeAgente, `%${input.busca}%`)
          )
        );
      }

      const listaAgentes = await db
        .select({
          chaveJ: agentes.chaveJ,
          nomeAgente: agentes.nomeAgente,
          empresa: agentes.empresa,
          situacao: agentes.situacao,
        })
        .from(agentes)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(agentes.nomeAgente)
        .limit(1000);

      // Buscar contagem de documentos por chaveJ
      const contagens = await db
        .select({
          chaveJ: documentosAgentes.chaveJ,
          qtd: sqlD<number>`COUNT(*)`,
        })
        .from(documentosAgentes)
        .groupBy(documentosAgentes.chaveJ);

      const contagemMap = new Map<string, number>();
      for (const c of contagens) {
        if (c.chaveJ) contagemMap.set(c.chaveJ, Number(c.qtd));
      }

      return listaAgentes
        .filter(a => a.chaveJ)
        .map(a => ({
          ...a,
          qtdDocumentos: contagemMap.get(a.chaveJ!) ?? 0,
        }));
    }),
});
