import { eq } from "drizzle-orm";
import { z } from "zod";
import { cargoPermissoes } from "../../drizzle/schema";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";

export const cargoPermissoesRouter = router({
  // Listar todos os templates de cargo
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return db.select().from(cargoPermissoes).orderBy(cargoPermissoes.cargo);
  }),

  // Buscar template de um cargo específico
  getByCargo: protectedProcedure
    .input(z.object({ cargo: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const result = await db
        .select()
        .from(cargoPermissoes)
        .where(eq(cargoPermissoes.cargo, input.cargo))
        .limit(1);
      return result.length > 0 ? result[0] : null;
    }),

  // Salvar (upsert) template de permissões para um cargo
  salvar: protectedProcedure
    .input(z.object({
      cargo: z.string().min(1),
      nivelGeral: z.string(),
      permissoesModulos: z.string(), // JSON
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verificar se já existe
      const existing = await db
        .select({ id: cargoPermissoes.id })
        .from(cargoPermissoes)
        .where(eq(cargoPermissoes.cargo, input.cargo))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(cargoPermissoes)
          .set({ nivelGeral: input.nivelGeral, permissoesModulos: input.permissoesModulos })
          .where(eq(cargoPermissoes.cargo, input.cargo));
      } else {
        await db.insert(cargoPermissoes).values({
          cargo: input.cargo,
          nivelGeral: input.nivelGeral,
          permissoesModulos: input.permissoesModulos,
        });
      }

      return { success: true };
    }),

  // Deletar template de um cargo
  deletar: protectedProcedure
    .input(z.object({ cargo: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(cargoPermissoes).where(eq(cargoPermissoes.cargo, input.cargo));
      return { success: true };
    }),
});
