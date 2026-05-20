import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { minutosSabedoria, pensamentoDoDiaUsuario } from "../../drizzle/schema";
import { eq, sql, and, notInArray } from "drizzle-orm";

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

    // 1. Verificar se já existe pensamento do dia para este usuário hoje
    const [existente] = await db
      .select()
      .from(pensamentoDoDiaUsuario)
      .where(
        and(
          eq(pensamentoDoDiaUsuario.userId, userId),
          eq(pensamentoDoDiaUsuario.dataDia, hoje as unknown as Date)
        )
      )
      .limit(1);

    if (existente) {
      // Já tem pensamento do dia — retornar o mesmo
      const [pensamento] = await db
        .select()
        .from(minutosSabedoria)
        .where(eq(minutosSabedoria.id, existente.pensamentoId))
        .limit(1);
      return pensamento ?? null;
    }

    // 2. Buscar IDs já vistos por este usuário
    const vistos = await db
      .select({ pensamentoId: pensamentoDoDiaUsuario.pensamentoId })
      .from(pensamentoDoDiaUsuario)
      .where(eq(pensamentoDoDiaUsuario.userId, userId));

    const vistosIds = vistos.map((v) => v.pensamentoId);

    // 3. Sortear um pensamento ainda não visto
    let query = db
      .select()
      .from(minutosSabedoria)
      .where(eq(minutosSabedoria.ativo, true))
      .orderBy(sql`RAND()`)
      .limit(1);

    let novoPensamento;
    if (vistosIds.length > 0) {
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
      const [result] = await query;
      novoPensamento = result;
    }

    if (!novoPensamento) return null;

    // 4. Salvar o pensamento do dia para este usuário
    await db.insert(pensamentoDoDiaUsuario).values({
      userId,
      dataDia: hoje as unknown as Date,
      pensamentoId: novoPensamento.id,
      createdAt: new Date(),
    });

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
