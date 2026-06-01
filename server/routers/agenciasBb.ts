import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { agenciasBb } from "../../drizzle/schema";
import { like, or, eq, sql } from "drizzle-orm";

export const agenciasBbRouter = router({
  buscar: publicProcedure
    .input(z.object({
      busca: z.string().default(""),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { agencias: [] };

      const { busca, limit } = input;

      if (!busca.trim()) {
        const agencias = await db
          .select()
          .from(agenciasBb)
          .limit(limit)
          .orderBy(agenciasBb.prefixo);
        return { agencias };
      }

      // Verificar se é busca por número (prefixo)
      const numBusca = parseInt(busca.trim());
      const isNumero = !isNaN(numBusca) && busca.trim().match(/^\d+$/);

      let agencias;
      if (isNumero) {
        // Busca por prefixo (número exato ou começa com)
        agencias = await db
          .select()
          .from(agenciasBb)
          .where(
            or(
              eq(agenciasBb.prefixo, numBusca),
              like(agenciasBb.nome, `${busca.trim()}%`)
            )
          )
          .limit(limit)
          .orderBy(agenciasBb.prefixo);
      } else {
        // Busca por nome (contém)
        agencias = await db
          .select()
          .from(agenciasBb)
          .where(like(agenciasBb.nome, `%${busca.trim()}%`))
          .limit(limit)
          .orderBy(agenciasBb.prefixo);
      }

      return { agencias };
    }),

  total: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { total: 0 };
    const result = await db.select({ total: sql<number>`COUNT(*)` }).from(agenciasBb);
    return { total: result[0]?.total ?? 0 };
  }),
});
