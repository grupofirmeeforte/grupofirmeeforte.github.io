import { eq, and, lt, desc } from "drizzle-orm";
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

    // Regra 1: Se RBM é zero ou vazio, Perc. Pago = 0%
    if (!rbm || rbm === 0) return { perc: 0, ativoUsado: null };

    // 2. Determinar nível do agente
    // Se situação é Ativo01-Ativo10, usar direto (sem calcular faixa)
    let nivelNum: number | null = null;
    const nivelMatch = situacao.match(/^Ativo(\d{1,2})$/i);
    if (nivelMatch) {
      nivelNum = parseInt(nivelMatch[1]);
    }

    // Se situação é "Ativo" simples, calcular pela soma do VrLíquido no mês
    if (!nivelNum && situacao.toLowerCase() === 'ativo') {
      // Buscar faixas de nível na tabela valoresCalculo
      const valoresResult = await db.select().from(valoresCalculo).where(eq(valoresCalculo.id, 1)).limit(1);
      const valores = valoresResult.length > 0 ? valoresResult[0] : null;

      if (valores) {
        // Somar VrLíquido do agente no mês (todos os registros do mesmo mês)
        const whereClause: any[] = [eq(consignados.chaveJ, chaveJ)];
        if (mes) whereClause.push(eq(consignados.mes, mes));

        const consignadosList = await db.select({ valorLiquido: consignados.valorLiquido, restricaoSRCC: consignados.restricaoSRCC })
          .from(consignados)
          .where(and(...whereClause));

        // Soma VrLíquido excluindo registros com SRCC = Sim
        let somaVrLiquido = 0;
        for (const cons of consignadosList) {
          const srcc = (cons.restricaoSRCC || '').toLowerCase();
          if (srcc !== 'sim' && srcc !== 's') {
            somaVrLiquido += (cons.valorLiquido ? Number(cons.valorLiquido) : 0);
          }
        }

        // Encontrar nível pelo valor acumulado
        const faixas = [
          { num: 1, ate: Number(valores.ativo01) || 0 },
          { num: 2, ate: Number(valores.ativo02) || 0 },
          { num: 3, ate: Number(valores.ativo03) || 0 },
          { num: 4, ate: Number(valores.ativo04) || 0 },
          { num: 5, ate: Number(valores.ativo05) || 0 },
          { num: 6, ate: Number(valores.ativo06) || 0 },
          { num: 7, ate: Number(valores.ativo07) || 0 },
          { num: 8, ate: Number(valores.ativo08) || 0 },
          { num: 9, ate: Number(valores.ativo09) || 0 },
          { num: 10, ate: Number(valores.ativo10) || 0 },
        ];

        for (const faixa of faixas) {
          if (faixa.ate > 0 && somaVrLiquido <= faixa.ate) {
            nivelNum = faixa.num;
            break;
          }
        }
        // Se ultrapassou tudo, usa nível 10
        if (!nivelNum) nivelNum = 10;
      }
    }

    // Se ainda não tem nível, usa 1 como padrão
    if (!nivelNum) nivelNum = 1;

    const ativoCol = `ativo${String(nivelNum).padStart(2, '0')}`;

    // 3. Buscar percentual na Tabela de Comissão
    // Filtrar por: empresa + convênio (match com descricaoProduto) + parcela + juros
    const parcelaNum = typeof parcela === 'string' ? parseInt(parcela) || 0 : parcela;
    const jurosNum = typeof juros === 'string' ? parseFloat(juros.replace(',', '.')) || 0 : juros;

    // Buscar todas as linhas da tabela para a empresa
    const todasLinhas = await db.select().from(tabelasComissao)
      .where(eq(tabelasComissao.empresa, empresa));

    // Filtrar por convênio: match exato ou descricaoProduto contém convenio ou vice-versa
    const linhasFiltradas = todasLinhas.filter(t => {
      if (!t.convenio) return false;
      const conv = t.convenio.toUpperCase().trim();
      const desc = (descricao || '').toUpperCase().trim();
      return conv === desc || desc.includes(conv) || conv.includes(desc);
    });

    // Filtrar por parcela e juros — ordenar por especificidade:
    // Faixas com txJurosAte numérico (específico) têm prioridade sobre "acima"
    const linhasComParcela = linhasFiltradas.filter(t => {
      const mDe = t.mesesDe ? parseInt(t.mesesDe) : 0;
      const mAte = t.mesesAte ? parseInt(t.mesesAte) : 9999;
      return parcelaNum >= mDe && parcelaNum <= mAte;
    });

    // Normalizar valor de juros: tratar vírgula como separador decimal
    const parseJuros = (v: string | null | undefined): number => {
      if (!v) return 0;
      const s = v.trim().toLowerCase();
      if (s === 'acima') return 9999; // fallback para "acima" ainda existente
      return parseFloat(s.replace(',', '.')) || 0;
    };

    // Filtrar por faixa de juros (prioridade: faixa mais específica = menor jAte)
    const linhasComJuros = linhasComParcela.filter(t => {
      const jDe = parseJuros(t.txJurosDe);
      const jAte = parseJuros(t.txJurosAte);
      return jurosNum >= jDe && jurosNum <= jAte;
    });

    // Ordenar por especificidade: menor jAte primeiro (faixa mais restrita tem prioridade)
    linhasComJuros.sort((a, b) => parseJuros(a.txJurosAte) - parseJuros(b.txJurosAte));

    let tabelaMatch = linhasComJuros[0] ?? linhasComParcela[0];

    // Se não achou por parcela, pega a primeira linha do convênio
    if (!tabelaMatch && linhasFiltradas.length > 0) {
      tabelaMatch = linhasFiltradas[0];
    }

    if (!tabelaMatch) {
      console.warn(`[calcularPercPago] Nenhuma linha encontrada na tabela para empresa=${empresa}, descricao=${descricao}, parcela=${parcelaNum}, juros=${jurosNum}`);
      return { perc: 0, ativoUsado: null };
    }

    const percPagoVal = (tabelaMatch as any)[ativoCol];
    if (!percPagoVal) return { perc: 0, ativoUsado: null };

    const perc = parseFloat(String(percPagoVal));
    // Nome do ativo: ex. ativo01 → Ativo01
    const ativoNome = `Ativo${String(nivelNum).padStart(2, '0')}`;
    return { perc: isNaN(perc) ? 0 : perc, ativoUsado: ativoNome };

  } catch (error) {
    console.error("[Database] Error calculating perc pago:", error);
    return { perc: 0, ativoUsado: null };
  }
}
