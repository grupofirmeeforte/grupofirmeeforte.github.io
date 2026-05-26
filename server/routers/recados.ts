/**
 * Router de Recados
 *
 * Regras:
 * - Qualquer agente pode enviar recado para: CEO, Admin, Supervisor, Suporte
 * - Gestão (CEO/Admin/Supervisor/Suporte) pode enviar recado para Promotores (por ID)
 * - Promotor NÃO pode enviar recado para outro Promotor
 * - CEO vê TODOS os recados (qualquer destinatário)
 * - Admin/Supervisor/Suporte veem apenas os recados destinados ao seu cargo
 * - Promotores veem apenas os recados que receberam da gestão
 *
 * IMPORTANTE: ctx.user é do tipo User (tabela users) e NÃO tem campo cargo.
 * O cargo deve ser buscado da tabela agentes usando o agenteId extraído do openId.
 */

import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { recados, boasVindasVisto, agentes } from "../../drizzle/schema";
import { eq, desc, and, or, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const CARGOS_GESTAO = ["ceo", "admin", "administração", "administracao", "supervisor", "suporte"];
const DESTINATARIOS_CARGO = ["ceo", "admin", "supervisor", "suporte"] as const;

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

function getUserName(ctx: { user: any }): string {
  return (ctx.user as any)?.name ?? "Desconhecido";
}

/** Busca cargo e chaveJ do agente logado diretamente do banco */
async function getAgenteInfo(ctx: { user: any }) {
  const db = await getDb();
  const ownerOpenId = process.env.OWNER_OPEN_ID;
  const openId = getOpenId(ctx);

  // Owner do sistema = CEO
  if (ownerOpenId && openId === ownerOpenId) {
    return { agenteId: 0, cargo: "CEO", chaveJ: null, nome: getUserName(ctx), isCeo: true };
  }

  const agenteId = getAgenteIdFromCtx(ctx);
  if (!agenteId || !db) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Não autenticado" });
  }

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
    nome: row?.nomeAgente ?? getUserName(ctx),
    isCeo: cargo.toLowerCase().includes("ceo"),
  };
}

export const recadosRouter = router({

  /** Envia um recado — pode ser para cargo (ceo/admin/supervisor/suporte) ou para promotor específico */
  enviar: protectedProcedure
    .input(z.object({
      destinatario: z.enum([...DESTINATARIOS_CARGO, "promotor"]).optional(),
      destinatarioId: z.number().optional(),
      assunto: z.string().max(255).optional(),
      mensagem: z.string().min(1, "Mensagem não pode ser vazia").max(2000),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const { agenteId, cargo, chaveJ, nome } = await getAgenteInfo(ctx);
      const euSouGestao = isGestao(cargo);

      let destinatario: string;
      let destinatarioId: number | null = null;
      let destinatarioNome: string | null = null;

      if (input.destinatarioId) {
        if (!euSouGestao) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas gestão pode enviar recados para promotores." });
        }
        const [agente] = await db.select({ nomeAgente: agentes.nomeAgente, cargo: agentes.cargo })
          .from(agentes).where(eq(agentes.id, input.destinatarioId)).limit(1);
        if (!agente) throw new TRPCError({ code: "NOT_FOUND", message: "Promotor não encontrado." });
        if (isGestao(agente.cargo)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Use o destinatário de cargo para enviar para gestão." });
        }
        destinatario = "promotor";
        destinatarioId = input.destinatarioId;
        destinatarioNome = agente.nomeAgente ?? "Desconhecido";
      } else if (input.destinatario) {
        destinatario = input.destinatario;
      } else {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Informe o destinatário." });
      }

      await db.insert(recados).values({
        remetenteId: agenteId,
        remetenteNome: nome,
        remetenteChaveJ: chaveJ,
        destinatario,
        destinatarioId,
        destinatarioNome,
        assunto: input.assunto ?? null,
        mensagem: input.mensagem,
        lido: 0,
      });
      return { ok: true };
    }),

  /** Lista promotores ativos para gestão poder selecionar destinatário */
  listarPromotores: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];

      const { cargo, isCeo } = await getAgenteInfo(ctx);
      if (!isGestao(cargo) && !isCeo) return [];

      const todos = await db.select({
        id: agentes.id,
        nomeAgente: agentes.nomeAgente,
        chaveJ: agentes.chaveJ,
        cargo: agentes.cargo,
      }).from(agentes)
        .where(eq(agentes.situacao, "Ativo"))
        .orderBy(agentes.nomeAgente);

      return todos.filter(a => !isGestao(a.cargo));
    }),

  /** Lista recados recebidos */
  listar: protectedProcedure
    .input(z.object({
      destinatario: z.enum([...DESTINATARIOS_CARGO, "promotor", "todos"]).optional(),
      apenasNaoLidos: z.boolean().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const { agenteId, cargo, isCeo } = await getAgenteInfo(ctx);
      const euSouGestao = isGestao(cargo);

      let rows;

      if (isCeo) {
        const conditions: any[] = [];
        if (input?.destinatario && input.destinatario !== "todos") {
          conditions.push(eq(recados.destinatario, input.destinatario));
        }
        if (input?.apenasNaoLidos) conditions.push(eq(recados.lido, 0));
        rows = await db.select().from(recados)
          .where(conditions.length ? and(...conditions) : undefined)
          .orderBy(desc(recados.createdAt))
          .limit(200);
      } else if (euSouGestao) {
        let destFiltro = "";
        const c = cargo.toLowerCase();
        if (c.includes("supervisor")) destFiltro = "supervisor";
        else if (c.includes("suporte")) destFiltro = "suporte";
        else if (c.includes("admin")) destFiltro = "admin";

        const conditions: any[] = [
          or(
            eq(recados.destinatario, destFiltro),
            and(eq(recados.remetenteId, agenteId), eq(recados.destinatario, "promotor"))
          )!
        ];
        if (input?.apenasNaoLidos) conditions.push(eq(recados.lido, 0));
        rows = await db.select().from(recados)
          .where(and(...conditions))
          .orderBy(desc(recados.createdAt))
          .limit(200);
      } else {
        // Promotor: vê apenas recados recebidos da gestão
        const conditions: any[] = [
          and(eq(recados.destinatario, "promotor"), eq(recados.destinatarioId, agenteId))!
        ];
        if (input?.apenasNaoLidos) conditions.push(eq(recados.lido, 0));
        rows = await db.select().from(recados)
          .where(and(...conditions))
          .orderBy(desc(recados.createdAt))
          .limit(200);
      }

      return rows;
    }),

  /** Conta recados não lidos */
  contarNaoLidos: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { total: 0 };

      const { agenteId, cargo, isCeo } = await getAgenteInfo(ctx);
      const euSouGestao = isGestao(cargo);

      let where: any;
      if (isCeo) {
        where = eq(recados.lido, 0);
      } else if (euSouGestao) {
        let dest = "";
        const c = cargo.toLowerCase();
        if (c.includes("supervisor")) dest = "supervisor";
        else if (c.includes("suporte")) dest = "suporte";
        else if (c.includes("admin")) dest = "admin";
        where = and(eq(recados.destinatario, dest), eq(recados.lido, 0));
      } else {
        where = and(
          eq(recados.destinatario, "promotor"),
          eq(recados.destinatarioId, agenteId),
          eq(recados.lido, 0)
        );
      }

      const [{ total }] = await db.select({ total: sql<number>`COUNT(*)` }).from(recados).where(where);
      return { total: Number(total) };
    }),

  /** Marca recado como lido */
  marcarLido: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const { nome } = await getAgenteInfo(ctx);
      await db.update(recados).set({
        lido: 1,
        lidoEm: new Date(),
        lidoPor: nome,
      }).where(eq(recados.id, input.id));
      return { ok: true };
    }),

  /** Marca todos como lidos */
  marcarTodosLidos: protectedProcedure
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const { agenteId, cargo, isCeo, nome } = await getAgenteInfo(ctx);
      const euSouGestao = isGestao(cargo);

      let where: any;
      if (isCeo) {
        where = eq(recados.lido, 0);
      } else if (euSouGestao) {
        let dest = "";
        const c = cargo.toLowerCase();
        if (c.includes("supervisor")) dest = "supervisor";
        else if (c.includes("suporte")) dest = "suporte";
        else if (c.includes("admin")) dest = "admin";
        where = and(eq(recados.destinatario, dest), eq(recados.lido, 0));
      } else {
        where = and(
          eq(recados.destinatario, "promotor"),
          eq(recados.destinatarioId, agenteId),
          eq(recados.lido, 0)
        );
      }

      await db.update(recados).set({
        lido: 1,
        lidoEm: new Date(),
        lidoPor: nome,
      }).where(where);
      return { ok: true };
    }),

  // ── Boas-vindas ──────────────────────────────────────────────────────────────

  verificarBoasVindas: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { deveExibir: false };
      const dataInicio = new Date("2026-05-26T00:00:00-03:00");
      if (new Date() < dataInicio) return { deveExibir: false };
      const agenteId = getAgenteIdFromCtx(ctx);
      if (!agenteId) return { deveExibir: false };
      const [visto] = await db.select().from(boasVindasVisto)
        .where(eq(boasVindasVisto.agenteId, agenteId)).limit(1);
      return { deveExibir: !visto };
    }),

  registrarBoasVindas: protectedProcedure
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { ok: true };
      const agenteId = getAgenteIdFromCtx(ctx);
      if (!agenteId) return { ok: true };
      const openId = getOpenId(ctx);
      const chaveJ = openId.startsWith("agente_") ? null : null;
      try {
        await db.insert(boasVindasVisto).values({ agenteId, chaveJ });
      } catch { /* já existe */ }
      return { ok: true };
    }),
});
