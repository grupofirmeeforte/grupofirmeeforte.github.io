import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { crm } from "../../drizzle/schema";
import { and, asc, like, or, eq, sql } from "drizzle-orm";

// Calcula idade a partir de string de data (DD/MM/AAAA, DD/MM/AA, YYYY-MM-DD)
export function calcularIdade(dtaNasc: string | null | undefined): number | null {
  if (!dtaNasc) return null;
  let dia: number, mes: number, ano: number;
  const m1 = dtaNasc.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m1) {
    dia = parseInt(m1[1]);
    mes = parseInt(m1[2]) - 1;
    ano = parseInt(m1[3]);
    if (ano < 100) ano += ano < 30 ? 2000 : 1900;
  } else {
    const m2 = dtaNasc.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m2) return null;
    ano = parseInt(m2[1]);
    mes = parseInt(m2[2]) - 1;
    dia = parseInt(m2[3]);
  }
  const hoje = new Date();
  let idade = hoje.getFullYear() - ano;
  if (hoje.getMonth() < mes || (hoje.getMonth() === mes && hoje.getDate() < dia)) idade--;
  return idade >= 0 && idade < 150 ? idade : null;
}

const rowSchema = z.object({
  sexo: z.string().optional(),
  mciEmpregador: z.string().optional(),
  nrCvn13Salario: z.string().optional(),
  nrCvnConsig: z.string().optional(),
  nrCvnSalario: z.string().optional(),
  sgUf: z.string().optional(),
  super: z.string().optional(),
  cidade: z.string().optional(),
  naoPerturbe: z.string().optional(),
  dtInclusao: z.string().optional(),
  prfDepe: z.string().optional(),
  nrCc: z.string().optional(),
  nome: z.string().optional(),
  dtaNasc: z.string().optional(),
  cpf: z.string().optional(),
  ddd01: z.string().optional(), tel01: z.string().optional(),
  ddd02: z.string().optional(), tel02: z.string().optional(),
  ddd03: z.string().optional(), tel03: z.string().optional(),
  ddd04: z.string().optional(), tel04: z.string().optional(),
  ddd05: z.string().optional(), tel05: z.string().optional(),
  ddd06: z.string().optional(), tel06: z.string().optional(),
  ddd07: z.string().optional(), tel07: z.string().optional(),
  ddd08: z.string().optional(), tel08: z.string().optional(),
  ddd09: z.string().optional(), tel09: z.string().optional(),
  ddd10: z.string().optional(), tel10: z.string().optional(),
  mci: z.string().optional(),
  cdIdfr: z.string().optional(),
  dtPrimeiroPagto: z.string().optional(),
  maiorLimiteCredito: z.string().optional(),
  codCoban: z.string().optional(),
  campanha: z.string().optional(),
  agente: z.string().optional(),
  dataContato: z.string().optional(),
  resultado: z.string().optional(),
  dataInserido: z.string().optional(),
  observacao: z.string().optional(),
});

export const mailingCrmRouter = router({
  // Listar com filtros e paginação
  list: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      agente: z.string().optional(),
      sgUf: z.string().optional(),
      cidade: z.string().optional(),
      resultado: z.string().optional(),
      campanha: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const conds = [];
      if (input.search) conds.push(or(like(crm.nome, `%${input.search}%`), like(crm.cpf, `%${input.search}%`)));
      if (input.agente) conds.push(like(crm.agente, `%${input.agente}%`));
      if (input.sgUf) conds.push(eq(crm.sgUf, input.sgUf));
      if (input.cidade) conds.push(like(crm.cidade, `%${input.cidade}%`));
      if (input.resultado) conds.push(like(crm.resultado, `%${input.resultado}%`));
      if (input.campanha) conds.push(like(crm.campanha, `%${input.campanha}%`));
      const where = conds.length > 0 ? and(...conds) : undefined;
      const rows = await db.select().from(crm).where(where)
        .orderBy(asc(crm.nome)).limit(input.limit).offset(input.offset);
      return rows.map(r => ({ ...r, idade: calcularIdade(r.dtaNasc) }));
    }),

  // Contar total
  count: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      agente: z.string().optional(),
      sgUf: z.string().optional(),
      cidade: z.string().optional(),
      resultado: z.string().optional(),
      campanha: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const conds = [];
      if (input.search) conds.push(or(like(crm.nome, `%${input.search}%`), like(crm.cpf, `%${input.search}%`)));
      if (input.agente) conds.push(like(crm.agente, `%${input.agente}%`));
      if (input.sgUf) conds.push(eq(crm.sgUf, input.sgUf));
      if (input.cidade) conds.push(like(crm.cidade, `%${input.cidade}%`));
      if (input.resultado) conds.push(like(crm.resultado, `%${input.resultado}%`));
      if (input.campanha) conds.push(like(crm.campanha, `%${input.campanha}%`));
      const where = conds.length > 0 ? and(...conds) : undefined;
      const [row] = await db.select({ total: sql<number>`count(*)` }).from(crm).where(where);
      return row?.total ?? 0;
    }),

  // Criar
  criar: protectedProcedure.input(rowSchema).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [result] = await db.insert(crm).values(input);
    return { id: (result as any).insertId };
  }),

  // Editar
  editar: protectedProcedure
    .input(rowSchema.extend({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...data } = input;
      await db.update(crm).set(data).where(eq(crm.id, id));
      return { ok: true };
    }),

  // Deletar
  deletar: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(crm).where(eq(crm.id, input.id));
    return { ok: true };
  }),

  // Exportar todos (sem paginação)
  exportarTodos: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      agente: z.string().optional(),
      sgUf: z.string().optional(),
      cidade: z.string().optional(),
      resultado: z.string().optional(),
      campanha: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const conds = [];
      if (input.search) conds.push(or(like(crm.nome, `%${input.search}%`), like(crm.cpf, `%${input.search}%`)));
      if (input.agente) conds.push(like(crm.agente, `%${input.agente}%`));
      if (input.sgUf) conds.push(eq(crm.sgUf, input.sgUf));
      if (input.cidade) conds.push(like(crm.cidade, `%${input.cidade}%`));
      if (input.resultado) conds.push(like(crm.resultado, `%${input.resultado}%`));
      if (input.campanha) conds.push(like(crm.campanha, `%${input.campanha}%`));
      const where = conds.length > 0 ? and(...conds) : undefined;
      const rows = await db.select().from(crm).where(where).orderBy(asc(crm.nome));
      return rows.map(r => ({ ...r, idade: calcularIdade(r.dtaNasc) }));
    }),

  // Importar lote
  importar: protectedProcedure.input(z.array(rowSchema)).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    if (input.length === 0) return { inseridos: 0 };
    let inseridos = 0;
    for (let i = 0; i < input.length; i += 100) {
      const lote = input.slice(i, i + 100);
      await db.insert(crm).values(lote);
      inseridos += lote.length;
    }
    return { inseridos };
  }),

  // Valores únicos para filtros
  filtros: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [ufs, cidades, agentes, campanhas, resultados] = await Promise.all([
      db.selectDistinct({ v: crm.sgUf }).from(crm).orderBy(asc(crm.sgUf)),
      db.selectDistinct({ v: crm.cidade }).from(crm).orderBy(asc(crm.cidade)),
      db.selectDistinct({ v: crm.agente }).from(crm).orderBy(asc(crm.agente)),
      db.selectDistinct({ v: crm.campanha }).from(crm).orderBy(asc(crm.campanha)),
      db.selectDistinct({ v: crm.resultado }).from(crm).orderBy(asc(crm.resultado)),
    ]);
    return {
      ufs: ufs.map(r => r.v).filter(Boolean) as string[],
      cidades: cidades.map(r => r.v).filter(Boolean) as string[],
      agentes: agentes.map(r => r.v).filter(Boolean) as string[],
      campanhas: campanhas.map(r => r.v).filter(Boolean) as string[],
      resultados: resultados.map(r => r.v).filter(Boolean) as string[],
    };
  }),
});
