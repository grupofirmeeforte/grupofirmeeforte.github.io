import { eq, like, and, desc, isNotNull } from "drizzle-orm";
import { z } from "zod";
import { agentes } from "../../drizzle/schema";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";

// Schema de validação para Agente
const agenteSchema = z.object({
  numCadastro: z.string().optional(),
  empresa: z.string().optional(),
  chaveJ: z.string().optional(),
  senha: z.string().optional(),
  nomeAgente: z.string().min(1, "Nome do agente é obrigatório"),
  dataAdmissao: z.string().optional(),
  cargo: z.string().optional(),
  area: z.string().optional(),
  vinculo: z.string().optional(),
  situacao: z.string().optional(),
  nrAgencia: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().optional(),
  supervisor: z.string().optional(),
  email: z.string().email().optional(),
  favorecido: z.string().optional(),
  banco: z.string().optional(),
  agencia: z.string().optional(),
  conta: z.string().optional(),
  tipo: z.string().optional(),
  cpfAgente: z.string().optional(),
  pix: z.string().optional(),
  dataNascimento: z.string().optional(),
  celular: z.string().optional(),
});

const agenteUpdateSchema = agenteSchema.partial();

// Função para gerar número de cadastro sequencial (0001/2026, 0002/2026, etc)
async function generateNumCadastro(db: any): Promise<string> {
  const currentYear = new Date().getFullYear();
  const result = await db
    .select({ numCadastro: agentes.numCadastro })
    .from(agentes)
    .where(like(agentes.numCadastro, `%/${currentYear}`))
    .orderBy(desc(agentes.id))
    .limit(1);

  let nextNumber = 1;
  if (result.length > 0 && result[0].numCadastro) {
    const lastNum = parseInt(result[0].numCadastro.split('/')[0]);
    nextNumber = lastNum + 1;
  }

  return `${String(nextNumber).padStart(4, '0')}/${currentYear}`;
}

export const agentesRouter = router({
  // Listar todos os agentes com filtros
  list: protectedProcedure
    .input(
      z.object({
        empresa: z.string().optional(),
        situacao: z.string().optional(),
        cidade: z.string().optional(),
        search: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [];

      if (input.empresa) {
        conditions.push(eq(agentes.empresa, input.empresa));
      }
      if (input.situacao) {
        conditions.push(eq(agentes.situacao, input.situacao));
      }
      if (input.cidade) {
        conditions.push(eq(agentes.cidade, input.cidade));
      }
      if (input.search) {
        conditions.push(
          like(agentes.nomeAgente, `%${input.search}%`)
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const result = await db
        .select()
        .from(agentes)
        .where(whereClause)
        .orderBy(desc(agentes.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return result;
    }),

  // Contar total de agentes
  count: protectedProcedure
    .input(
      z.object({
        empresa: z.string().optional(),
        situacao: z.string().optional(),
        cidade: z.string().optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [];

      if (input.empresa) {
        conditions.push(eq(agentes.empresa, input.empresa));
      }
      if (input.situacao) {
        conditions.push(eq(agentes.situacao, input.situacao));
      }
      if (input.cidade) {
        conditions.push(eq(agentes.cidade, input.cidade));
      }
      if (input.search) {
        conditions.push(
          like(agentes.nomeAgente, `%${input.search}%`)
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const result = await db
        .select({ count: agentes.id })
        .from(agentes)
        .where(whereClause);

      return result.length;
    }),

  // Obter agente por ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db
        .select()
        .from(agentes)
        .where(eq(agentes.id, input.id))
        .limit(1);

      return result.length > 0 ? result[0] : null;
    }),

  // Obter agente por ChaveJ
  getByChaveJ: protectedProcedure
    .input(z.object({ chaveJ: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db
        .select()
        .from(agentes)
        .where(eq(agentes.chaveJ, input.chaveJ))
        .limit(1);

      return result.length > 0 ? result[0] : null;
    }),

  // Criar novo agente
  create: protectedProcedure
    .input(agenteSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Gerar número de cadastro automaticamente se não fornecido
      const numCadastro = input.numCadastro || (await generateNumCadastro(db));

      const dataToInsert: any = { ...input, numCadastro };
      // Manter datas como string YYYY-MM-DD (sem conversão)
      
      const result = await db.insert(agentes).values(dataToInsert as any);

      // Buscar o agente criado para retornar com ID
      const created = await db
        .select()
        .from(agentes)
        .where(input.chaveJ ? eq(agentes.chaveJ, input.chaveJ) : isNotNull(agentes.id))
        .limit(1);

      return created.length > 0 ? created[0] : null;
    }),

  // Atualizar agente
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: agenteUpdateSchema,
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const updateData: Record<string, unknown> = { ...input.data };

      // Manter datas como string (YYYY-MM-DD) sem conversão para evitar fuso horário

      await db
        .update(agentes)
        .set(updateData)
        .where(eq(agentes.id, input.id));

      return { success: true };
    }),

  // Deletar agente
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.delete(agentes).where(eq(agentes.id, input.id));

      return { success: true };
    }),

  // Buscar por CPF
  getByCpf: protectedProcedure
    .input(z.object({ cpf: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db
        .select()
        .from(agentes)
        .where(eq(agentes.cpfAgente, input.cpf))
        .limit(1);

      return result.length > 0 ? result[0] : null;
    }),

  // Listar empresas únicas
  getEmpresas: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

      const result = await db
        .selectDistinct({ empresa: agentes.empresa })
        .from(agentes)
        .where(isNotNull(agentes.empresa));

      return result.map(r => r.empresa).filter(Boolean);
  }),

  // Listar cidades únicas
  getCidades: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

      const result = await db
        .selectDistinct({ cidade: agentes.cidade })
        .from(agentes)
        .where(isNotNull(agentes.cidade));

      return result.map(r => r.cidade).filter(Boolean);
  }),

  // Listar supervisores únicos
  getSupervisores: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

      const result = await db
        .selectDistinct({ supervisor: agentes.supervisor })
        .from(agentes)
        .where(isNotNull(agentes.supervisor));

      return result.map(r => r.supervisor).filter(Boolean);
  }),
});
