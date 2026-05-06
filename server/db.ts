import { eq, and, lt, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, agentes, loginAttempts, auditoria, sessoes, InsertSessao, mensagens, InsertMensagem, Mensagem, valoresCalculo, ValoresCalculo } from "../drizzle/schema";
import { ENV } from './_core/env';
import { or } from "drizzle-orm";

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

// Queries para Sessões Ativas
export async function createSessao(data: any) {
  const db = await getDb();
  if (!db) return undefined;

  // Desconectar todas as sessões ativas anteriores do mesmo usuário
  if (data.chaveJ) {
    await db.update(sessoes)
      .set({ ativo: 0, motivoDesconexao: 'Desconectado: nova sessão iniciada em outro dispositivo' })
      .where(and(eq(sessoes.chaveJ, data.chaveJ), eq(sessoes.ativo, 1)));
  }

  return await db.insert(sessoes).values(data);
}

export async function getSessaoByChaveJ(chaveJ: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(sessoes)
    .where(and(eq(sessoes.chaveJ, chaveJ), eq(sessoes.ativo, 1)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getSessaoById(sessaoId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(sessoes)
    .where(and(eq(sessoes.id, sessaoId), eq(sessoes.ativo, 1)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getTodasSessoesAtivas() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(sessoes)
    .where(eq(sessoes.ativo, 1))
    .orderBy(sessoes.horarioConexao);
}

export async function updateSessaoUltimoAcesso(sessaoId: number, modulo?: string) {
  const db = await getDb();
  if (!db) return undefined;

  const updateData: any = { ultimoAcesso: new Date() };
  if (modulo) {
    updateData.modulo = modulo;
  }

  return await db.update(sessoes)
    .set(updateData)
    .where(eq(sessoes.id, sessaoId));
}

export async function encerrarSessao(sessaoId: number) {
  const db = await getDb();
  if (!db) return undefined;

  return await db.update(sessoes)
    .set({ ativo: 0 })
    .where(eq(sessoes.id, sessaoId));
}

// Queries para Mensagens de Chat
export async function criarMensagem(data: InsertMensagem) {
  const db = await getDb();
  if (!db) return undefined;

  return await db.insert(mensagens).values(data);
}

export async function obterMensagensPrivadas(usuarioId: number, outroUsuarioId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(mensagens)
    .where(
      or(
        and(eq(mensagens.remetenteId, usuarioId), eq(mensagens.destinatarioId, outroUsuarioId)),
        and(eq(mensagens.remetenteId, outroUsuarioId), eq(mensagens.destinatarioId, usuarioId))
      )
    )
    .orderBy(desc(mensagens.createdAt))
    .limit(50);
}

export async function obterMensagensNaoLidas(usuarioId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(mensagens)
    .where(and(eq(mensagens.destinatarioId, usuarioId), eq(mensagens.lida, false)))
    .orderBy(desc(mensagens.createdAt));
}

export async function marcarMensagensComoLidas(usuarioId: number, remetenteId: number) {
  const db = await getDb();
  if (!db) return undefined;

  return await db.update(mensagens)
    .set({ lida: true })
    .where(and(eq(mensagens.destinatarioId, usuarioId), eq(mensagens.remetenteId, remetenteId)));
}

export async function obterMensagensGrupo(grupoChat: string) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(mensagens)
    .where(eq(mensagens.grupoChat, grupoChat))
    .orderBy(desc(mensagens.createdAt))
    .limit(100);
}


// ============================================================================
// VALORES PARA CÁLCULO
// ============================================================================

export async function obterValoresCalculo(): Promise<ValoresCalculo | null> {
  const db = await getDb();
  if (!db) return null;

  const resultado = await db.select().from(valoresCalculo).where(eq(valoresCalculo.id, 1)).limit(1);
  return resultado.length > 0 ? resultado[0] : null;
}

export async function atualizarValoresCalculo(dados: Partial<ValoresCalculo>): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update valores calculo: database not available");
    return;
  }

  try {
    const updateData: Record<string, unknown> = {};
    
    const campos = ['ativo01', 'ativo02', 'ativo03', 'ativo04', 'ativo05', 'ativo06', 'ativo07', 'ativo08', 'ativo09', 'ativo10'] as const;
    
    campos.forEach(campo => {
      if (dados[campo] !== undefined) {
        updateData[campo] = dados[campo];
      }
    });

    if (Object.keys(updateData).length > 0) {
      await db.update(valoresCalculo)
        .set(updateData)
        .where(eq(valoresCalculo.id, 1));
    }
  } catch (error) {
    console.error("[Database] Error updating valores calculo:", error);
    throw error;
  }
}


export async function calcularPercPago(
  rbm: number,
  situacao: string,
  chaveJ: string,
  empresa: string,
  parcela: string,
  descricao: string,
  juros: string
): Promise<number> {
  // 1. Se RBM = 0, resultado é 0%
  if (rbm === 0) {
    return 0;
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot calculate perc pago: database not available");
    return 0;
  }

  try {
    // Buscar valores de cálculo salvos
    const valoresResult = await db.select().from(valoresCalculo).where(eq(valoresCalculo.id, 1)).limit(1);
    const valores = valoresResult.length > 0 ? valoresResult[0] : null;

    if (!valores) {
      return 0;
    }

    // 3. Se situação é Ativo01-Ativo10, usar direto
    if (situacao.match(/^Ativo(\d+)$/)) {
      const match = situacao.match(/^Ativo(\d+)$/);
      if (match) {
        const ativoNum = parseInt(match[1]);
        const campoAtivo = `ativo${String(ativoNum).padStart(2, '0')}` as keyof ValoresCalculo;
        const valor = valores[campoAtivo] as number | undefined;
        return valor ? (valor / 100) : 0; // Converter de centavos para percentual
      }
    }

    // 2. Se situação é "Ativo", calcular baseado na soma de Vr. Líquido
    if (situacao === 'Ativo') {
      // Buscar consignados com mesma ChaveJ, Empresa, Parcela, Descrição e Juros
      const consignados = await db.select()
        .from(db.query.consignados || {})
        .where(
          and(
            eq(db.query.consignados?.chaveJ, chaveJ),
            eq(db.query.consignados?.empresa, empresa),
            eq(db.query.consignados?.parcela, parcela),
            eq(db.query.consignados?.descricao, descricao),
            eq(db.query.consignados?.juros, juros)
          )
        );

      // Somar Vr. Líquido
      let somaVrLiquido = 0;
      for (const cons of consignados) {
        somaVrLiquido += (cons.vrLiquido || 0);
      }

      // Encontrar qual Ativo encaixa
      const ativos = [
        { num: 1, valor: Number(valores.ativo01) || 0 },
        { num: 2, valor: Number(valores.ativo02) || 0 },
        { num: 3, valor: Number(valores.ativo03) || 0 },
        { num: 4, valor: Number(valores.ativo04) || 0 },
        { num: 5, valor: Number(valores.ativo05) || 0 },
        { num: 6, valor: Number(valores.ativo06) || 0 },
        { num: 7, valor: Number(valores.ativo07) || 0 },
        { num: 8, valor: Number(valores.ativo08) || 0 },
        { num: 9, valor: Number(valores.ativo09) || 0 },
        { num: 10, valor: Number(valores.ativo10) || 0 },
      ];

      // Encontrar o primeiro Ativo onde somaVrLiquido <= valor
      for (const ativo of ativos) {
        if (somaVrLiquido <= ativo.valor) {
          return (ativo.valor / 100); // Converter de centavos para percentual
        }
      }

      // Se passou de todos, usar o último (Ativo 10)
      return ((Number(valores.ativo10) || 0) / 100);
    }

    return 0;
  } catch (error) {
    console.error("[Database] Error calculating perc pago:", error);
    return 0;
  }
}
