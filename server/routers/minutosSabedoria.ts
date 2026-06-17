import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { minutosSabedoria, pensamentoDoDiaUsuario } from "../../drizzle/schema";
import { eq, sql, and, notInArray, ne } from "drizzle-orm";

/**
 * Retorna a data de hoje no formato YYYY-MM-DD (UTC-3 Brasília)
 */
function getHojeBrasilia(): string {
  const now = new Date();
  const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return brt.toISOString().slice(0, 10);
}

export const minutosSabedoriaRouter = router({
  /**
   * Retorna o pensamento do dia para o usuário logado.
   * - Fixo durante o dia inteiro para o mesmo usuário
   * - Diferente entre usuários
   * - Não repete pensamentos já vistos pelo usuário (enquanto houver novos)
   */
  getDoDia: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;

    const hoje = getHojeBrasilia();
    const userId = String(ctx.user.id);

    try {
      // 1. Verificar se já existe pensamento do dia para este usuário hoje
      // Usa SQL raw para comparar DATE corretamente
      const existenteResult = await db.execute(
        sql`SELECT pensamento_id FROM pensamento_do_dia_usuario WHERE user_id = ${userId} AND data_dia = ${hoje} LIMIT 1`
      );

      // mysql2 retorna [rows, fields] — pegar o primeiro elemento
      const existenteRows = (Array.isArray(existenteResult) ? existenteResult[0] : existenteResult) as unknown as Array<{ pensamento_id: number }>;

      if (existenteRows && existenteRows.length > 0) {
        const pensamentoId = Number(existenteRows[0].pensamento_id);
        const [pensamento] = await db
          .select()
          .from(minutosSabedoria)
          .where(eq(minutosSabedoria.id, pensamentoId))
          .limit(1);
        return pensamento ?? null;
      }

      // 2. Buscar IDs já vistos por este usuário
      const vistosResult = await db.execute(
        sql`SELECT pensamento_id FROM pensamento_do_dia_usuario WHERE user_id = ${userId}`
      );
      const vistosRows = (Array.isArray(vistosResult) ? vistosResult[0] : vistosResult) as unknown as Array<{ pensamento_id: number }>;
      const vistosIds = (vistosRows || []).map((v) => Number(v.pensamento_id)).filter(Boolean);

      // 3. Sortear um pensamento ainda não visto
      let novoPensamento: typeof minutosSabedoria.$inferSelect | undefined;

      if (vistosIds.length > 0) {
        // Usar NOT IN com Drizzle
        const [result] = await db
          .select()
          .from(minutosSabedoria)
          .where(
            and(
              eq(minutosSabedoria.ativo, true),
              notInArray(minutosSabedoria.id, vistosIds)
            )
          )
          .orderBy(sql`RAND()`)
          .limit(1);
        novoPensamento = result;
      }

      // Se todos já foram vistos, reinicia o ciclo
      if (!novoPensamento) {
        const [result] = await db
          .select()
          .from(minutosSabedoria)
          .where(eq(minutosSabedoria.ativo, true))
          .orderBy(sql`RAND()`)
          .limit(1);
        novoPensamento = result;
      }

      if (!novoPensamento) return null;

      // 4. Salvar o pensamento do dia para este usuário
      await db.execute(
        sql`INSERT INTO pensamento_do_dia_usuario (user_id, data_dia, pensamento_id, created_at) VALUES (${userId}, ${hoje}, ${novoPensamento.id}, ${Date.now()})`
      );

      return novoPensamento;
    } catch (err) {
      console.error("[minutosSabedoria.getDoDia] Erro:", err);
      return null;
    }
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
