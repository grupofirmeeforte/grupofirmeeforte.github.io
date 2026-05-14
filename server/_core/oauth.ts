import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Registrar sessão ativa na tabela sessoes (para aparecer em Usuários Conectados)
      try {
        const ipAddress = ((req as any).ip || req.headers['x-forwarded-for'] || 'unknown') as string;
        const userAgent = (req.headers['user-agent'] || 'unknown') as string;
        const nomeAgente = userInfo.name || userInfo.email || userInfo.openId;

        // Buscar agente pelo nome para associar o agenteId
        const agente = await db.getAgenteByNome(nomeAgente);
        const agenteId = agente?.id ?? 0;
        const chaveJ = agente?.chaveJ ?? userInfo.openId;

        const sessaoResult = await db.createSessao({
          agenteId,
          chaveJ,
          nomeAgente,
          ipAddress,
          userAgent,
        });

        // Adicionar ID da sessão ao cookie para validação
        if (sessaoResult && (sessaoResult as any).insertId) {
          res.cookie('sessionId', String((sessaoResult as any).insertId), {
            ...cookieOptions,
            maxAge: ONE_YEAR_MS,
          });
        }
      } catch (sessaoError) {
        // Não bloquear o login se a criação da sessão falhar
        console.error("[OAuth] Falha ao criar sessão:", sessaoError);
      }

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
