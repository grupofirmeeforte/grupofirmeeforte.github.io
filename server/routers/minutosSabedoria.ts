import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { minutosSabedoria } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Retorna a data de hoje no formato YYYY-MM-DD (UTC-3 Brasília)
 */
function getHojeBrasilia(): string {
  const now = new Date();
  // UTC-3
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

    // 1. Verificar se já existe pensamento do dia para este usuário hoje (usando SQL raw para evitar problemas de tipo de data)
    const existentes = await db.execute(
      sql`SELECT pensamento_id FROM pensamento_do_dia_usuario WHERE user_id = ${userId} AND data_dia = ${hoje} LIMIT 1`
    );

    const rows = existentes as unknown as Array<{ pensamento_id: number }>;

    if (rows.length > 0) {
      // Já tem pensamento do dia — retornar o mesmo
      const pensamentoId = rows[0].pensamento_id;
      const [pensamento] = await db
        .select()
        .from(minutosSabedoria)
        .where(eq(minutosSabedoria.id, pensamentoId))
        .limit(1);
      return pensamento ?? null;
    }

    // 2. Buscar IDs já vistos por este usuário
    const vistos = await db.execute(
      sql`SELECT pensamento_id FROM pensamento_do_dia_usuario WHERE user_id = ${userId}`
    );
    const vistosRows = vistos as unknown as Array<{ pensamento_id: number }>;
    const vistosIds = vistosRows.map((v) => v.pensamento_id);

    // 3. Sortear um pensamento ainda não visto
    let novoPensamento: typeof minutosSabedoria.$inferSelect | undefined;

    if (vistosIds.length > 0) {
      const placeholders = vistosIds.map(() => '?').join(',');
      const result = await db.execute(
        sql`SELECT * FROM minutos_sabedoria WHERE ativo = 1 AND id NOT IN (${sql.raw(vistosIds.join(','))}) ORDER BY RAND() LIMIT 1`
      );
      const resultRows = result as unknown as Array<typeof minutosSabedoria.$inferSelect>;
      novoPensamento = resultRows[0];
    }

    // Se todos já foram vistos, reinicia o ciclo
    if (!novoPensamento) {
      const result = await db.execute(
        sql`SELECT * FROM minutos_sabedoria WHERE ativo = 1 ORDER BY RAND() LIMIT 1`
      );
      const resultRows = result as unknown as Array<typeof minutosSabedoria.$inferSelect>;
      novoPensamento = resultRows[0];
    }

    if (!novoPensamento) return null;

    // 4. Salvar o pensamento do dia para este usuário
    await db.execute(
      sql`INSERT INTO pensamento_do_dia_usuario (user_id, data_dia, pensamento_id, created_at) VALUES (${userId}, ${hoje}, ${novoPensamento.id}, ${Date.now()})`
    );

    return novoPensamento;
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
