/**
 * Router de Comunicados com Arquivo
 * Permite enviar prints, fotos e documentos para:
 * - Todos os agentes
 * - Apenas promotores
 * - Um agente específico
 */

import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { comunicados, comunicadosLidos, agentes } from "../../drizzle/schema";
import { eq, desc, and, or, sql, inArray, notInArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { storagePut } from "../storage";

const CARGOS_GESTAO = ["ceo", "admin", "administração", "administracao", "supervisor", "suporte"];

function isGestao(cargo: string | null | undefined): boolean {
  if (!cargo) return false;
  const c = cargo.toLowerCase();
  return CARGOS_GESTAO.some(g => c.includes(g));
}

function getOpenId(ctx: { user: any }): string {
  return (ctx.user as any)?.openId ?? "";
}

function getAgenteIdFromCtx(ctx: { user: any }): number | null {
  const openId = getOpenId(ctx);
  if (!openId.startsWith("agente_")) return null;
  return parseInt(openId.replace("agente_", ""), 10);
}

async function getAgenteInfo(ctx: { user: any }) {
  const db = await getDb();
  const ownerOpenId = process.env.OWNER_OPEN_ID;
  const openId = getOpenId(ctx);

  if (ownerOpenId && openId === ownerOpenId) {
    return { agenteId: 0, cargo: "CEO", chaveJ: null, nome: (ctx.user as any)?.name ?? "CEO", isCeo: true };
  }

  const agenteId = getAgenteIdFromCtx(ctx);
  if (!agenteId || !db) throw new TRPCError({ code: "UNAUTHORIZED" });

  const [row] = await db.select({
    cargo: agentes.cargo,
    chaveJ: agentes.chaveJ,
    nomeAgente: agentes.nomeAgente,
  }).from(agentes).where(eq(agentes.id, agenteId)).limit(1);

  const cargo = row?.cargo ?? "";
  return {
    agenteId,
    cargo,
    chaveJ: row?.chaveJ ?? null,
    nome: row?.nomeAgente ?? (ctx.user as any)?.name ?? "Desconhecido",
    isCeo: cargo.toLowerCase().includes("ceo"),
  };
}

export const comunicadosRouter = router({

  /** Enviar comunicado com arquivo (base64) */
  enviar: protectedProcedure
    .input(z.object({
      tipoDestinatario: z.enum(["todos", "promotores", "especifico"]),
      destinatarioId: z.number().optional(),
      titulo: z.string().max(255).optional(),
      descricao: z.string().max(1000).optional(),
      // Arquivo em base64
      arquivoBase64: z.string().optional(),
      arquivoTipo: z.string().optional(),
      arquivoNome: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const { agenteId, cargo, chaveJ, nome } = await getAgenteInfo(ctx);

      let destinatarioNome: string | null = null;
      if (input.tipoDestinatario === "especifico" && input.destinatarioId) {
        const [ag] = await db.select({ nomeAgente: agentes.nomeAgente })
          .from(agentes).where(eq(agentes.id, input.destinatarioId)).limit(1);
        destinatarioNome = ag?.nomeAgente ?? null;
      }

      // Upload do arquivo para S3
      let arquivoUrl: string | null = null;
      let arquivoKey: string | null = null;
      if (input.arquivoBase64 && input.arquivoTipo) {
        const base64Data = input.arquivoBase64.replace(/^data:[^;]+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const ext = input.arquivoNome?.split(".").pop() ?? "bin";
        const key = `comunicados/${Date.now()}-${agenteId}.${ext}`;
        const result = await storagePut(key, buffer, input.arquivoTipo);
        arquivoUrl = result.url;
        arquivoKey = result.key;
      }

      await db.insert(comunicados).values({
        remetenteId: agenteId,
        remetenteNome: nome,
        remetenteChaveJ: chaveJ,
        tipoDestinatario: input.tipoDestinatario,
        destinatarioId: input.destinatarioId ?? null,
        destinatarioNome,
        titulo: input.titulo ?? null,
        descricao: input.descricao ?? null,
        arquivoUrl,
        arquivoKey,
        arquivoTipo: input.arquivoTipo ?? null,
        arquivoNome: input.arquivoNome ?? null,
      });

      return { ok: true };
    }),

  /** Listar agentes disponíveis para envio específico */
  listarAgentes: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      await getAgenteInfo(ctx); // valida autenticação
      return db.select({
        id: agentes.id,
        nomeAgente: agentes.nomeAgente,
        chaveJ: agentes.chaveJ,
        cargo: agentes.cargo,
      }).from(agentes)
        .where(eq(agentes.situacao, "Ativo"))
        .orderBy(agentes.nomeAgente);
    }),

  /** Listar comunicados recebidos pelo agente logado */
  listar: protectedProcedure
    .input(z.object({ apenasNaoLidos: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const { agenteId, cargo } = await getAgenteInfo(ctx);
      const euSouGestao = isGestao(cargo);

      // Comunicados visíveis para este agente:
      // - tipoDestinatario = 'todos'
      // - tipoDestinatario = 'promotores' E eu sou promotor
      // - tipoDestinatario = 'especifico' E destinatarioId = meu id
      const conditions: any[] = [
        or(
          eq(comunicados.tipoDestinatario, "todos"),
          !euSouGestao ? eq(comunicados.tipoDestinatario, "promotores") : sql`0=1`,
          and(eq(comunicados.tipoDestinatario, "especifico"), eq(comunicados.destinatarioId, agenteId))
        )!
      ];

      const rows = await db.select().from(comunicados)
        .where(and(...conditions))
        .orderBy(desc(comunicados.createdAt))
        .limit(100);

      if (rows.length === 0) return [];

      // Verificar quais já foram lidos por este agente
      const ids = rows.map(r => r.id);
      const lidos = await db.select({ comunicadoId: comunicadosLidos.comunicadoId })
        .from(comunicadosLidos)
        .where(and(
          eq(comunicadosLidos.agenteId, agenteId),
          inArray(comunicadosLidos.comunicadoId, ids)
        ));
      const lidosSet = new Set(lidos.map(l => l.comunicadoId));

      return rows.map(r => ({ ...r, lido: lidosSet.has(r.id) }));
    }),

  /** Contar comunicados não lidos */
  contarNaoLidos: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { total: 0 };

      const { agenteId, cargo } = await getAgenteInfo(ctx);
      const euSouGestao = isGestao(cargo);

      const conditions: any[] = [
        or(
          eq(comunicados.tipoDestinatario, "todos"),
          !euSouGestao ? eq(comunicados.tipoDestinatario, "promotores") : sql`0=1`,
          and(eq(comunicados.tipoDestinatario, "especifico"), eq(comunicados.destinatarioId, agenteId))
        )!
      ];

      const todos = await db.select({ id: comunicados.id }).from(comunicados).where(and(...conditions));
      if (todos.length === 0) return { total: 0 };

      const ids = todos.map(r => r.id);
      const lidos = await db.select({ comunicadoId: comunicadosLidos.comunicadoId })
        .from(comunicadosLidos)
        .where(and(
          eq(comunicadosLidos.agenteId, agenteId),
          inArray(comunicadosLidos.comunicadoId, ids)
        ));
      const total = ids.length - lidos.length;
      return { total: Math.max(0, total) };
    }),

  /** Marcar comunicado como lido */
  marcarLido: protectedProcedure
    .input(z.object({ comunicadoId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { ok: true };
      const { agenteId } = await getAgenteInfo(ctx);
      try {
        await db.insert(comunicadosLidos).values({
          comunicadoId: input.comunicadoId,
          agenteId,
        });
      } catch { /* já marcado */ }
      return { ok: true };
    }),
});
