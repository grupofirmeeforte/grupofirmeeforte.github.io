import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { arquivoMorto, agentes } from "../../drizzle/schema";
import { eq, and, like, desc, asc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { storagePut, storageGetSignedUrl } from "../storage";

// Apenas CEO/Admin pode acessar o Arquivo Morto
async function isCeo(user: any): Promise<boolean> {
  if (!user) return false;
  // Owner do projeto (login OAuth Manus)
  if (user.role === "admin") return true;
  const ownerOpenId = process.env.OWNER_OPEN_ID;
  if (ownerOpenId && user.openId === ownerOpenId) return true;
  // Agente logado via ChaveJ — buscar cargo/permissoes no banco
  if (user.openId?.startsWith("agente_")) {
    const agenteId = parseInt(user.openId.replace("agente_", ""), 10);
    const db = await getDb();
    if (db) {
      const [row] = await db.select({ cargo: agentes.cargo, permissoes: agentes.permissoes })
        .from(agentes).where(eq(agentes.id, agenteId)).limit(1);
      if (row) {
        const cargo = (row.cargo ?? "").toUpperCase();
        if (["CEO", "ADM", "ADMIN"].includes(cargo)) return true;
        if ((row.permissoes ?? "") === "admin") return true;
      }
    }
  }
  return false;
}

const MODULOS = [
  "Consignado",
  "Consórcio",
  "Conta Corrente",
  "Ourocap",
  "Seguros",
  "BB Dental",
  "Febraban",
  "Cálculo",
  "Pagamentos",
  "Outros",
];

export const arquivoMortoRouter = router({
  // Listar arquivos
  list: protectedProcedure
    .input(z.object({
      modulo: z.string().optional(),
      mesAno: z.string().optional(),
      search: z.string().optional(),
      page: z.number().default(0),
      limit: z.number().default(50),
    }))
    .query(async ({ ctx, input }) => {
      if (!await isCeo(ctx.user)) throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito ao CEO" });
      const db = await getDb();
      if (!db) return { rows: [], total: 0 };

      const conditions: any[] = [];
      if (input.modulo && input.modulo !== "__all__") conditions.push(eq(arquivoMorto.modulo, input.modulo));
      if (input.mesAno && input.mesAno !== "__all__") conditions.push(eq(arquivoMorto.mesAno, input.mesAno));
      if (input.search) {
        const s = `%${input.search}%`;
        conditions.push(
          sql`(${arquivoMorto.nomeArquivo} LIKE ${s} OR ${arquivoMorto.numeroDoc} LIKE ${s})`
        );
      }
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [rows, countResult] = await Promise.all([
        db.select().from(arquivoMorto)
          .where(where)
          .orderBy(
            desc(sql`CONCAT(SUBSTRING(mesAno, 4, 4), SUBSTRING(mesAno, 1, 2))`),
            asc(arquivoMorto.modulo),
            desc(arquivoMorto.createdAt)
          )
          .limit(input.limit)
          .offset(input.page * input.limit),
        db.select({ count: sql<number>`COUNT(*)` }).from(arquivoMorto).where(where),
      ]);

      return { rows, total: Number(countResult[0]?.count ?? 0) };
    }),

  // Filtros disponíveis
  filtros: protectedProcedure.query(async ({ ctx }) => {
    if (!await isCeo(ctx.user)) throw new TRPCError({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) return { modulos: MODULOS, mesanos: [] };

    const mesanos = await db.selectDistinct({ v: arquivoMorto.mesAno }).from(arquivoMorto)
      .where(sql`mesAno IS NOT NULL AND mesAno != ''`)
      .orderBy(desc(sql`CONCAT(SUBSTRING(mesAno, 4, 4), SUBSTRING(mesAno, 1, 2))`));

    return {
      modulos: MODULOS,
      mesanos: mesanos.map(r => r.v!).filter(Boolean),
    };
  }),

  // Upload de arquivo
  upload: protectedProcedure
    .input(z.object({
      modulo: z.string(),
      mesAno: z.string().optional(),
      nomeArquivo: z.string(),
      tipoArquivo: z.string().optional(),
      tamanho: z.number().optional(),
      descricao: z.string().optional(),
      numeroDoc: z.string().optional(),
      // Arquivo em base64
      fileBase64: z.string(),
      mimeType: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!await isCeo(ctx.user)) throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito ao CEO" });
      const db = await getDb();
      if (!db) throw new Error("Banco não disponível");

      // Converter base64 para Buffer
      const buffer = Buffer.from(input.fileBase64, "base64");
      const ext = input.nomeArquivo.split(".").pop() ?? "bin";
      const key = `arquivo-morto/${input.modulo}/${input.mesAno ?? "sem-mes"}/${Date.now()}-${input.nomeArquivo}`;
      const mimeType = input.mimeType ?? "application/octet-stream";

      const { key: savedKey, url } = await storagePut(key, buffer, mimeType);

      await db.insert(arquivoMorto).values({
        modulo: input.modulo,
        mesAno: input.mesAno ?? null,
        nomeArquivo: input.nomeArquivo,
        tipoArquivo: input.tipoArquivo ?? ext,
        tamanho: input.tamanho ?? buffer.length,
        arquivoKey: savedKey,
        arquivoUrl: url,
        descricao: input.descricao ?? null,
        numeroDoc: input.numeroDoc ?? null,
        uploadadoPor: (ctx.user as any).nomeAgente ?? (ctx.user as any).name ?? "CEO",
      });

      return { ok: true, url };
    }),

  // Obter URL assinada para download
  getUrl: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!await isCeo(ctx.user)) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new Error("Banco não disponível");

      const [row] = await db.select().from(arquivoMorto).where(eq(arquivoMorto.id, input.id));
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });

      const url = await storageGetSignedUrl(row.arquivoKey);
      return { url, nomeArquivo: row.nomeArquivo };
    }),

  // Excluir arquivo
  excluir: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!await isCeo(ctx.user)) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new Error("Banco não disponível");
      await db.delete(arquivoMorto).where(eq(arquivoMorto.id, input.id));
      return { ok: true };
    }),
});
