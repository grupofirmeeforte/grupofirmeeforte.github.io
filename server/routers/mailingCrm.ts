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

  // Contar quantos registros seriam removidos por cada critério (preview antes de confirmar)
  contarParaLimpeza: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { falecidos: 0, acima78: 0 };

    // Falecidos: campo naoPerturbe contém FALECIDO, OBITO, ÓBITO, FALEC
    const [falecidos, todos] = await Promise.all([
      db.select({ id: crm.id, naoPerturbe: crm.naoPerturbe })
        .from(crm)
        .where(sql`LOWER(COALESCE(naoPerturbe,'')) REGEXP 'falec|obito|óbito|obit'`),
      db.select({ id: crm.id, dtaNasc: crm.dtaNasc }).from(crm),
    ]);

    // Acima de 78 anos: calcular pela dtaNasc
    const hoje = new Date();
    const acima78 = todos.filter(r => {
      if (!r.dtaNasc) return false;
      const s = String(r.dtaNasc);
      let dia: number, mes: number, ano: number;
      const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
      if (m1) { dia = +m1[1]; mes = +m1[2]; ano = m1[3].length === 2 ? 2000 + +m1[3] : +m1[3]; }
      else { const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})$/); if (!m2) return false; ano = +m2[1]; mes = +m2[2]; dia = +m2[3]; }
      const nasc = new Date(ano, mes - 1, dia);
      let idade = hoje.getFullYear() - nasc.getFullYear();
      if (hoje.getMonth() < nasc.getMonth() || (hoje.getMonth() === nasc.getMonth() && hoje.getDate() < nasc.getDate())) idade--;
      return idade > 78;
    });

    return { falecidos: falecidos.length, acima78: acima78.length };
  }),

  // Remover falecidos definitivamente
  removerFalecidos: protectedProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(crm).where(sql`LOWER(COALESCE(naoPerturbe,'')) REGEXP 'falec|obito|óbito|obit'`);
    return { ok: true };
  }),

  // Remover maiores de 78 anos definitivamente
  removerAcima78: protectedProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Buscar todos e filtrar em JS (datas em formato variado)
    const todos = await db.select({ id: crm.id, dtaNasc: crm.dtaNasc }).from(crm);
    const hoje = new Date();
    const idsRemover: number[] = [];

    for (const r of todos) {
      if (!r.dtaNasc) continue;
      const s = String(r.dtaNasc);
      let dia: number, mes: number, ano: number;
      const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
      if (m1) { dia = +m1[1]; mes = +m1[2]; ano = m1[3].length === 2 ? 2000 + +m1[3] : +m1[3]; }
      else { const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})$/); if (!m2) continue; ano = +m2[1]; mes = +m2[2]; dia = +m2[3]; }
      const nasc = new Date(ano, mes - 1, dia);
      let idade = hoje.getFullYear() - nasc.getFullYear();
      if (hoje.getMonth() < nasc.getMonth() || (hoje.getMonth() === nasc.getMonth() && hoje.getDate() < nasc.getDate())) idade--;
      if (idade > 78) idsRemover.push(r.id);
    }

    if (idsRemover.length > 0) {
      // Deletar em lotes de 500 para evitar query muito longa
      for (let i = 0; i < idsRemover.length; i += 500) {
        const lote = idsRemover.slice(i, i + 500);
        await db.delete(crm).where(sql`id IN (${sql.join(lote.map(id => sql`${id}`), sql`, `)})`);
      }
    }

    return { removidos: idsRemover.length };
  }),

  // Contar CPFs duplicados
  contarDuplicados: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { duplicados: 0, registrosAfetados: 0 };
    const todos = await db.select({ id: crm.id, cpf: crm.cpf }).from(crm).where(sql`cpf IS NOT NULL AND cpf != ''`);
    const porCpf = new Map<string, number[]>();
    for (const r of todos) {
      const c = String(r.cpf ?? '').replace(/\D/g, '');
      if (!c) continue;
      if (!porCpf.has(c)) porCpf.set(c, []);
      porCpf.get(c)!.push(r.id);
    }
    let duplicados = 0, registrosAfetados = 0;
    for (const ids of Array.from(porCpf.values())) {
      if (ids.length > 1) { duplicados++; registrosAfetados += ids.length - 1; }
    }
    return { duplicados, registrosAfetados };
  }),

  // Deduplicar CPFs: manter o mais antigo (menor id), copiar telefones únicos dos duplicados e excluir os extras
  deduplicarCpf: protectedProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Buscar todos os campos relevantes
    const todos = await db.select({
      id: crm.id, cpf: crm.cpf,
      ddd01: crm.ddd01, tel01: crm.tel01,
      ddd02: crm.ddd02, tel02: crm.tel02,
      ddd03: crm.ddd03, tel03: crm.tel03,
      ddd04: crm.ddd04, tel04: crm.tel04,
      ddd05: crm.ddd05, tel05: crm.tel05,
      ddd06: crm.ddd06, tel06: crm.tel06,
      ddd07: crm.ddd07, tel07: crm.tel07,
      ddd08: crm.ddd08, tel08: crm.tel08,
      ddd09: crm.ddd09, tel09: crm.tel09,
      ddd10: crm.ddd10, tel10: crm.tel10,
    }).from(crm).where(sql`cpf IS NOT NULL AND cpf != ''`).orderBy(crm.id);

    // Agrupar por CPF normalizado
    const porCpf = new Map<string, typeof todos>();
    for (const r of todos) {
      const c = String(r.cpf ?? '').replace(/\D/g, '');
      if (!c) continue;
      if (!porCpf.has(c)) porCpf.set(c, []);
      porCpf.get(c)!.push(r);
    }

    let removidos = 0;
    const slots = ['01','02','03','04','05','06','07','08','09','10'] as const;

    for (const grupo of Array.from(porCpf.values())) {
      if (grupo.length <= 1) continue;

      // Manter o primeiro (menor id), coletar telefones de todos
      const principal = grupo[0];
      const duplicatas = grupo.slice(1);

      // Coletar todos os pares DDD+TEL únicos de todos os registros
      const telSet = new Set<string>();
      const todosOsTels: { ddd: string; tel: string }[] = [];

      for (const reg of grupo) {
        for (const s of slots) {
          const ddd = String((reg as any)[`ddd${s}`] ?? '').trim();
          const tel = String((reg as any)[`tel${s}`] ?? '').trim();
          if (!tel || tel === '0') continue;
          const chave = `${ddd}|${tel}`;
          if (!telSet.has(chave)) { telSet.add(chave); todosOsTels.push({ ddd, tel }); }
        }
      }

      // Montar update com até 10 telefones mesclados
      const update: Record<string, string | null> = {};
      for (let i = 0; i < slots.length; i++) {
        const s = slots[i];
        update[`ddd${s}`] = todosOsTels[i]?.ddd || null;
        update[`tel${s}`] = todosOsTels[i]?.tel || null;
      }

      // Atualizar o principal com os telefones mesclados
      await db.update(crm).set(update).where(eq(crm.id, principal.id));

      // Excluir os duplicados
      const idsRemover = duplicatas.map((d: { id: number }) => d.id);
      await db.delete(crm).where(sql`id IN (${sql.join(idsRemover.map((id: number) => sql`${id}`), sql`, `)})`);
      removidos += idsRemover.length;
    }

    return { removidos };
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
