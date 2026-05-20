import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { minutosSabedoria } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";

export const minutosSabedoriaRouter = router({
  /**
   * Retorna um pensamento aleatório (para exibição na Mensagem do Dia)
   */
  getRandom: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return null;
    const [result] = await db
      .select()
      .from(minutosSabedoria)
      .where(eq(minutosSabedoria.ativo, true))
      .orderBy(sql`RAND()`)
      .limit(1);
    return result ?? null;
  }),

  /**
   * Retorna todos os pensamentos (para administração)
   */
  getAll: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return await db
      .select()
      .from(minutosSabedoria)
      .orderBy(minutosSabedoria.numero);
  }),

  /**
   * Retorna o total de pensamentos cadastrados
   */
  getCount: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return 0;
    const [result] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(minutosSabedoria)
      .where(eq(minutosSabedoria.ativo, true));
    return result?.count ?? 0;
  }),
});
