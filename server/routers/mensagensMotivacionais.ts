import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { sql, eq, and, notInArray } from "drizzle-orm";
import { mensagensMotivacionais, motivacionalDoDiaUsuario } from "../../drizzle/schema";

/**
 * Retorna a data de hoje no formato YYYY-MM-DD (UTC-3 Brasília)
 */
function getHojeBrasilia(): string {
  const now = new Date();
  const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return brt.toISOString().slice(0, 10);
}

export const mensagensMotivacionaisRouter = router({
  /**
   * Retorna a mensagem motivacional do dia para o usuário logado.
   * - Fixa durante o dia inteiro para o mesmo usuário
   * - Diferente entre usuários no mesmo dia
   * - Não repete mensagens já vistas pelo usuário (enquanto houver novas)
   */
  getDoDia: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;

    const hoje = getHojeBrasilia();
    const userId = String(ctx.user.id);

    try {
      // 1. Verificar se já existe mensagem do dia para este usuário hoje
      const existenteResult = await db.execute(
        sql`SELECT mensagemId FROM motivacional_do_dia_usuario WHERE userId = ${userId} AND dataDia = ${hoje} LIMIT 1`
      );
      const existenteRows = (Array.isArray(existenteResult) ? existenteResult[0] : existenteResult) as unknown as Array<{ mensagemId: number }>;

      if (existenteRows && existenteRows.length > 0) {
        const mensagemId = Number(existenteRows[0].mensagemId);
        const [mensagem] = await db
          .select()
          .from(mensagensMotivacionais)
          .where(eq(mensagensMotivacionais.id, mensagemId))
          .limit(1);
        return mensagem ?? null;
      }

      // 2. Buscar IDs já vistos por este usuário
      const vistosResult = await db.execute(
        sql`SELECT mensagemId FROM motivacional_do_dia_usuario WHERE userId = ${userId}`
      );
      const vistosRows = (Array.isArray(vistosResult) ? vistosResult[0] : vistosResult) as unknown as Array<{ mensagemId: number }>;
      const vistosIds = (vistosRows || []).map((v) => Number(v.mensagemId)).filter(Boolean);

      // 3. Sortear uma mensagem ainda não vista
      let novaMensagem: typeof mensagensMotivacionais.$inferSelect | undefined;

      if (vistosIds.length > 0) {
        const [result] = await db
          .select()
          .from(mensagensMotivacionais)
          .where(
            and(
              eq(mensagensMotivacionais.ativo, true),
              notInArray(mensagensMotivacionais.id, vistosIds)
            )
          )
          .orderBy(sql`RAND()`)
          .limit(1);
        novaMensagem = result;
      }

      // Se todas já foram vistas, reinicia o ciclo
      if (!novaMensagem) {
        const [result] = await db
          .select()
          .from(mensagensMotivacionais)
          .where(eq(mensagensMotivacionais.ativo, true))
          .orderBy(sql`RAND()`)
          .limit(1);
        novaMensagem = result;
      }

      if (!novaMensagem) return null;

      // 4. Salvar a mensagem do dia para este usuário
      await db.execute(
        sql`INSERT INTO motivacional_do_dia_usuario (userId, dataDia, mensagemId) VALUES (${userId}, ${hoje}, ${novaMensagem.id})`
      );

      return novaMensagem;
    } catch (err) {
      console.error("[mensagensMotivacionais.getDoDia] Erro:", err);
      return null;
    }
  }),

  getCount: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return 0;
    const [result] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(mensagensMotivacionais)
      .where(eq(mensagensMotivacionais.ativo, true));
    return result?.count ?? 0;
  }),
});
