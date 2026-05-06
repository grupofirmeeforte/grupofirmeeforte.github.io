import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { getSessaoById } from "../db";

export type DisconnectReason = {
  motivo: string;
};

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
    if (user) {
      // Tentar extrair o ID da sessão do cookie customizado
      const cookies = opts.req.headers.cookie || "";
      const sessionIdMatch = cookies.match(/sessionId=(\d+)/);
      
      if (sessionIdMatch) {
        const sessionId = parseInt(sessionIdMatch[1], 10);
        
        // Verificar se a sessão ainda está ativa
        const sessao = await getSessaoById(sessionId);
        
        // Se não há sessão ativa, desconectar o usuário
        if (!sessao) {
          user = null;
          // Limpar cookies de sessão
          const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax' as const,
            path: '/',
          };
          opts.res.clearCookie('app_session_id', cookieOptions);
          opts.res.clearCookie('sessionId', cookieOptions);
          
          // Enviar motivo de desconexão ao cliente
          opts.res.setHeader('X-Disconnect-Reason', 'Você foi desconectado porque sua conta foi acessada em outro dispositivo');
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
