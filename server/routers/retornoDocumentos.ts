import { z } from "zod";
import { publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

export const retornoDocumentosRouter = {
  listar: publicProcedure
    .input(z.object({
      empresa: z.string().optional(),
      pilar: z.string().optional(),
      area: z.string().optional(),
      search: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      let query = `SELECT * FROM retornoDocumentos WHERE 1=1`;
      const params: any[] = [];
      if (input.empresa && input.empresa !== "__all__") {
        if (input.empresa === "BMF") {
          query += ` AND numeroDoc LIKE 'BMF%'`;
        } else if (input.empresa === "Flex") {
          query += ` AND numeroDoc LIKE 'Flex%'`;
        }
      }
      if (input.pilar && input.pilar !== "__all__") {
        query += ` AND pilar = ?`;
        params.push(input.pilar);
      }
      if (input.area && input.area !== "__all__") {
        query += ` AND area = ?`;
        params.push(input.area);
      }
      if (input.search) {
        query += ` AND (nomeDocumento LIKE ? OR numeroDoc LIKE ? OR responsavel LIKE ?)`;
        params.push(`%${input.search}%`, `%${input.search}%`, `%${input.search}%`);
      }
      query += ` ORDER BY numeroDoc ASC`;
      const [rows] = await db.execute(sql.raw(query.replace(/\?/g, () => {
        const val = params.shift();
        return `'${String(val).replace(/'/g, "''")}'`;
      }))) as any;
      return rows as any[];
    }),

  proximoNumero: publicProcedure
    .input(z.object({ empresa: z.enum(["BMF", "Flex"]) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return `${input.empresa}01`;
      const prefix = input.empresa;
      const [rows] = await db.execute(sql`SELECT numeroDoc FROM retornoDocumentos WHERE numeroDoc LIKE ${prefix + '%'} ORDER BY LENGTH(numeroDoc) DESC, numeroDoc DESC LIMIT 1`) as any;
      const arr = rows as any[];
      if (arr.length === 0) return `${prefix}01`;
      const ultimo = arr[0].numeroDoc as string;
      const numStr = ultimo.replace(prefix, '');
      const num = parseInt(numStr, 10);
      const proximo = num + 1;
      return `${prefix}${String(proximo).padStart(2, '0')}`;
    }),

  filtros: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { pilares: [], areas: [] };
      const [pilares] = await db.execute(sql`SELECT DISTINCT pilar FROM retornoDocumentos WHERE pilar != '' ORDER BY pilar`) as any;
      const [areas] = await db.execute(sql`SELECT DISTINCT area FROM retornoDocumentos WHERE area != '' ORDER BY area`) as any;
    return {
      pilares: (pilares as any[]).map((r: any) => r.pilar),
      areas: (areas as any[]).map((r: any) => r.area),
    };
  }),

  criar: publicProcedure
    .input(z.object({
      numeroDoc: z.string(),
      pilar: z.string().default(''),
      nomeDocumento: z.string().default(''),
      finalidade: z.string().default(''),
      naPasta: z.string().default(''),
      area: z.string().default(''),
      responsavel: z.string().default(''),
      aprovador: z.string().default(''),
      versao: z.number().default(1),
      dataCriacao: z.string().nullable().default(null),
      publicacaoAtual: z.string().nullable().default(null),
      dataAtualizacao: z.string().nullable().default(null),
      codigoDocumento: z.string().default(''),
      fluxoAprovacao: z.string().default(''),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");
      await db.execute(sql`INSERT INTO retornoDocumentos (numeroDoc, pilar, nomeDocumento, finalidade, naPasta, area, responsavel, aprovador, versao, dataCriacao, publicacaoAtual, dataAtualizacao, codigoDocumento, fluxoAprovacao) VALUES (${input.numeroDoc}, ${input.pilar}, ${input.nomeDocumento}, ${input.finalidade}, ${input.naPasta}, ${input.area}, ${input.responsavel}, ${input.aprovador}, ${input.versao}, ${input.dataCriacao}, ${input.publicacaoAtual}, ${input.dataAtualizacao}, ${input.codigoDocumento}, ${input.fluxoAprovacao})`);
      return { ok: true };
    }),

  atualizar: publicProcedure
    .input(z.object({
      id: z.number(),
      pilar: z.string().optional(),
      nomeDocumento: z.string().optional(),
      finalidade: z.string().optional(),
      naPasta: z.string().optional(),
      area: z.string().optional(),
      responsavel: z.string().optional(),
      aprovador: z.string().optional(),
      versao: z.number().optional(),
      dataCriacao: z.string().nullable().optional(),
      publicacaoAtual: z.string().nullable().optional(),
      dataAtualizacao: z.string().nullable().optional(),
      codigoDocumento: z.string().optional(),
      fluxoAprovacao: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");
      const { id, ...fields } = input;
      const sets: string[] = [];
      const vals: any[] = [];
      for (const [key, val] of Object.entries(fields)) {
        if (val !== undefined) {
          sets.push(`${key} = ?`);
          vals.push(val);
        }
      }
      if (sets.length === 0) return { ok: true };
      vals.push(id);
      const query = `UPDATE retornoDocumentos SET ${sets.join(', ')} WHERE id = ?`;
      await db.execute(sql.raw(query.replace(/\?/g, () => {
        const v = vals.shift();
        if (v === null) return 'NULL';
        return `'${String(v).replace(/'/g, "''")}'`;
      })));
      return { ok: true };
    }),

  excluir: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");
      await db.execute(sql`DELETE FROM retornoDocumentos WHERE id = ${input.id}`);
      return { ok: true };
    }),
};
