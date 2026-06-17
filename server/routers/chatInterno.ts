/**
 * Chat Interno em Tempo Real
 *
 * Regras de acesso:
 * - Promotores de Vendas só podem conversar com: CEO, Admin, Supervisor, Suporte
 * - Promotores NÃO podem conversar entre si
 * - CEO/Admin/Supervisor/Suporte podem conversar com qualquer pessoa
 */

import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { mensagens, agentes } from "../../drizzle/schema";
import { eq, and, or, desc, gt, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// Cargos considerados "gestão" (podem falar com todos)
const CARGOS_GESTAO = ["ceo", "admin", "administração", "administracao", "supervisor", "suporte"];

function isGestao(cargo: string | null | undefined): boolean {
  if (!cargo) return false;
  const c = cargo.toLowerCase();
  return CARGOS_GESTAO.some(g => c.includes(g));
}

function isPromotor(cargo: string | null | undefined): boolean {
  if (!cargo) return true; // sem cargo = trata como promotor (mais restritivo)
  const c = cargo.toLowerCase();
  return c.includes("promotor") || (!isGestao(cargo));
}

function getAgenteId(ctx: { user: any }): number {
  const openId = (ctx.user as any)?.openId ?? "";
  if (!openId.startsWith("agente_")) throw new TRPCError({ code: "UNAUTHORIZED", message: "Não autenticado" });
  return parseInt(openId.replace("agente_", ""), 10);
}

function getMeuCargo(ctx: { user: any }): string {
  return (ctx.user as any)?.cargo ?? "";
}

function getMeuNome(ctx: { user: any }): string {
  return (ctx.user as any)?.name ?? "Desconhecido";
}

/**
 * Verifica se dois agentes podem conversar entre si
 */
function podeConversar(cargoRemetente: string, cargoDestinatario: string): boolean {
  const remetenteGestao = isGestao(cargoRemetente);
  const destinatarioGestao = isGestao(cargoDestinatario);

  // Gestão pode falar com todos
  if (remetenteGestao) return true;

  // Promotor só pode falar com gestão
  if (!remetenteGestao && destinatarioGestao) return true;

  // Promotor NÃO pode falar com outro promotor
  return false;
}

export const chatInternoRouter = router({

  /**
   * Lista os contatos com quem o usuário logado pode conversar
   * Inclui contagem de mensagens não lidas por contato
   */
  listarContatos: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];

      const meuId = getAgenteId(ctx);
      const meuCargo = getMeuCargo(ctx);

      // Buscar todos os agentes ativos
      const todos = await db.select({
        id: agentes.id,
        nomeAgente: agentes.nomeAgente,
        cargo: agentes.cargo,
        chaveJ: agentes.chaveJ,
        situacao: agentes.situacao,
      }).from(agentes)
        .where(and(
          eq(agentes.situacao, "Ativo"),
          sql`${agentes.id} != ${meuId}`
        ));

      // Filtrar por regra de acesso
      const contatosPermitidos = todos.filter(a =>
        podeConversar(meuCargo, a.cargo ?? "")
      );

      // Buscar não lidos por contato
      const naoLidosPorContato: Record<number, number> = {};
      if (contatosPermitidos.length > 0) {
        const naoLidos = await db.select({
          remetenteId: mensagens.remetenteId,
          total: sql<number>`COUNT(*)`,
        }).from(mensagens)
          .where(and(
            eq(mensagens.destinatarioId, meuId),
            eq(mensagens.lida, false)
          ))
          .groupBy(mensagens.remetenteId);

        for (const row of naoLidos) {
          naoLidosPorContato[row.remetenteId] = Number(row.total);
        }
      }

      // Buscar última mensagem por contato
      const ultimasMensagens: Record<number, { conteudo: string; createdAt: Date }> = {};
      for (const contato of contatosPermitidos) {
        const [ultima] = await db.select({
          conteudo: mensagens.conteudo,
          createdAt: mensagens.createdAt,
        }).from(mensagens)
          .where(or(
            and(eq(mensagens.remetenteId, meuId), eq(mensagens.destinatarioId, contato.id)),
            and(eq(mensagens.remetenteId, contato.id), eq(mensagens.destinatarioId, meuId))
          ))
          .orderBy(desc(mensagens.createdAt))
          .limit(1);

        if (ultima) {
          ultimasMensagens[contato.id] = ultima;
        }
      }

      return contatosPermitidos.map(c => ({
        ...c,
        naoLidos: naoLidosPorContato[c.id] ?? 0,
        ultimaMensagem: ultimasMensagens[c.id] ?? null,
      })).sort((a, b) => {
        // Ordenar: primeiro os com não lidos, depois por última mensagem
        if (a.naoLidos !== b.naoLidos) return b.naoLidos - a.naoLidos;
        const ta = a.ultimaMensagem?.createdAt?.getTime() ?? 0;
        const tb = b.ultimaMensagem?.createdAt?.getTime() ?? 0;
        return tb - ta;
      });
    }),

  /**
   * Busca mensagens da conversa com um contato específico
   */
  obterConversa: protectedProcedure
    .input(z.object({
      contatoId: z.number(),
      ultimoId: z.number().optional(), // Para polling incremental
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const meuId = getAgenteId(ctx);
      const meuCargo = getMeuCargo(ctx);

      // Verificar permissão
      const [contato] = await db.select({ cargo: agentes.cargo })
        .from(agentes).where(eq(agentes.id, input.contatoId)).limit(1);

      if (!contato || !podeConversar(meuCargo, contato.cargo ?? "")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Você não tem permissão para conversar com este usuário." });
      }

      const conditions: any[] = [
        or(
          and(eq(mensagens.remetenteId, meuId), eq(mensagens.destinatarioId, input.contatoId)),
          and(eq(mensagens.remetenteId, input.contatoId), eq(mensagens.destinatarioId, meuId))
        )!
      ];

      if (input.ultimoId) {
        conditions.push(gt(mensagens.id, input.ultimoId));
      }

      const msgs = await db.select().from(mensagens)
        .where(and(...conditions))
        .orderBy(input.ultimoId ? mensagens.id : desc(mensagens.createdAt))
        .limit(input.ultimoId ? 50 : 100);

      // Se não é polling incremental, inverter para ordem cronológica
      if (!input.ultimoId) msgs.reverse();

      return msgs;
    }),

  /**
   * Envia uma mensagem para um contato
   */
  enviar: protectedProcedure
    .input(z.object({
      destinatarioId: z.number(),
      conteudo: z.string().min(1).max(2000),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const meuId = getAgenteId(ctx);
      const meuNome = getMeuNome(ctx);
      const meuCargo = getMeuCargo(ctx);

      // Verificar permissão
      const [destinatario] = await db.select({ cargo: agentes.cargo, nomeAgente: agentes.nomeAgente })
        .from(agentes).where(eq(agentes.id, input.destinatarioId)).limit(1);

      if (!destinatario) throw new TRPCError({ code: "NOT_FOUND", message: "Destinatário não encontrado." });
      if (!podeConversar(meuCargo, destinatario.cargo ?? "")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Você não tem permissão para enviar mensagens para este usuário." });
      }

      const [nova] = await db.insert(mensagens).values({
        remetenteId: meuId,
        remetenteNome: meuNome,
        destinatarioId: input.destinatarioId,
        destinatarioNome: destinatario.nomeAgente ?? "Desconhecido",
        conteudo: input.conteudo,
        tipo: "texto",
        lida: false,
      }).$returningId();

      return { id: nova.id, ok: true };
    }),

  /**
   * Marca mensagens de um contato como lidas
   */
  marcarLidas: protectedProcedure
    .input(z.object({ contatoId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { ok: true };
      const meuId = getAgenteId(ctx);
      await db.update(mensagens).set({ lida: true })
        .where(and(
          eq(mensagens.remetenteId, input.contatoId),
          eq(mensagens.destinatarioId, meuId),
          eq(mensagens.lida, false)
        ));
      return { ok: true };
    }),

  /**
   * Conta total de mensagens não lidas (para badge global)
   */
  totalNaoLidos: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { total: 0 };
      const meuId = getAgenteId(ctx);
      const [{ total }] = await db.select({ total: sql<number>`COUNT(*)` })
        .from(mensagens)
        .where(and(
          eq(mensagens.destinatarioId, meuId),
          eq(mensagens.lida, false)
        ));
      return { total: Number(total) };
    }),
});
