import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { getSessaoById, getSessaoByChaveJ, getDb } from "../db";
import { sessoes } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

export type DisconnectReason = {
  motivo: string;
};

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

const cookieClearOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

function clearSessionCookies(res: CreateExpressContextOptions["res"]) {
  res.clearCookie('app_session_id', cookieClearOptions);
  res.clearCookie('sessionId', cookieClearOptions);
  res.setHeader('X-Disconnect-Reason', 'Sessão encerrada pelo administrador');
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);

    // Para agentes customizados (login com ChaveJ), o JWT já é suficiente para autenticação.
    // Não verificar sessão ativa para evitar problemas com múltiplos dispositivos.
    if (user && !user.openId?.startsWith('agente_')) {
      // Apenas para login OAuth puro: verificar sessão pelo nome
      if (user.name) {
        const db = await getDb();
        if (db) {
          const result = await db.select().from(sessoes)
            .where(and(eq(sessoes.nomeAgente, user.name), eq(sessoes.ativo, 1)))
            .limit(1);
          if (result.length === 0) {
            user = null;
            clearSessionCookies(opts.res);
          }
        }
      }
    }
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
