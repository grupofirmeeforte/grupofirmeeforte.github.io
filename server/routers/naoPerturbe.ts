import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { listaNaoPerturbe } from "../../drizzle/schema";
import { eq, like, inArray, desc } from "drizzle-orm";

// Normaliza telefone: remove tudo que não é dígito
function normalizarTelefone(tel: string): string {
  return tel.replace(/\D/g, "");
}

// Formata telefone para exibição
function formatarTelefone(tel: string): string {
  const d = tel.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return tel;
}

export const naoPerturbeRouter = router({
  // Listar todos os registros
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
      let rows = await db.select().from(listaNaoPerturbe).orderBy(desc(listaNaoPerturbe.createdAt));
      if (input.busca) {
        const b = input.busca.replace(/\D/g, "");
        rows = rows        .filter((r: typeof rows[0]) => r.telefone.includes(b) || (r.telefoneFormatado ?? "").includes(input.busca!));
      }
      const total = rows.length;
      return { rows: rows.slice(offset, offset + input.porPagina), total };
    }),

  // Verificar se um ou mais telefones estão na lista
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

  // Adicionar telefone manualmente
  adicionar: protectedProcedure
    .input(z.object({
      telefone: z.string().min(8),
      motivo: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });
      const tel = normalizarTelefone(input.telefone);
      if (tel.length < 8) throw new TRPCError({ code: "BAD_REQUEST", message: "Telefone inválido" });
      // Verificar duplicata
      const existente = await db.select({ id: listaNaoPerturbe.id })
        .from(listaNaoPerturbe)
        .where(eq(listaNaoPerturbe.telefone, tel));
      if (existente.length > 0) throw new TRPCError({ code: "CONFLICT", message: "Telefone já está na lista" });
      await db.insert(listaNaoPerturbe).values({
        telefone: tel,
        telefoneFormatado: formatarTelefone(tel),
        motivo: input.motivo ?? null,
        origem: "manual",
        adicionadoPorId: ctx.user.id,
      });
      return { ok: true };
    }),

  // Importar lista em lote (CSV/texto com um telefone por linha)
  importarLote: protectedProcedure
    .input(z.object({
      telefones: z.array(z.string()),
      motivo: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });
      const normalizados = Array.from(new Set(input.telefones.map(normalizarTelefone).filter(t => t.length >= 8)));
      if (normalizados.length === 0) return { inseridos: 0, duplicatas: 0 };
      // Buscar existentes
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
      return { inseridos: novos.length, duplicatas: normalizados.length - novos.length };
    }),

  // Remover telefone
  remover: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });
      await db.delete(listaNaoPerturbe).where(eq(listaNaoPerturbe.id, input.id));
      return { ok: true };
    }),

  // Contar total
  contar: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });
      const rows = await db.select({ id: listaNaoPerturbe.id }).from(listaNaoPerturbe);
      return { total: rows.length };
    }),
});
