import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { getSessaoByChaveJ } from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
    
    // Se usuário está autenticado, validar se a sessão ainda está ativa
    if (user && user.email) {
      // Tentar extrair chaveJ do email ou do openId
      let chaveJ: string | null = null;
      
      // Primeiro tenta extrair do email
      if (user.email && user.email.includes('@')) {
        chaveJ = user.email.split('@')[0];
      }
      
      // Se conseguiu um chaveJ, validar se a sessão está ativa
      if (chaveJ) {
        const sessao = await getSessaoByChaveJ(chaveJ);
        
        // Se não há sessão ativa, desconectar o usuário
        if (!sessao) {
          user = null;
          // Limpar cookie de sessão
          const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax' as const,
            path: '/',
          };
          opts.res.clearCookie('app_session_id', { ...cookieOptions, maxAge: -1 });
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
