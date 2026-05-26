import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { recados, boasVindasVisto } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const DESTINATARIOS = ["ceo", "admin", "supervisor", "suporte"] as const;

// Helpers para acessar campos extras do usuário (cargo, chaveJ) que são adicionados
// pelo auth.me mas não estão no tipo base User do schema
function getOpenId(ctx: { user: any }): string {
  return (ctx.user as any)?.openId ?? "";
}

function getAgenteId(ctx: { user: any }): number {
  const openId = getOpenId(ctx);
  if (!openId.startsWith("agente_")) throw new TRPCError({ code: "UNAUTHORIZED", message: "Não autenticado" });
  return parseInt(openId.replace("agente_", ""), 10);
}

function isCeo(ctx: { user: any }): boolean {
  const u = ctx.user as any;
  return (
    (u?.cargo ?? "").toLowerCase().includes("ceo") ||
    u?.permissoes === "admin" ||
    u?.openId === process.env.OWNER_OPEN_ID
  );
}

function getCargo(ctx: { user: any }): string {
  return ((ctx.user as any)?.cargo ?? "").toLowerCase();
}

function getChaveJ(ctx: { user: any }): string | null {
  return (ctx.user as any)?.chaveJ ?? null;
}

function getUserName(ctx: { user: any }): string {
  return (ctx.user as any)?.name ?? "Desconhecido";
}

export const recadosRouter = router({

  /** Envia um recado */
  enviar: protectedProcedure
    .input(z.object({
      destinatario: z.enum(DESTINATARIOS),
      assunto: z.string().max(255).optional(),
      mensagem: z.string().min(1, "Mensagem não pode ser vazia").max(2000),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const agenteId = getAgenteId(ctx);
      await db.insert(recados).values({
        remetenteId: agenteId,
        remetenteNome: getUserName(ctx),
        remetenteChaveJ: getChaveJ(ctx),
        destinatario: input.destinatario,
        assunto: input.assunto ?? null,
        mensagem: input.mensagem,
        lido: 0,
      });
      return { ok: true };
    }),

  /** Lista recados recebidos para o destinatário do usuário logado (CEO vê todos) */
  listar: protectedProcedure
    .input(z.object({
      destinatario: z.enum([...DESTINATARIOS, "todos"]).optional(),
      apenasNaoLidos: z.boolean().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const ceo = isCeo(ctx);

      let rows;
      if (ceo) {
        // CEO vê tudo
        const conditions: any[] = [];
        if (input?.destinatario && input.destinatario !== "todos") {
          conditions.push(eq(recados.destinatario, input.destinatario));
        }
        if (input?.apenasNaoLidos) conditions.push(eq(recados.lido, 0));
        rows = await db.select().from(recados)
          .where(conditions.length ? and(...conditions) : undefined)
          .orderBy(desc(recados.createdAt))
          .limit(200);
      } else {
        // Usuário normal: vê recados enviados para seu cargo
        const cargo = getCargo(ctx);
        let destFiltro = "";
        if (cargo.includes("supervisor")) destFiltro = "supervisor";
        else if (cargo.includes("suporte")) destFiltro = "suporte";
        else if (cargo.includes("admin")) destFiltro = "admin";
        else return [];

        const conditions: any[] = [eq(recados.destinatario, destFiltro)];
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
      const { sql: sqlFn } = await import("drizzle-orm");
      const ceo = isCeo(ctx);
      let where: any;
      if (!ceo) {
        const cargo = getCargo(ctx);
        let dest = "";
        if (cargo.includes("supervisor")) dest = "supervisor";
        else if (cargo.includes("suporte")) dest = "suporte";
        else if (cargo.includes("admin")) dest = "admin";
        else return { total: 0 };
        where = and(eq(recados.destinatario, dest), eq(recados.lido, 0));
      } else {
        where = eq(recados.lido, 0);
      }
      const [{ total }] = await db.select({ total: sqlFn<number>`COUNT(*)` }).from(recados).where(where);
      return { total: Number(total) };
    }),

  /** Marca recado como lido */
  marcarLido: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      await db.update(recados).set({
        lido: 1,
        lidoEm: new Date(),
        lidoPor: getUserName(ctx),
      }).where(eq(recados.id, input.id));
      return { ok: true };
    }),

  /** Marca todos como lidos */
  marcarTodosLidos: protectedProcedure
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const ceo = isCeo(ctx);
      let where: any;
      if (!ceo) {
        const cargo = getCargo(ctx);
        let dest = "";
        if (cargo.includes("supervisor")) dest = "supervisor";
        else if (cargo.includes("suporte")) dest = "suporte";
        else if (cargo.includes("admin")) dest = "admin";
        else return { ok: true };
        where = and(eq(recados.destinatario, dest), eq(recados.lido, 0));
      } else {
        where = eq(recados.lido, 0);
      }
      await db.update(recados).set({
        lido: 1,
        lidoEm: new Date(),
        lidoPor: getUserName(ctx),
      }).where(where);
      return { ok: true };
    }),

  // ── Boas-vindas comemorativa ──────────────────────────────────────────────

  /** Verifica se o agente já viu a tela de boas-vindas */
  verificarBoasVindas: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { deveExibir: false };

      // Só exibir a partir de 26/05/2026
      const dataInicio = new Date("2026-05-26T00:00:00-03:00");
      const agora = new Date();
      if (agora < dataInicio) return { deveExibir: false };

      const openId = getOpenId(ctx);
      if (!openId.startsWith("agente_")) return { deveExibir: false };
      const agenteId = parseInt(openId.replace("agente_", ""), 10);

      const [visto] = await db.select().from(boasVindasVisto)
        .where(eq(boasVindasVisto.agenteId, agenteId))
        .limit(1);
      return { deveExibir: !visto };
    }),

  /** Registra que o agente viu a tela de boas-vindas */
  registrarBoasVindas: protectedProcedure
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { ok: true };
      const openId = getOpenId(ctx);
      if (!openId.startsWith("agente_")) return { ok: true };
      const agenteId = parseInt(openId.replace("agente_", ""), 10);
      const chaveJ = getChaveJ(ctx);
      try {
        await db.insert(boasVindasVisto).values({ agenteId, chaveJ });
      } catch {
        // Já existe (UNIQUE), ignorar
      }
      return { ok: true };
    }),
});
