import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { listaNaoPerturbe } from "../../drizzle/schema";
import { eq, like, inArray, desc, or, sql } from "drizzle-orm";

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

// Normaliza CPF: remove pontuação
function normalizarCpf(cpf: string): string {
  return cpf.replace(/\D/g, "");
}

// Formata CPF para exibição: 000.000.000-00
function formatarCpf(cpf: string): string {
  const d = cpf.replace(/\D/g, "");
  if (d.length === 11) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
  return cpf;
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
      telefone: z.string().min(1).optional(),
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
      if (tel.length < 8 && cpf.length < 11) throw new TRPCError({ code: "BAD_REQUEST", message: "Informe telefone ou CPF válido" });
      // Verificar duplicata por CPF (se informado) ou telefone
      if (cpf.length === 11) {
        const existente = await db.select({ id: listaNaoPerturbe.id })
          .from(listaNaoPerturbe)
          .where(eq(listaNaoPerturbe.cpf, cpf));
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

  // Importar lista em lote (CSV/texto com um telefone por linha) — mantido para compatibilidade
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

  // Importar planilha BB (XLSX) com upsert por CPF
  // Colunas esperadas: NOME, CPF, Reclamação, INCLUSÃO, Município, UF, OCUPAÇÃO, NÃO PERTUBE
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

      for (const rec of input) {
        const cpfNorm = normalizarCpf(rec.cpf ?? "");
        const cpfFmt = cpfNorm.length === 11 ? formatarCpf(cpfNorm) : (rec.cpf ?? "");
        const nome = (rec.nome ?? "").trim().toUpperCase();

        if (!cpfNorm && !nome) { ignorados++; continue; }

        const valores = {
          nome: nome || null,
          cpf: cpfFmt || null,
          reclamacao: rec.reclamacao ?? null,
          dataInclusao: rec.dataInclusao ?? null,
          municipio: rec.municipio ?? null,
          uf: rec.uf ?? null,
          ocupacao: rec.ocupacao ?? null,
          motivo: rec.naoPerturbe ?? "NÃO PERTUBE",
          origem: "planilha_bb",
          adicionadoPorId: ctx.user.id,
          telefone: '',
        };

        if (cpfNorm.length === 11) {
          // Upsert por CPF
          const existente = await db.select({ id: listaNaoPerturbe.id })
            .from(listaNaoPerturbe)
            .where(eq(listaNaoPerturbe.cpf, cpfFmt))
            .limit(1);

          if (existente.length > 0) {
            await db.update(listaNaoPerturbe).set({
              nome: valores.nome,
              reclamacao: valores.reclamacao,
              dataInclusao: valores.dataInclusao,
              municipio: valores.municipio,
              uf: valores.uf,
              ocupacao: valores.ocupacao,
              motivo: valores.motivo,
              origem: valores.origem,
            }).where(eq(listaNaoPerturbe.cpf, cpfFmt));
            atualizados++;
          } else {
            await db.insert(listaNaoPerturbe).values(valores);
            inseridos++;
          }
        } else {
          // Sem CPF válido: inserir apenas se não existir por nome
          if (nome) {
            const existente = await db.select({ id: listaNaoPerturbe.id })
              .from(listaNaoPerturbe)
              .where(eq(listaNaoPerturbe.nome, nome))
              .limit(1);
            if (existente.length > 0) {
              await db.update(listaNaoPerturbe).set({
                reclamacao: valores.reclamacao,
                dataInclusao: valores.dataInclusao,
                municipio: valores.municipio,
                uf: valores.uf,
                ocupacao: valores.ocupacao,
                motivo: valores.motivo,
              }).where(eq(listaNaoPerturbe.nome, nome));
              atualizados++;
            } else {
              await db.insert(listaNaoPerturbe).values(valores);
              inseridos++;
            }
          } else {
            ignorados++;
          }
        }
      }

      return { inseridos, atualizados, ignorados, total: input.length };
    }),

  // Remover registro
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
