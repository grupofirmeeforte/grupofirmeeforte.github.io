import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { agentes } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { TRPCError } from "@trpc/server";

const SIGNOS_MAP: Record<string, string> = {
  "Áries": "aries",
  "Touro": "taurus",
  "Gêmeos": "gemini",
  "Câncer": "cancer",
  "Leão": "leo",
  "Virgem": "virgo",
  "Libra": "libra",
  "Escorpião": "scorpio",
  "Sagitário": "sagittarius",
  "Capricórnio": "capricorn",
  "Aquário": "aquarius",
  "Peixes": "pisces",
};

const SIGNOS_PT = Object.keys(SIGNOS_MAP);

async function buscarETraduziHoroscopo(signoEn: string): Promise<string> {
  const url = `https://freehoroscopeapi.com/api/v1/get-horoscope/daily?sign=${signoEn}`;
  const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!resp.ok) throw new Error(`API retornou ${resp.status}`);
  const json = await resp.json() as { data?: { horoscope?: string } };
  const textoEn = json?.data?.horoscope;
  if (!textoEn) throw new Error("Horóscopo não encontrado na resposta da API");

  // Traduzir para português via LLM
  const llmResp = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "Você é um tradutor especializado em astrologia. Traduza o texto a seguir para o português brasileiro de forma natural e fluida, mantendo o tom astrológico. Retorne APENAS o texto traduzido, sem explicações adicionais.",
      },
      {
        role: "user",
        content: textoEn,
      },
    ],
  });

  const textoPt = llmResp?.choices?.[0]?.message?.content as string;
  if (!textoPt) throw new Error("Falha na tradução");
  return textoPt.trim();
}

export const horoscopoRouter = router({
  // Buscar horóscopo do dia para um signo (com cache diário no banco)
  getHoroscopo: publicProcedure
    .input(z.object({ signo: z.string().min(1) }))
    .query(async ({ input }) => {
      const signoEn = SIGNOS_MAP[input.signo];
      if (!signoEn) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Signo inválido" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB indisponível' });
      const hoje = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

      // Verificar cache
      const cached = await db.execute(
        sql`SELECT texto_pt FROM horoscopo_cache WHERE signo = ${input.signo} AND data_cache = ${hoje} LIMIT 1`
      ) as any;
      const cachedRow = Array.isArray(cached) ? cached[0] : (cached?.rows?.[0] ?? null);

      if (cachedRow && cachedRow.texto_pt) {
        return { signo: input.signo, texto: cachedRow.texto_pt, data: hoje, cache: true };
      }

      // Buscar da API e traduzir
      const textoPt = await buscarETraduziHoroscopo(signoEn);

      // Salvar no cache
      try {
        if (db) await db.execute(
          sql`INSERT INTO horoscopo_cache (signo, data_cache, texto_pt, created_at) VALUES (${input.signo}, ${hoje}, ${textoPt}, ${Date.now()}) ON DUPLICATE KEY UPDATE texto_pt = VALUES(texto_pt)`
        );
      } catch (e) {
        // Ignorar erro de cache, retornar o texto mesmo assim
      }

      return { signo: input.signo, texto: textoPt, data: hoje, cache: false };
    }),

  // Listar todos os signos disponíveis
  getSignos: publicProcedure.query(() => {
    return SIGNOS_PT;
  }),

  // Atualizar signo do agente
  atualizarSigno: protectedProcedure
    .input(z.object({ chaveJ: z.string().min(1), signo: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB indisponível' });
      await db.update(agentes)
        .set({ signo: input.signo || null })
        .where(eq(agentes.chaveJ, input.chaveJ));
      return { success: true };
    }),
});
