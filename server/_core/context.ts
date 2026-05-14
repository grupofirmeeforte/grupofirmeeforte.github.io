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
    
    // Se usuário está autenticado, validar se a sessão ainda está ativa
    if (user) {
      const cookies = opts.req.headers.cookie || "";
      const sessionIdMatch = cookies.match(/sessionId=(\d+)/);
      
      if (sessionIdMatch) {
        // Verificar pelo ID da sessão (login com ChaveJ)
        const sessionId = parseInt(sessionIdMatch[1], 10);
        const sessao = await getSessaoById(sessionId);
        if (!sessao) {
          user = null;
          clearSessionCookies(opts.res);
        }
      } else {
        // Sem sessionId: verificar sessão pelo openId/nome (login OAuth via Safari/Apple/Google)
        const openId = user.openId;
        const db = await getDb();
        if (db) {
          let sessaoAtiva = false;
          if (openId.startsWith('agente_')) {
            // Login via ChaveJ customizado
            const agenteId = parseInt(openId.replace('agente_', ''), 10);
            const result = await db.select().from(sessoes)
              .where(and(eq(sessoes.agenteId, agenteId), eq(sessoes.ativo, 1)))
              .limit(1);
            sessaoAtiva = result.length > 0;
          } else if (user.name) {
            // Login OAuth puro: verificar pelo nome do agente
            const result = await db.select().from(sessoes)
              .where(and(eq(sessoes.nomeAgente, user.name), eq(sessoes.ativo, 1)))
              .limit(1);
            sessaoAtiva = result.length > 0;
          } else {
            // Sem como verificar: permitir acesso
            sessaoAtiva = true;
          }
          if (!sessaoAtiva) {
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
