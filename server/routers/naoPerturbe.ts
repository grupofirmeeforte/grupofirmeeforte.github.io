import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { listaNaoPerturbe } from "../../drizzle/schema";
import { eq, inArray } from "drizzle-orm";

function normalizarTelefone(tel: string): string {
  return tel.replace(/\D/g, "");
}

function formatarTelefone(tel: string): string {
  const d = tel.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return tel;
}

function normalizarCpf(cpf: string): string {
  return cpf.replace(/\D/g, "");
}

function formatarCpf(cpf: string): string {
  const d = cpf.replace(/\D/g, "");
  if (d.length === 11) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
  return cpf;
}

export const naoPerturbeRouter = router({
  listar: protectedProcedure
    .input(z.object({
      busca: z.string().optional(),
      pagina: z.number().default(1),
      porPagina: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });
      const offset = (input.pagina - 1) * input.porPagina;
      let rows = await db.select().from(listaNaoPerturbe).orderBy(listaNaoPerturbe.nome);
      if (input.busca) {
        const b = input.busca.toLowerCase();
        const bDigits = input.busca.replace(/\D/g, "");
        rows = rows.filter((r: typeof rows[0]) =>
          (r.nome ?? "").toLowerCase().includes(b) ||
          (r.cpf ?? "").includes(bDigits) ||
          (r.telefone ?? "").includes(bDigits) ||
          (r.telefoneFormatado ?? "").includes(b) ||
          (r.municipio ?? "").toLowerCase().includes(b) ||
          (r.uf ?? "").toLowerCase().includes(b)
        );
      }
      const total = rows.length;
      return { rows: rows.slice(offset, offset + input.porPagina), total };
    }),

  verificar: protectedProcedure
    .input(z.object({ telefones: z.array(z.string()) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });
      const normalizados = input.telefones.map(normalizarTelefone).filter(t => t.length >= 8);
      if (normalizados.length === 0) return { bloqueados: [] };
      const encontrados = await db.select({ telefone: listaNaoPerturbe.telefone })
        .from(listaNaoPerturbe)
        .where(inArray(listaNaoPerturbe.telefone, normalizados));
      return { bloqueados: encontrados.map(r => r.telefone) };
    }),

  adicionar: protectedProcedure
    .input(z.object({
      telefone: z.string().optional(),
      motivo: z.string().optional(),
      nome: z.string().optional(),
      cpf: z.string().optional(),
      municipio: z.string().optional(),
      uf: z.string().optional(),
      ocupacao: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });
      const tel = normalizarTelefone(input.telefone ?? "");
      const cpf = normalizarCpf(input.cpf ?? "");
      if (tel.length < 8 && cpf.length < 11) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Informe telefone ou CPF válido" });
      }
      if (cpf.length === 11) {
        const existente = await db.select({ id: listaNaoPerturbe.id })
          .from(listaNaoPerturbe)
          .where(eq(listaNaoPerturbe.cpf, formatarCpf(cpf)));
        if (existente.length > 0) throw new TRPCError({ code: "CONFLICT", message: "CPF já está na lista" });
      } else if (tel.length >= 8) {
        const existente = await db.select({ id: listaNaoPerturbe.id })
          .from(listaNaoPerturbe)
          .where(eq(listaNaoPerturbe.telefone, tel));
        if (existente.length > 0) throw new TRPCError({ code: "CONFLICT", message: "Telefone já está na lista" });
      }
      await db.insert(listaNaoPerturbe).values({
        telefone: tel || '',
        telefoneFormatado: tel ? formatarTelefone(tel) : null,
        motivo: input.motivo ?? null,
        origem: "manual",
        adicionadoPorId: ctx.user.id,
        nome: input.nome ?? null,
        cpf: cpf ? formatarCpf(cpf) : null,
        municipio: input.municipio ?? null,
        uf: input.uf ?? null,
        ocupacao: input.ocupacao ?? null,
      });
      return { ok: true };
    }),

  importarLote: protectedProcedure
    .input(z.object({
      telefones: z.array(z.string()),
      motivo: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });
      const normalizados = Array.from(new Set(input.telefones.map(normalizarTelefone).filter(t => t.length >= 8)));
      if (normalizados.length === 0) return { inseridos: 0, atualizados: 0, duplicatas: 0 };
      const existentes = await db.select({ telefone: listaNaoPerturbe.telefone })
        .from(listaNaoPerturbe)
        .where(inArray(listaNaoPerturbe.telefone, normalizados));
      const setExistentes = new Set(existentes.map(r => r.telefone));
      const novos = normalizados.filter(t => !setExistentes.has(t));
      if (novos.length > 0) {
        await db.insert(listaNaoPerturbe).values(novos.map(t => ({
          telefone: t,
          telefoneFormatado: formatarTelefone(t),
          motivo: input.motivo ?? "Importação em lote",
          origem: "importacao",
          adicionadoPorId: ctx.user.id,
        })));
      }
      return { inseridos: novos.length, atualizados: 0, duplicatas: normalizados.length - novos.length };
    }),

  importarPlanilhaBB: protectedProcedure
    .input(z.array(z.object({
      nome: z.string().optional(),
      cpf: z.string().optional(),
      reclamacao: z.string().optional(),
      dataInclusao: z.string().optional(),
      municipio: z.string().optional(),
      uf: z.string().optional(),
      ocupacao: z.string().optional(),
      naoPerturbe: z.string().optional(),
    })))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });

      let inseridos = 0;
      let atualizados = 0;
      let ignorados = 0;

      // Preparar registros válidos
      const registros: Array<{
        cpfNorm: string;
        cpfFmt: string | null;
        nome: string | null;
        reclamacao: string | null;
        dataInclusao: string | null;
        municipio: string | null;
        uf: string | null;
        ocupacao: string | null;
        motivo: string;
        origem: string;
        adicionadoPorId: number;
        telefone: string;
      }> = [];

      for (const rec of input) {
        const cpfNorm = normalizarCpf(rec.cpf ?? "");
        const cpfFmt = cpfNorm.length === 11 ? formatarCpf(cpfNorm) : null;
        const nome = (rec.nome ?? "").trim().toUpperCase() || null;
        if (!cpfNorm && !nome) { ignorados++; continue; }
        registros.push({
          cpfNorm,
          cpfFmt,
          nome,
          reclamacao: rec.reclamacao || null,
          dataInclusao: rec.dataInclusao || null,
          municipio: rec.municipio || null,
          uf: rec.uf || null,
          ocupacao: rec.ocupacao || null,
          motivo: rec.naoPerturbe || "NÃO PERTUBE",
          origem: "planilha_bb",
          adicionadoPorId: ctx.user.id,
          telefone: '',
        });
      }

      if (registros.length === 0) {
        return { inseridos: 0, atualizados: 0, ignorados, total: input.length };
      }

      // Buscar CPFs já existentes de uma vez
      const cpfsValidos = registros.filter(r => r.cpfNorm.length === 11).map(r => r.cpfFmt!);
      const cpfsExistentes = new Set<string>();
      if (cpfsValidos.length > 0) {
        const existentes = await db.select({ cpf: listaNaoPerturbe.cpf })
          .from(listaNaoPerturbe)
          .where(inArray(listaNaoPerturbe.cpf, cpfsValidos));
        existentes.forEach(r => { if (r.cpf) cpfsExistentes.add(r.cpf); });
      }

      // Separar: novos (com CPF válido não existente), para atualizar, sem CPF
      const novosComCpf = registros.filter(r => r.cpfNorm.length === 11 && !cpfsExistentes.has(r.cpfFmt!));
      const paraAtualizar = registros.filter(r => r.cpfNorm.length === 11 && cpfsExistentes.has(r.cpfFmt!));
      const semCpf = registros.filter(r => r.cpfNorm.length !== 11);

      // Inserir novos em lotes de 100
      const todosNovos = [...novosComCpf, ...semCpf];
      const BATCH = 100;
      for (let i = 0; i < todosNovos.length; i += BATCH) {
        const lote = todosNovos.slice(i, i + BATCH).map(r => ({
          telefone: r.telefone,
          nome: r.nome,
          cpf: r.cpfFmt,
          reclamacao: r.reclamacao,
          dataInclusao: r.dataInclusao,
          municipio: r.municipio,
          uf: r.uf,
          ocupacao: r.ocupacao,
          motivo: r.motivo,
          origem: r.origem,
          adicionadoPorId: r.adicionadoPorId,
        }));
        await db.insert(listaNaoPerturbe).values(lote);
        inseridos += lote.length;
      }

      // Atualizar existentes um a um (poucos casos)
      for (const rec of paraAtualizar) {
        await db.update(listaNaoPerturbe).set({
          nome: rec.nome,
          reclamacao: rec.reclamacao,
          dataInclusao: rec.dataInclusao,
          municipio: rec.municipio,
          uf: rec.uf,
          ocupacao: rec.ocupacao,
          motivo: rec.motivo,
          origem: rec.origem,
        }).where(eq(listaNaoPerturbe.cpf, rec.cpfFmt!));
        atualizados++;
      }

      return { inseridos, atualizados, ignorados, total: input.length };
    }),

  // Verificar se uma lista de CPFs está na lista Não Pertube
  verificarCpfs: protectedProcedure
    .input(z.object({ cpfs: z.array(z.string()) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });
      if (input.cpfs.length === 0) return { bloqueados: [] };
      // Normalizar CPFs de entrada e formatar para comparação
      const cpfsFormatados = input.cpfs
        .map(c => {
          const d = c.replace(/\D/g, "");
          if (d.length === 11) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
          return c;
        })
        .filter(Boolean);
      if (cpfsFormatados.length === 0) return { bloqueados: [] };
      const encontrados = await db
        .select({ cpf: listaNaoPerturbe.cpf, motivo: listaNaoPerturbe.motivo })
        .from(listaNaoPerturbe)
        .where(inArray(listaNaoPerturbe.cpf, cpfsFormatados));
      return { bloqueados: encontrados.map(r => ({ cpf: r.cpf ?? "", motivo: r.motivo ?? "NÃO PERTUBE" })) };
    }),

  remover: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });
      await db.delete(listaNaoPerturbe).where(eq(listaNaoPerturbe.id, input.id));
      return { ok: true };
    }),

  contar: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });
      const rows = await db.select({ id: listaNaoPerturbe.id }).from(listaNaoPerturbe);
      return { total: rows.length };
    }),
});
