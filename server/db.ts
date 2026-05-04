import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, agentes, loginAttempts, auditoria } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Queries para Agentes
export async function getAgenteByChaveJ(chaveJ: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get agente: database not available");
    return undefined;
  }

  const result = await db.select().from(agentes).where(eq(agentes.chaveJ, chaveJ)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Queries para Login Attempts
export async function getLoginAttempts(chaveJ: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(loginAttempts).where(eq(loginAttempts.chaveJ, chaveJ)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function incrementLoginAttempts(chaveJ: string) {
  const db = await getDb();
  if (!db) return undefined;

  const existing = await getLoginAttempts(chaveJ);
  
  if (existing) {
    const newAttempts = existing.attempts + 1;
    const isBlocked = newAttempts >= 3;
    // Bloqueio persiste por 24 horas
    const blockedUntil = isBlocked ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null;
    
    await db.update(loginAttempts)
      .set({
        attempts: newAttempts,
        isBlocked,
        blockedUntil,
        lastAttempt: new Date(),
      })
      .where(eq(loginAttempts.chaveJ, chaveJ));
  } else {
    await db.insert(loginAttempts).values({
      chaveJ,
      attempts: 1,
      isBlocked: false,
      lastAttempt: new Date(),
    });
  }
}

export async function resetLoginAttempts(chaveJ: string) {
  const db = await getDb();
  if (!db) return undefined;

  await db.update(loginAttempts)
    .set({
      attempts: 0,
      isBlocked: false,
      lastAttempt: new Date(),
    })
    .where(eq(loginAttempts.chaveJ, chaveJ));
}

// Queries para Auditoria
export async function createAuditLog(data: any) {
  const db = await getDb();
  if (!db) return undefined;

  return await db.insert(auditoria).values(data);
}

export async function getAuditLogs(filters?: any) {
  const db = await getDb();
  if (!db) return [];

  let baseQuery: any = db.select().from(auditoria);
  
  if (filters?.agenteId) {
    baseQuery = baseQuery.where(eq(auditoria.agenteId, filters.agenteId));
  }
  if (filters?.chaveJ) {
    baseQuery = baseQuery.where(eq(auditoria.chaveJ, filters.chaveJ));
  }
  if (filters?.modulo) {
    baseQuery = baseQuery.where(eq(auditoria.modulo, filters.modulo));
  }

  return await baseQuery.orderBy(auditoria.horarioEntrada);
}

export async function updateAuditLogSaida(numeroEntrada: string) {
  const db = await getDb();
  if (!db) return undefined;

  return await db.update(auditoria)
    .set({ horarioSaida: new Date() })
    .where(eq(auditoria.numeroEntrada, numeroEntrada));
}

// Função para desbloquear manualmente por admin
export async function unlockLoginAttempts(chaveJ: string) {
  const db = await getDb();
  if (!db) return undefined;

  await db.update(loginAttempts)
    .set({
      attempts: 0,
      isBlocked: false,
      blockedUntil: null,
      lastAttempt: new Date(),
    })
    .where(eq(loginAttempts.chaveJ, chaveJ));
}

// Função para obter status de bloqueio de todos os agentes
export async function getAllBlockedAttempts() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(loginAttempts).where(eq(loginAttempts.isBlocked, true));
}

// Função para obter histórico de tentativas de um agente
export async function getLoginAttemptsHistory(chaveJ: string) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(loginAttempts).where(eq(loginAttempts.chaveJ, chaveJ));
}
