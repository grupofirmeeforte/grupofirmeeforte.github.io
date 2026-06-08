import { eq, and, lt, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, agentes, loginAttempts, auditoria, sessoes, InsertSessao, mensagens, InsertMensagem, Mensagem, valoresCalculo, ValoresCalculo, consignados, tabelasComissao } from "../drizzle/schema";
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
export async function getAgenteByNome(nomeAgente: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(agentes).where(eq(agentes.nomeAgente, nomeAgente)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

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

export async function updateAuditLogSaidaPorChaveJ(chaveJ: string) {
  const db = await getDb();
  if (!db) return undefined;
  // Atualiza todos os registros de Login/Entrada sem horário de saída para este agente
  return await db.update(auditoria)
    .set({ horarioSaida: new Date() })
    .where(
      and(
        eq(auditoria.chaveJ, chaveJ),
        eq(auditoria.acao, 'Entrada'),
        sql`${auditoria.horarioSaida} IS NULL`
      )
    );
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

  const agora = new Date();
  const agoraStr = agora.toISOString().slice(0, 19).replace('T', ' ');
  // Usar SQL raw para evitar problema de DEFAULT no TiDB com campos boolean e timestamp
  return await db.execute(
    sql`INSERT INTO mensagens (remetenteId, remetenteNome, destinatarioId, destinatarioNome, conteudo, tipo, lida, grupoChat, createdAt, updatedAt)
        VALUES (${data.remetenteId}, ${data.remetenteNome}, ${data.destinatarioId ?? null}, ${data.destinatarioNome ?? null}, ${data.conteudo}, ${'texto'}, ${0}, ${null}, ${agoraStr}, ${agoraStr})`
  );
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
    
    const campos = [
      'ativo01', 'ativo01De', 'ativo01Ate',
      'ativo02', 'ativo02De', 'ativo02Ate',
      'ativo03', 'ativo03De', 'ativo03Ate',
      'ativo04', 'ativo04De', 'ativo04Ate',
      'ativo05', 'ativo05De', 'ativo05Ate',
      'ativo06', 'ativo06De', 'ativo06Ate',
      'ativo07', 'ativo07De', 'ativo07Ate',
      'ativo08', 'ativo08De', 'ativo08Ate',
      'ativo09', 'ativo09De', 'ativo09Ate',
      'ativo10', 'ativo10De', 'ativo10Ate',
    ] as const;
    
    campos.forEach(campo => {
      if (dados[campo as keyof ValoresCalculo] !== undefined) {
        updateData[campo] = dados[campo as keyof ValoresCalculo];
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
  parcela: string | number,
  descricao: string,
  juros: string | number,
  mes?: string // mês no formato MM/AAAA — só calcula a partir de 05/2026
): Promise<{ perc: number; ativoUsado: string | null }> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot calculate perc pago: database not available");
    return { perc: 0, ativoUsado: null };
  }

  try {
    // Regra 0: Só aplica a partir de 05/2026
    if (mes) {
      const [mesNum, anoNum] = mes.split('/').map(Number);
      const mesAno = anoNum * 100 + mesNum; // ex: 202605
      if (mesAno < 202605) return { perc: 0, ativoUsado: null };
    }

    // Regra 1: RBM = 0 → comissão = 0
    if (!rbm || rbm === 0) return { perc: 0, ativoUsado: null };

    // ─── Utilitários ────────────────────────────────────────────────────────
    // Normaliza string: maiúsculas, sem acento
    const norm = (s: string) =>
      (s || '').toUpperCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Converte juros para percentual (ex: 0.0238 → 2.38, 2.38 → 2.38)
    const toPerc = (v: string | number | null | undefined): number => {
      if (v === null || v === undefined || v === '') return 0;
      const s = String(v).trim().toLowerCase();
      if (s === 'acima') return 99999;
      const n = parseFloat(s.replace(',', '.')) || 0;
      // Se já está em formato percentual (> 1), retorna direto
      // Se está em decimal (≤ 1), converte para percentual
      return n <= 1 && n > 0 ? n * 100 : n;
    };

    // ─── Passo 1: Determinar nível do ativo do agente ────────────────────────
    let nivelNum: number | null = null;

    // Aceita: Ativo04, Ativo 4, ativo4, etc.
    const nivelMatch = situacao.trim().match(/^Ativo\s*(\d{1,2})$/i);
    if (nivelMatch) {
      nivelNum = parseInt(nivelMatch[1]);
    }

    // Se situação é "Ativo" simples (sem número), determina pelo volume do mês
    if (!nivelNum && norm(situacao) === 'ATIVO') {
      const valoresResult = await db.select().from(valoresCalculo).where(eq(valoresCalculo.id, 1)).limit(1);
      const valores = valoresResult.length > 0 ? valoresResult[0] : null;

      if (valores) {
        const whereClause: any[] = [eq(consignados.chaveJ, chaveJ)];
        if (mes) whereClause.push(eq(consignados.mes, mes));

        const lista = await db
          .select({ valorLiquido: consignados.valorLiquido, restricaoSRCC: consignados.restricaoSRCC })
          .from(consignados)
          .where(and(...whereClause));

        // Soma valor líquido excluindo SRCC = Sim
        let somaLiq = 0;
        for (const c of lista) {
          const srcc = norm(c.restricaoSRCC || '');
          if (srcc !== 'SIM' && srcc !== 'S') {
            somaLiq += Number(c.valorLiquido) || 0;
          }
        }

        // Encontra o nível pela faixa de valor
        const faixas = [
          { num: 1, de: Number(valores.ativo01De) || 0, ate: Number(valores.ativo01Ate) || 0 },
          { num: 2, de: Number(valores.ativo02De) || 0, ate: Number(valores.ativo02Ate) || 0 },
          { num: 3, de: Number(valores.ativo03De) || 0, ate: Number(valores.ativo03Ate) || 0 },
          { num: 4, de: Number(valores.ativo04De) || 0, ate: Number(valores.ativo04Ate) || 0 },
          { num: 5, de: Number(valores.ativo05De) || 0, ate: Number(valores.ativo05Ate) || 0 },
          { num: 6, de: Number(valores.ativo06De) || 0, ate: Number(valores.ativo06Ate) || 0 },
          { num: 7, de: Number(valores.ativo07De) || 0, ate: Number(valores.ativo07Ate) || 0 },
          { num: 8, de: Number(valores.ativo08De) || 0, ate: Number(valores.ativo08Ate) || 0 },
          { num: 9, de: Number(valores.ativo09De) || 0, ate: Number(valores.ativo09Ate) || 0 },
          { num: 10, de: Number(valores.ativo10De) || 0, ate: Number(valores.ativo10Ate) || 0 },
        ];

        for (const f of faixas) {
          if (f.ate > 0 && somaLiq >= f.de && somaLiq <= f.ate) {
            nivelNum = f.num;
            break;
          }
        }
        if (!nivelNum) nivelNum = 10; // ultrapassou todas as faixas
      }
    }

    if (!nivelNum) nivelNum = 1;
    const ativoCol = `ativo${String(nivelNum).padStart(2, '0')}`;

    // ─── Passo 2: Normalizar juros e parcelas do contrato ────────────────────
    const parcelaNum = typeof parcela === 'string' ? parseInt(parcela) || 0 : (parcela || 0);
    // Juros do contrato sempre em percentual (ex: 2.38)
    const jurosPerc = toPerc(juros);

    // ─── Passo 3: Buscar linha na tabela de comissões ────────────────────────
    // Critério: empresa → convênio → parcelas → juros
    const todasLinhas = await db.select().from(tabelasComissao);

    // 3a. Filtrar por empresa
    // Tabela pode ter "BMF / FLEX" — agente pode ter "FLEX" ou "BMF"
    const linhasEmpresa = todasLinhas.filter(t => {
      if (!t.empresa) return true; // sem empresa = vale para todos
      const partes = t.empresa.split(/[\/,]/).map(p => norm(p)).filter(p => p.length > 0);
      const agNorm = norm(empresa);
      return partes.some(p => agNorm === p || agNorm.includes(p) || p.includes(agNorm));
    });

    // 3b. Filtrar por convênio
    // Tabela pode ter "CONSIGNADO PÚBLICO / CONVÊNIOS BANCO DO BRASIL"
    // Produto do contrato pode ser "CONVENIOS BANCO DO BRA..."
    const linhasConvenio = linhasEmpresa.filter(t => {
      if (!t.convenio) return false;
      const descNorm = norm(descricao || '');
      const partes = t.convenio.split(/[\/,]/).map(p => norm(p)).filter(p => p.length > 0);
      return partes.some(p => descNorm.includes(p) || p.includes(descNorm));
    });

    // 3c. Filtrar por prazo (parcelas)
    const linhasPrazo = linhasConvenio.filter(t => {
      const mDe = parseInt(t.mesesDe || '0') || 0;
      const mAte = parseInt(t.mesesAte || '9999') || 9999;
      return parcelaNum >= mDe && parcelaNum <= mAte;
    });

    // 3d. Filtrar por juros
    const linhasJuros = linhasPrazo.filter(t => {
      const jDe = toPerc(t.txJurosDe);
      const jAte = toPerc(t.txJurosAte);
      // Tolerância de 0.001% para arredondamento
      return jurosPerc >= (jDe - 0.001) && jurosPerc <= (jAte + 0.001);
    });

    // Pega a linha mais específica (menor faixa de juros)
    linhasJuros.sort((a, b) => toPerc(a.txJurosAte) - toPerc(b.txJurosAte));

    // Fallback: sem filtro de juros → sem filtro de prazo → sem filtro de convênio
    const tabelaMatch = linhasJuros[0] ?? linhasPrazo[0] ?? linhasConvenio[0] ?? null;

    if (!tabelaMatch) {
      console.warn(`[calcularPercPago] Linha não encontrada: empresa=${empresa}, convenio=${descricao}, parcela=${parcelaNum}, juros=${jurosPerc}%`);
      return { perc: 0, ativoUsado: null };
    }

    // ─── Passo 4: Pegar percentual do ativo do agente ────────────────────────
    const percPagoVal = (tabelaMatch as any)[ativoCol];
    if (!percPagoVal) return { perc: 0, ativoUsado: null };

    const perc = parseFloat(String(percPagoVal).replace(',', '.'));
    const ativoNome = `Ativo${String(nivelNum).padStart(2, '0')}`;

    console.log(`[calcularPercPago] empresa=${empresa} convenio=${descricao} parcela=${parcelaNum} juros=${jurosPerc}% → linha id=${tabelaMatch.id} ${ativoCol}=${perc}%`);

    return { perc: isNaN(perc) ? 0 : perc, ativoUsado: ativoNome };

  } catch (error) {
    console.error("[Database] Error calculating perc pago:", error);
    return { perc: 0, ativoUsado: null };
  }
}
