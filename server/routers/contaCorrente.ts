import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { contasCorrentes, agentes, calculos, tabelasComissao } from "../../drizzle/schema";
import { eq, and, like, desc, asc, sql, or } from "drizzle-orm";

// ─── Helper: normaliza mesAno para o formato numérico MMAA ─────────────────
function normalizarMesRef(m: string): string {
  if (!m) return m;
  // "05/2026" → "526"
  const matchLong = m.match(/^(\d{1,2})\/(\d{4})$/);
  if (matchLong) {
    const mm = parseInt(matchLong[1], 10);
    const aa = matchLong[2].slice(2);
    return `${mm}${aa}`;
  }
  // "05/26" → "526"
  const matchShort = m.match(/^(\d{1,2})\/(\d{2})$/);
  if (matchShort) {
    const mm = parseInt(matchShort[1], 10);
    return `${mm}${matchShort[2]}`;
  }
  return m;
}

// ─── Helper: parseia percentual (aceita vírgula ou ponto) ──────────────────
function parsePct(v: string | number | null | undefined): number {
  if (v == null || v === "") return 0;
  const s = String(v).replace(",", ".");
  return parseFloat(s) || 0;
}

export const contaCorrenteRouter = router({

  // ── Listagem com filtros e paginação ─────────────────────────────────────
  list: protectedProcedure
    .input(z.object({
      page: z.number().default(0),
      limit: z.number().default(100),
      search: z.string().optional(),
      empresa: z.string().optional(),
      mesAno: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { rows: [], total: 0 };

      const conditions: any[] = [];
      if (input.empresa && input.empresa !== "__all__") {
        conditions.push(eq(contasCorrentes.empresa, input.empresa));
      }
      if (input.mesAno && input.mesAno !== "__all__") {
        conditions.push(eq(contasCorrentes.mesAno, input.mesAno));
      }
      if (input.search) {
        const s = `%${input.search}%`;
        conditions.push(
          or(
            like(contasCorrentes.chaveJ, s),
            like(contasCorrentes.agente, s),
            like(contasCorrentes.contaCorrente, s),
          )
        );
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [rows, countResult] = await Promise.all([
        db.select().from(contasCorrentes)
          .where(where)
          .orderBy(
            desc(sql`CONCAT(SUBSTRING(mesAno, 4, 4), SUBSTRING(mesAno, 1, 2))`),
            asc(contasCorrentes.empresa),
            asc(contasCorrentes.agente)
          )
          .limit(input.limit)
          .offset(input.page * input.limit),
        db.select({ count: sql<number>`COUNT(*)` }).from(contasCorrentes).where(where),
      ]);

      return { rows, total: Number(countResult[0]?.count ?? 0) };
    }),

  // ── Filtros disponíveis ──────────────────────────────────────────────────
  filtros: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { empresas: [], mesanos: [] };

    const [empresas, mesanos] = await Promise.all([
      db.selectDistinct({ v: contasCorrentes.empresa }).from(contasCorrentes)
        .where(sql`empresa IS NOT NULL AND empresa != ''`)
        .orderBy(asc(contasCorrentes.empresa)),
      db.selectDistinct({ v: contasCorrentes.mesAno }).from(contasCorrentes)
        .where(sql`mesAno IS NOT NULL AND mesAno != ''`)
        .orderBy(desc(sql`CONCAT(SUBSTRING(mesAno, 4, 4), SUBSTRING(mesAno, 1, 2))`)),
    ]);

    return {
      empresas: empresas.map(r => r.v!).filter(Boolean),
      mesanos: mesanos.map(r => r.v!).filter(Boolean),
    };
  }),

  // ── Importação em batch ──────────────────────────────────────────────────
  importar: protectedProcedure
    .input(z.object({
      rows: z.array(z.object({
        empresa: z.string().optional(),
        mesAno: z.string().optional(),
        chaveJ: z.string().optional(),
        agente: z.string().optional(),
        agencia: z.string().optional(),
        contaCorrente: z.string().optional(),
        tipoServ: z.string().optional(),
        dataOperacao: z.string().optional(),
        produto: z.string().optional(),
        modalidade: z.string().optional(),
        agRelacionamento: z.string().optional(),
        rbm: z.number().optional(),
        percComissao: z.number().optional(),
        comissao: z.number().optional(),
        supervisor: z.string().optional(),
      })),
      modo: z.enum(["inserir", "subscrever"]).default("subscrever"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco não disponível");

      const { rows, modo } = input;
      if (rows.length === 0) return { inseridos: 0, atualizados: 0, erros: 0 };

      // Enriquecer com nome do agente do cadastro
      const chaveJs = Array.from(new Set(rows.filter(r => r.chaveJ).map(r => r.chaveJ!.toUpperCase())));
      const nomesPorChaveJ = new Map<string, string>();
      if (chaveJs.length > 0) {
        const CHUNK = 200;
        for (let i = 0; i < chaveJs.length; i += CHUNK) {
          const chunk = chaveJs.slice(i, i + CHUNK);
          const found = await db.select({ chaveJ: agentes.chaveJ, nomeAgente: agentes.nomeAgente })
            .from(agentes)
            .where(sql`chaveJ IN (${sql.raw(chunk.map(c => `'${c.replace(/'/g, "''")}'`).join(','))})`);
          found.forEach(a => { if (a.chaveJ && a.nomeAgente) nomesPorChaveJ.set(a.chaveJ.toUpperCase(), a.nomeAgente); });
        }
      }

      let inseridos = 0;
      let atualizados = 0;
      let erros = 0;

      const BATCH = 200;
      for (let i = 0; i < rows.length; i += BATCH) {
        const chunk = rows.slice(i, i + BATCH);
        try {
          const values = chunk.map(r => {
            const chaveJUp = r.chaveJ ? r.chaveJ.toUpperCase() : null;
            const nomeDosCadastro = chaveJUp ? nomesPorChaveJ.get(chaveJUp) : null;
            return {
              empresa: r.empresa ?? null,
              mesAno: r.mesAno ?? null,
              chaveJ: chaveJUp,
              agente: nomeDosCadastro || r.agente || null,
              agencia: r.agencia ?? null,
              contaCorrente: r.contaCorrente ?? null,
              tipoServ: r.tipoServ ?? null,
              dataOperacao: r.dataOperacao ? new Date(r.dataOperacao) : null,
              produto: r.produto ?? null,
              modalidade: r.modalidade ?? null,
              agRelacionamento: r.agRelacionamento ?? null,
              rbm: r.rbm != null ? String(r.rbm) : null,
              percComissao: r.percComissao != null ? String(r.percComissao) : null,
              comissao: r.comissao != null ? String(r.comissao) : null,
              supervisor: r.supervisor ?? null,
            };
          });

          if (modo === "inserir") {
            await db.insert(contasCorrentes).values(values);
            inseridos += values.length;
          } else {
            // subscrever: inserir todos (sem chave única para upsert, então sempre insere)
            await db.insert(contasCorrentes).values(values);
            inseridos += values.length;
          }
        } catch {
          erros += chunk.length;
        }
      }

      return { inseridos, atualizados, erros };
    }),

  // ── Calcular comissão: busca % na Tabela de Comissão pelo nível do agente ─
  calcular: protectedProcedure
    .input(z.object({
      mesAno: z.string().optional(),
      empresa: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco não disponível");

      const conditions: any[] = [];
      if (input.mesAno && input.mesAno !== "__all__") {
        conditions.push(eq(contasCorrentes.mesAno, input.mesAno));
      }
      if (input.empresa && input.empresa !== "__all__") {
        conditions.push(eq(contasCorrentes.empresa, input.empresa));
      }
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const registros = await db.select().from(contasCorrentes).where(where);

      // Buscar tabela de comissão (convênio Conta Corrente)
      const tabelas = await db.select().from(tabelasComissao)
        .where(like(tabelasComissao.convenio, '%Conta%'));

      // Buscar todos os agentes para mapear nível
      const todosAgentes = await db.select({
        chaveJ: agentes.chaveJ,
        situacao: agentes.situacao,
        supervisor: agentes.supervisor,
        empresa: agentes.empresa,
        nomeAgente: agentes.nomeAgente,
      }).from(agentes);

      const agentesMap = new Map<string, typeof todosAgentes[0]>();
      todosAgentes.forEach(a => { if (a.chaveJ) agentesMap.set(a.chaveJ.toUpperCase(), a); });

      let calculados = 0;
      let zerados = 0;

      for (const r of registros) {
        const chaveJUp = (r.chaveJ ?? '').toUpperCase();
        const agente = agentesMap.get(chaveJUp);
        const rbmVal = r.rbm != null ? parseFloat(String(r.rbm)) : 0;

        // Determinar nível do agente (Ativo01..Ativo10)
        const situacao = agente?.situacao || '';
        const nivelMatch = situacao.match(/Ativo(\d{2})/i);
        const nivelNum = nivelMatch ? parseInt(nivelMatch[1]) : null;
        const ativoCol = nivelNum ? `ativo${String(nivelNum).padStart(2, '0')}` : null;

        let percComissao = 0;
        if (ativoCol && tabelas.length > 0) {
          const pctStr = (tabelas[0] as any)[ativoCol];
          percComissao = parsePct(pctStr);
          // Se > 1, é percentual direto (ex: 68 = 68%), converter para decimal
          if (percComissao > 1) percComissao = percComissao / 100;
        }

        const comissaoVal = rbmVal > 0 && percComissao > 0
          ? +(rbmVal * percComissao).toFixed(2)
          : 0;

        await db.update(contasCorrentes)
          .set({
            percComissao: percComissao > 0 ? String(percComissao) : null,
            comissao: comissaoVal > 0 ? String(comissaoVal) : null,
            // Atualizar nome do agente e supervisor do cadastro
            agente: agente?.nomeAgente || r.agente || null,
            supervisor: agente?.supervisor || r.supervisor || null,
          })
          .where(eq(contasCorrentes.id, r.id));

        if (comissaoVal > 0) calculados++;
        else zerados++;
      }

      return { calculados, zerados, total: registros.length };
    }),

  // ── Excluir registro ─────────────────────────────────────────────────────
  excluir: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco não disponível");
      await db.delete(contasCorrentes).where(eq(contasCorrentes.id, input.id));
      return { ok: true };
    }),

  // ── Atualizar registro ───────────────────────────────────────────────────
  atualizar: protectedProcedure
    .input(z.object({
      id: z.number(),
      empresa: z.string().optional(),
      mesAno: z.string().optional(),
      chaveJ: z.string().optional(),
      agente: z.string().optional(),
      agencia: z.string().optional(),
      contaCorrente: z.string().optional(),
      tipoServ: z.string().optional(),
      dataOperacao: z.string().optional(),
      produto: z.string().optional(),
      modalidade: z.string().optional(),
      agRelacionamento: z.string().optional(),
      rbm: z.number().optional().nullable(),
      percComissao: z.number().optional().nullable(),
      comissao: z.number().optional().nullable(),
      supervisor: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco não disponível");
      const { id, ...data } = input;
      await db.update(contasCorrentes).set({
        empresa: data.empresa ?? undefined,
        mesAno: data.mesAno ?? undefined,
        chaveJ: data.chaveJ ?? undefined,
        agente: data.agente ?? undefined,
        agencia: data.agencia ?? undefined,
        contaCorrente: data.contaCorrente ?? undefined,
        tipoServ: data.tipoServ ?? undefined,
        dataOperacao: data.dataOperacao ? new Date(data.dataOperacao) : null,
        produto: data.produto ?? undefined,
        modalidade: data.modalidade ?? undefined,
        agRelacionamento: data.agRelacionamento ?? undefined,
        rbm: data.rbm != null ? String(data.rbm) : null,
        percComissao: data.percComissao != null ? String(data.percComissao) : null,
        comissao: data.comissao != null ? String(data.comissao) : null,
        supervisor: data.supervisor ?? undefined,
      }).where(eq(contasCorrentes.id, id));
      return { ok: true };
    }),

  // ── Enviar para Financeiro → Cálculo ────────────────────────────────────
  enviarParaCalculo: protectedProcedure
    .input(z.object({
      ids: z.array(z.number()),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Banco não disponível');
      if (input.ids.length === 0) throw new Error('Nenhum registro selecionado');

      // 1. Buscar registros selecionados
      const registros = await db.select({
        chaveJ: contasCorrentes.chaveJ,
        agente: contasCorrentes.agente,
        empresa: contasCorrentes.empresa,
        mesAno: contasCorrentes.mesAno,
        comissao: contasCorrentes.comissao,
        rbm: contasCorrentes.rbm,
      }).from(contasCorrentes)
        .where(sql`${contasCorrentes.id} IN (${sql.join(input.ids.map(id => sql`${id}`), sql`, `)})`);

      if (registros.length === 0) throw new Error('Nenhum registro encontrado');

      // 2. Agrupar por ChaveJ + MesAno: somar comissão e RBM
      const agrupado = new Map<string, {
        chaveJ: string;
        nomeAgente: string;
        empresa: string;
        mesAno: string;
        comissaoCc: number;
        rbmContaCorrente: number;
        qtd: number;
      }>();

      for (const r of registros) {
        const chave = (r.chaveJ ?? '').trim().toUpperCase();
        const mes = normalizarMesRef(r.mesAno ?? '');
        if (!chave) continue;
        const mapKey = `${chave}||${mes}`;
        const comissao = parseFloat(String(r.comissao ?? '0').replace(',', '.')) || 0;
        const rbm = parseFloat(String(r.rbm ?? '0').replace(',', '.')) || 0;
        if (agrupado.has(mapKey)) {
          const entry = agrupado.get(mapKey)!;
          entry.comissaoCc += comissao;
          entry.rbmContaCorrente += rbm;
          entry.qtd += 1;
        } else {
          agrupado.set(mapKey, {
            chaveJ: chave,
            nomeAgente: r.agente ?? '',
            empresa: r.empresa ?? '',
            mesAno: mes,
            comissaoCc: comissao,
            rbmContaCorrente: rbm,
            qtd: 1,
          });
        }
      }

      let inseridos = 0;
      let atualizados = 0;

      // 3. Upsert na tabela calculos por ChaveJ + mesRef
      for (const entry of Array.from(agrupado.values())) {
        const existente = await db.select({ id: calculos.id })
          .from(calculos)
          .where(and(
            eq(calculos.chaveJ, entry.chaveJ),
            eq(calculos.mesRef, entry.mesAno)
          ))
          .limit(1);

        const comissaoStr = entry.comissaoCc.toFixed(2);
        const rbmStr = entry.rbmContaCorrente.toFixed(2);

        if (existente.length > 0) {
          // Atualiza apenas as colunas de Conta Corrente
          await db.update(calculos)
            .set({
              comissaoCc: comissaoStr,
              rbmContaCorrente: rbmStr,
            })
            .where(eq(calculos.id, existente[0].id));
          atualizados++;
        } else {
          // Insere nova linha
          await db.insert(calculos).values({
            mesRef: entry.mesAno,
            tipoPagamento: 'Comissão',
            empresa: entry.empresa,
            chaveJ: entry.chaveJ,
            nomeAgente: entry.nomeAgente,
            comissaoCc: comissaoStr,
            rbmContaCorrente: rbmStr,
          });
          inseridos++;
        }
      }

      return { ok: true, inseridos, atualizados, total: agrupado.size };
    }),
});
