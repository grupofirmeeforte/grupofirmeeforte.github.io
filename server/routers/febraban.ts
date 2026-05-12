import { z } from "zod";
import { protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { febraban, consignados } from "../../drizzle/schema";
import { eq, and, like, or, desc, asc, sql, isNotNull, isNull, ne } from "drizzle-orm";

// Converte número MESANO (ex: 126) para string legível (ex: "01/2026")
export function mesanoToStr(mesano: number): string {
  const s = String(mesano);
  const mes = s.slice(0, s.length - 2).padStart(2, "0");
  const ano = "20" + s.slice(-2);
  return `${mes}/${ano}`;
}

export const febrabanRouter = {
  list: protectedProcedure
    .input(z.object({
      page: z.number().default(0),
      limit: z.number().default(100),
      search: z.string().optional(),
      empresa: z.string().optional(),
      mesano: z.number().optional(),
      situacao: z.string().optional(),
      operador: z.string().optional(),
      pago: z.enum(["todos", "sim", "nao"]).default("todos"),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const offset = input.page * input.limit;

      const conditions: any[] = [];
      if (input.search) {
        // Se filtro de operador já está ativo, busca só em proposta para evitar conflito
        if (input.operador && input.operador !== "__all__") {
          conditions.push(like(febraban.proposta, `%${input.search}%`));
        } else {
          conditions.push(
            or(
              like(febraban.proposta, `%${input.search}%`),
              like(febraban.operador, `%${input.search}%`),
            )
          );
        }
      }
      if (input.empresa && input.empresa !== "__all__") {
        conditions.push(eq(febraban.empresa, input.empresa));
      }
      if (input.mesano) {
        conditions.push(eq(febraban.mesano, input.mesano));
      }
      if (input.situacao && input.situacao !== "__all__") {
        conditions.push(eq(febraban.situacao, input.situacao));
      }
      if (input.operador && input.operador !== "__all__") {
        conditions.push(eq(febraban.operador, input.operador));
      }
      // Filtro pago: "nao" = apenas não pagos, "sim" = apenas pagos
      if (input.pago === "nao") {
        conditions.push(sql`NOT EXISTS (SELECT 1 FROM consignados c WHERE c.nrOperacao = ${febraban.proposta})`);
      } else if (input.pago === "sim") {
        conditions.push(sql`EXISTS (SELECT 1 FROM consignados c WHERE c.nrOperacao = ${febraban.proposta})`);
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const rows = await db
        .select({
          id: febraban.id,
          empresa: febraban.empresa,
          mesano: febraban.mesano,
          proposta: febraban.proposta,
          linha: febraban.linha,
          situacao: febraban.situacao,
          operador: febraban.operador,
          solicitacao: febraban.solicitacao,
          prazo: febraban.prazo,
          troco: febraban.troco,
          financiado: febraban.financiado,
          situacao2: febraban.situacao2,
          ordemExcel: febraban.ordemExcel,
          createdAt: febraban.createdAt,
          updatedAt: febraban.updatedAt,
          // pago: existe nrOperacao igual na tabela consignados
          pago: sql<number>`CASE WHEN EXISTS (
            SELECT 1 FROM consignados c WHERE c.nrOperacao = ${febraban.proposta}
          ) THEN 1 ELSE 0 END`,
        })
        .from(febraban)
        .where(where)
        .orderBy(
          sql`STR_TO_DATE(${febraban.solicitacao}, '%d/%m/%Y') DESC`,
          asc(febraban.empresa),
          asc(febraban.ordemExcel),
          desc(febraban.id)
        )
        .limit(input.limit)
        .offset(offset);

      return rows;
    }),

  count: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      empresa: z.string().optional(),
      mesano: z.number().optional(),
      situacao: z.string().optional(),
      operador: z.string().optional(),
      pago: z.enum(["todos", "sim", "nao"]).default("todos"),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return 0;

      const conditions: any[] = [];
      if (input.search) {
        if (input.operador && input.operador !== "__all__") {
          conditions.push(like(febraban.proposta, `%${input.search}%`));
        } else {
          conditions.push(
            or(
              like(febraban.proposta, `%${input.search}%`),
              like(febraban.operador, `%${input.search}%`),
            )
          );
        }
      }
      if (input.empresa && input.empresa !== "__all__") {
        conditions.push(eq(febraban.empresa, input.empresa));
      }
      if (input.mesano) {
        conditions.push(eq(febraban.mesano, input.mesano));
      }
      if (input.situacao && input.situacao !== "__all__") {
        conditions.push(eq(febraban.situacao, input.situacao));
      }
      if (input.operador && input.operador !== "__all__") {
        conditions.push(eq(febraban.operador, input.operador));
      }
      if (input.pago === "nao") {
        conditions.push(sql`NOT EXISTS (SELECT 1 FROM consignados c WHERE c.nrOperacao = ${febraban.proposta})`);
      } else if (input.pago === "sim") {
        conditions.push(sql`EXISTS (SELECT 1 FROM consignados c WHERE c.nrOperacao = ${febraban.proposta})`);
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(febraban)
        .where(where);
      return Number(result[0]?.count ?? 0);
    }),

  // Exportar não pagos por empresa (todos os registros, sem paginação)
  naoPagos: protectedProcedure
    .input(z.object({
      empresa: z.string().optional(),
      mesano: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions: any[] = [
        sql`NOT EXISTS (SELECT 1 FROM consignados c WHERE c.nrOperacao = ${febraban.proposta})`,
      ];
      if (input.empresa && input.empresa !== "__all__") {
        conditions.push(eq(febraban.empresa, input.empresa));
      }
      if (input.mesano) {
        conditions.push(eq(febraban.mesano, input.mesano));
      }

      const rows = await db
        .select({
          empresa: febraban.empresa,
          mesano: febraban.mesano,
          proposta: febraban.proposta,
          linha: febraban.linha,
          situacao: febraban.situacao,
          operador: febraban.operador,
          solicitacao: febraban.solicitacao,
          prazo: febraban.prazo,
          troco: febraban.troco,
          financiado: febraban.financiado,
        })
        .from(febraban)
        .where(and(...conditions))
        .orderBy(
          sql`STR_TO_DATE(${febraban.solicitacao}, '%d/%m/%Y') DESC`,
          asc(febraban.empresa),
          asc(febraban.ordemExcel),
          desc(febraban.id)
        );

      return rows;
    }),

  // Exportar contratadas não pagas (situação Contratada + não está na produção consignado)
  contratatasNaoPagas: protectedProcedure
    .input(z.object({
      empresa: z.string().optional(),
      mesano: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions: any[] = [
        sql`NOT EXISTS (SELECT 1 FROM consignados c WHERE c.nrOperacao = ${febraban.proposta})`,
        eq(febraban.situacao, 'Contratada'),
      ];
      if (input.empresa && input.empresa !== '__all__') {
        conditions.push(eq(febraban.empresa, input.empresa));
      }
      if (input.mesano) {
        conditions.push(eq(febraban.mesano, input.mesano));
      }

      const rows = await db
        .select({
          empresa: febraban.empresa,
          mesano: febraban.mesano,
          proposta: febraban.proposta,
          linha: febraban.linha,
          situacao: febraban.situacao,
          operador: febraban.operador,
          solicitacao: febraban.solicitacao,
          prazo: febraban.prazo,
          troco: febraban.troco,
          financiado: febraban.financiado,
        })
        .from(febraban)
        .where(and(...conditions))
        .orderBy(
          sql`STR_TO_DATE(${febraban.solicitacao}, '%d/%m/%Y') DESC`,
          asc(febraban.empresa),
          desc(febraban.id)
        );

      return rows;
    }),

  // Importar registros:
  // modo "novo" = apenas adiciona registros que ainda não existem (por proposta)
  // modo "subscrever" = adiciona novos E atualiza existentes pelo número da proposta
  importar: protectedProcedure
    .input(z.object({
      modo: z.enum(["novo", "subscrever"]),
      offsetInicial: z.number().default(0), // offset para ordemExcel quando enviado em lotes
      registros: z.array(z.object({
        empresa: z.string().optional(),
        mesano: z.number().optional(),
        proposta: z.string(),
        linha: z.number().optional(),
        situacao: z.string().optional(),
        operador: z.string().optional(),
        solicitacao: z.string().optional(),
        prazo: z.string().optional(),
        troco: z.number().optional(),
        financiado: z.number().optional(),
        situacao2: z.string().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let adicionados = 0;
      let atualizados = 0;
      let ignorados = 0;

      for (let idx = 0; idx < input.registros.length; idx++) {
        const reg = input.registros[idx];
        if (!reg.proposta || reg.proposta.trim() === "") { ignorados++; continue; }

        const ordemExcel = input.offsetInicial + idx;
        const toStr = (v: number | undefined | null) => v != null ? String(v) : undefined;

        const values = {
          empresa: reg.empresa,
          mesano: reg.mesano,
          linha: reg.linha,
          situacao: reg.situacao,
          operador: reg.operador,
          solicitacao: reg.solicitacao,
          prazo: reg.prazo,
          troco: toStr(reg.troco),
          financiado: toStr(reg.financiado),
          situacao2: reg.situacao2,
          ordemExcel,
        };

        // Verificar se já existe
        const existing = await db
          .select({ id: febraban.id })
          .from(febraban)
          .where(eq(febraban.proposta, reg.proposta))
          .limit(1);

        if (existing.length > 0) {
          if (input.modo === "subscrever") {
            await db.update(febraban).set(values).where(eq(febraban.proposta, reg.proposta));
            atualizados++;
          } else {
            ignorados++;
          }
        } else {
          await db.insert(febraban).values({ ...values, proposta: reg.proposta });
          adicionados++;
        }
      }

      return { adicionados, atualizados, ignorados, total: input.registros.length };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      empresa: z.string().optional(),
      mesano: z.number().optional(),
      proposta: z.string().optional(),
      linha: z.number().optional(),
      situacao: z.string().optional(),
      operador: z.string().optional(),
      solicitacao: z.string().optional(),
      prazo: z.string().optional(),
      troco: z.number().optional().nullable(),
      financiado: z.number().optional().nullable(),
      situacao2: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, troco, financiado, ...rest } = input;
      await db.update(febraban).set({
        ...rest,
        troco: troco != null ? String(troco) : undefined,
        financiado: financiado != null ? String(financiado) : undefined,
      }).where(eq(febraban.id, id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(febraban).where(eq(febraban.id, input.id));
      return { success: true };
    }),

  // Resumo por empresa: totais de líquido (troco) por dia anterior, dia atual, contratado, pendente e ano
  resumo: protectedProcedure
    .input(z.object({
      mesano: z.number().optional(), // filtro de mês/ano; se omitido usa o mês mais recente
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { empresas: [], mesanoAtual: null };

      // Determinar mesano a usar
      let mesano = input.mesano;
      if (!mesano) {
        const latest = await db
          .select({ v: febraban.mesano })
          .from(febraban)
          .where(sql`mesano IS NOT NULL`)
          .orderBy(desc(febraban.mesano))
          .limit(1);
        mesano = latest[0]?.v ?? undefined;
      }
      if (!mesano) return { empresas: [], mesanoAtual: null };

      // Determinar o ano do mesano (ex: 426 → 2026, 126 → 2026)
      const mesanoStr = String(mesano);
      const anoSuffix = mesanoStr.slice(-2); // "26"
      const anoFull = "20" + anoSuffix; // "2026"

      // Data de hoje e ontem no formato DD/MM/AAAA
      const hoje = new Date();
      const ontem = new Date(hoje);
      ontem.setDate(ontem.getDate() - 1);
      const pad = (n: number) => String(n).padStart(2, "0");
      const fmtDate = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
      const hojeStr = fmtDate(hoje);
      const ontemStr = fmtDate(ontem);

      const empresas = ["BMF", "FLEX"];
      const result = [];

      for (const emp of empresas) {
        const baseWhere = sql`empresa = ${emp} AND mesano = ${mesano}`;
        const anoWhere = sql`empresa = ${emp} AND RIGHT(LPAD(CAST(mesano AS CHAR), 6, '0'), 2) = ${anoSuffix}`;

        const [contratado, pendente, diaAtual, diaAnterior, ano,
               qtdContratado, qtdPendente, qtdDiaAtual, qtdDiaAnterior, qtdAno] = await Promise.all([
          // Líquido contratado (situacao = Contratada)
          db.select({ total: sql<string>`COALESCE(SUM(CAST(troco AS DECIMAL(15,2))), 0)` })
            .from(febraban).where(sql`${baseWhere} AND situacao = 'Contratada'`),
          // Líquido pendente (situacao = Pendente)
          db.select({ total: sql<string>`COALESCE(SUM(CAST(troco AS DECIMAL(15,2))), 0)` })
            .from(febraban).where(sql`${baseWhere} AND situacao = 'Pendente'`),
          // Líquido do dia atual
          db.select({ total: sql<string>`COALESCE(SUM(CAST(troco AS DECIMAL(15,2))), 0)` })
            .from(febraban).where(sql`${baseWhere} AND solicitacao = ${hojeStr} AND situacao = 'Contratada'`),
          // Líquido do dia anterior
          db.select({ total: sql<string>`COALESCE(SUM(CAST(troco AS DECIMAL(15,2))), 0)` })
            .from(febraban).where(sql`${baseWhere} AND solicitacao = ${ontemStr} AND situacao = 'Contratada'`),
          // Líquido do ano
          db.select({ total: sql<string>`COALESCE(SUM(CAST(troco AS DECIMAL(15,2))), 0)` })
            .from(febraban).where(sql`${anoWhere} AND situacao = 'Contratada'`),
          // Contagem de operações contratadas
          db.select({ cnt: sql<number>`COUNT(*)` })
            .from(febraban).where(sql`${baseWhere} AND situacao = 'Contratada'`),
          // Contagem de operações pendentes
          db.select({ cnt: sql<number>`COUNT(*)` })
            .from(febraban).where(sql`${baseWhere} AND situacao = 'Pendente'`),
          // Contagem dia atual
          db.select({ cnt: sql<number>`COUNT(*)` })
            .from(febraban).where(sql`${baseWhere} AND solicitacao = ${hojeStr} AND situacao = 'Contratada'`),
          // Contagem dia anterior
          db.select({ cnt: sql<number>`COUNT(*)` })
            .from(febraban).where(sql`${baseWhere} AND solicitacao = ${ontemStr} AND situacao = 'Contratada'`),
          // Contagem do ano
          db.select({ cnt: sql<number>`COUNT(*)` })
            .from(febraban).where(sql`${anoWhere} AND situacao = 'Contratada'`),
        ]);

        result.push({
          empresa: emp,
          contratado: Number(contratado[0]?.total ?? 0),
          pendente: Number(pendente[0]?.total ?? 0),
          diaAtual: Number(diaAtual[0]?.total ?? 0),
          diaAnterior: Number(diaAnterior[0]?.total ?? 0),
          ano: Number(ano[0]?.total ?? 0),
          qtdContratado: Number(qtdContratado[0]?.cnt ?? 0),
          qtdPendente: Number(qtdPendente[0]?.cnt ?? 0),
          qtdDiaAtual: Number(qtdDiaAtual[0]?.cnt ?? 0),
          qtdDiaAnterior: Number(qtdDiaAnterior[0]?.cnt ?? 0),
          qtdAno: Number(qtdAno[0]?.cnt ?? 0),
          hojeStr,
          ontemStr,
          anoFull,
        });
      }

      return { empresas: result, mesanoAtual: mesano };
    }),

  // Retorna valores únicos para filtros
  filtros: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { empresas: [], mesanos: [], situacoes: [], operadores: [] };

    const [empresas, mesanos, situacoes, operadores] = await Promise.all([
      db.selectDistinct({ v: febraban.empresa }).from(febraban).where(sql`empresa IS NOT NULL`),
      db.selectDistinct({ v: febraban.mesano }).from(febraban).where(sql`mesano IS NOT NULL`).orderBy(desc(febraban.mesano)),
      db.selectDistinct({ v: febraban.situacao }).from(febraban).where(sql`situacao IS NOT NULL`),
      db.selectDistinct({ v: febraban.operador }).from(febraban).where(sql`operador IS NOT NULL`).orderBy(asc(febraban.operador)),
    ]);

    return {
      empresas: empresas.map(r => r.v).filter(Boolean) as string[],
      mesanos: mesanos.map(r => ({ value: r.v!, label: mesanoToStr(r.v!) })),
      situacoes: situacoes.map(r => r.v).filter(Boolean) as string[],
      operadores: operadores.map(r => r.v).filter(Boolean) as string[],
    };
  }),
};
