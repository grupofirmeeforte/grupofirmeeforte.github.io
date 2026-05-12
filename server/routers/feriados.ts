import { z } from "zod";
import { protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { feriados } from "../../drizzle/schema";
import { eq, and, desc, asc, sql } from "drizzle-orm";

// Cálculo da Páscoa (algoritmo de Butcher)
function calcularPascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

function addDias(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function fmt(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

// Gera e insere feriados para o próximo ano se ainda não existirem
export async function gerarFeriadosAno(anoAlvo?: number): Promise<{ ano: number; inseridos: number; jaExistia: boolean }> {
  const db = await getDb();
  if (!db) return { ano: 0, inseridos: 0, jaExistia: false };

  const ano = anoAlvo ?? new Date().getFullYear() + 1;

  // Verificar se já existem feriados para o ano
  const existentes = await db.select({ id: feriados.id }).from(feriados)
    .where(eq(feriados.ano, ano)).limit(1);
  if (existentes.length > 0) return { ano, inseridos: 0, jaExistia: true };

  const pascoa = calcularPascoa(ano);
  const sextaSanta = addDias(pascoa, -2);
  const corpusChristi = addDias(pascoa, 60);
  const carnaval1 = addDias(pascoa, -48);
  const carnaval2 = addDias(pascoa, -47);
  const quartaCinzas = addDias(pascoa, -46);

  const lista = [
    // Nacionais fixos
    { data: `01/01/${ano}`, nome: "Confraternização Universal (Ano Novo)", tipo: "nacional", estado: null },
    { data: fmt(carnaval1), nome: "Carnaval", tipo: "nacional", estado: null },
    { data: fmt(carnaval2), nome: "Carnaval", tipo: "nacional", estado: null },
    { data: fmt(quartaCinzas), nome: "Quarta-feira de Cinzas (ponto facultativo)", tipo: "nacional", estado: null },
    { data: fmt(sextaSanta), nome: "Paixão de Cristo (Sexta-feira Santa)", tipo: "nacional", estado: null },
    { data: fmt(pascoa), nome: "Páscoa", tipo: "nacional", estado: null },
    { data: `21/04/${ano}`, nome: "Tiradentes", tipo: "nacional", estado: null },
    { data: `01/05/${ano}`, nome: "Dia do Trabalho", tipo: "nacional", estado: null },
    { data: fmt(corpusChristi), nome: "Corpus Christi (ponto facultativo)", tipo: "nacional", estado: null },
    { data: `07/09/${ano}`, nome: "Independência do Brasil", tipo: "nacional", estado: null },
    { data: `12/10/${ano}`, nome: "Nossa Senhora Aparecida", tipo: "nacional", estado: null },
    { data: `02/11/${ano}`, nome: "Finados", tipo: "nacional", estado: null },
    { data: `15/11/${ano}`, nome: "Proclamação da República", tipo: "nacional", estado: null },
    { data: `20/11/${ano}`, nome: "Consciência Negra", tipo: "nacional", estado: null },
    { data: `25/12/${ano}`, nome: "Natal", tipo: "nacional", estado: null },
    // Estaduais BA
    { data: `06/01/${ano}`, nome: "Reis Magos (BA)", tipo: "estadual", estado: "BA" },
    { data: `24/06/${ano}`, nome: "São João (BA)", tipo: "estadual", estado: "BA" },
    { data: `02/07/${ano}`, nome: "Independência da Bahia", tipo: "estadual", estado: "BA" },
    { data: `30/10/${ano}`, nome: "Dia do Evangélico (BA)", tipo: "estadual", estado: "BA" },
  ];

  await db.insert(feriados).values(lista.map(f => ({ ...f, ano })));
  return { ano, inseridos: lista.length, jaExistia: false };
}

export const feriadosRouter = {
  list: protectedProcedure
    .input(z.object({
      ano: z.number().optional(),
      tipo: z.string().optional(), // 'nacional' | 'estadual' | 'todos'
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const conditions: any[] = [];
      if (input.ano) conditions.push(eq(feriados.ano, input.ano));
      if (input.tipo && input.tipo !== "todos") conditions.push(eq(feriados.tipo, input.tipo));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      return await db.select().from(feriados)
        .where(where)
        .orderBy(asc(feriados.ano), asc(feriados.data));
    }),

  anos: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.selectDistinct({ ano: feriados.ano }).from(feriados)
      .orderBy(desc(feriados.ano));
    return rows.map(r => r.ano);
  }),

  create: protectedProcedure
    .input(z.object({
      data: z.string(),
      nome: z.string(),
      tipo: z.enum(["nacional", "estadual", "municipal"]),
      estado: z.string().optional().nullable(),
      ano: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.insert(feriados).values(input);
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      data: z.string().optional(),
      nome: z.string().optional(),
      tipo: z.enum(["nacional", "estadual", "municipal"]).optional(),
      estado: z.string().optional().nullable(),
      ano: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const { id, ...rest } = input;
      await db.update(feriados).set(rest).where(eq(feriados.id, id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.delete(feriados).where(eq(feriados.id, input.id));
      return { success: true };
    }),
};
