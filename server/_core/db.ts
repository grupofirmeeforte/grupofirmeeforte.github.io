import { eq, and, lt, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, agentes, loginAttempts, auditoria, sessoes, InsertSessao, mensagens, InsertMensagem, Mensagem, valoresCalculo, ValoresCalculo, consignados, tabelasComissao } from "../drizzle/schema";
import { ENV } from "./env";
import { or } from "drizzle-orm";

let _db: ReturnType<typeof drizzle> | null = null;
let connecting = false;

// ✅ CORREÇÃO: Reconecta sozinho se o banco cair
export async function getDb() {
  if (_db) return _db;

  if (connecting) {
    await new Promise(r => setTimeout(r, 200));
    return getDb();
  }

  if (process.env.DATABASE_URL) {
    connecting = true;
    let tentativas = 0;

    while (tentativas < 3) {
      try {
        _db = drizzle(process.env.DATABASE_URL);
        await _db.execute(sql`SELECT 1`);
        console.log("[Database] Conectado com sucesso!");
        connecting = false;
        return _db;
      } catch (error) {
        tentativas++;
        console.error(`[Database] Tentativa ${tentativas} falhou:`, error);
        _db = null;
        if (tentativas < 3) {
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    }
    connecting = false;
    console.error("[Database] Não conseguiu conectar após 3 tentativas");
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

export async function getAllBlockedAttempts() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(loginAttempts).where(eq(loginAttempts.isBlocked, true));
}

export async function getLoginAttemptsHistory(chaveJ: string) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(loginAttempts).where(eq(loginAttempts.chaveJ, chaveJ));
}

export async function createSessao(data: any) {
  const db = await getDb();
  if (!db) return undefined;

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

export async function criarMensagem(data: InsertMensagem) {
  const db = await getDb();
  if (!db) return undefined;

  const agora = new Date();
  const agoraStr = agora.toISOString().slice(0, 19).replace('T', ' ');
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
      'ativo11', 'ativo11De', 'ativo11Ate',
      'ativo12', 'ativo12De', 'ativo12Ate',
      'ativo13', 'ativo13De', 'ativo13Ate',
      'ativo14', 'ativo14De', 'ativo14Ate',
      'ativo15', 'ativo15De', 'ativo15Ate',
      'ativo16', 'ativo16De', 'ativo16Ate',
      'ativo17', 'ativo17De', 'ativo17Ate',
      'ativo18', 'ativo18De', 'ativo18Ate',
      'ativo19', 'ativo19De', 'ativo19Ate',
      'ativo20', 'ativo20De', 'ativo20Ate',
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
  mes?: string
): Promise<{ perc: number; ativoUsado: string | null }> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot calculate perc pago: database not available");
    return { perc: 0, ativoUsado: null };
  }

  try {
    if (mes) {
      const [mesNum, anoNum] = mes.split('/').map(Number);
      const mesAno = anoNum * 100 + mesNum;
      if (mesAno < 202605) return { perc: 0, ativoUsado: null };
    }

    if (!rbm || rbm === 0) return { perc: 0, ativoUsado: null };

    const norm = (s: string) =>
      (s || '').toUpperCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const toPerc = (v: string | number | null | undefined): number => {
      if (v === null || v === undefined || v === '') return 0;
      const s = String(v).trim().toLowerCase();
      if (s === 'acima') return 99999;
      const n = parseFloat(s.replace(',', '.')) || 0;
      return n <= 1 && n > 0 ? n * 100 : n;
    };

    let nivelNum: number | null = null;

    const nivelMatch = situacao.trim().match(/^Ativo\s*(\d{1,2})$/i);
    if (nivelMatch) {
      nivelNum = parseInt(nivelMatch[1]);
    }

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

        let somaLiq = 0;
        for (const c of lista) {
          const srcc = norm(c.restricaoSRCC || '');
          if (srcc !== 'SIM' && srcc !== 'S') {
            somaLiq += Number(c.valorLiquido) || 0;
          }
        }

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
          { num: 11, de: Number((valores as any).ativo11De) || 0, ate: Number((valores as any).ativo11Ate) || 0 },
          { num: 12, de: Number((valores as any).ativo12De) || 0, ate: Number((valores as any).ativo12Ate) || 0 },
          { num: 13, de: Number((valores as any).ativo13De) || 0, ate: Number((valores as any).ativo13Ate) || 0 },
          { num: 14, de: Number((valores as any).ativo14De) || 0, ate: Number((valores as any).ativo14Ate) || 0 },
          { num: 15, de: Number((valores as any).ativo15De) || 0, ate: Number((valores as any).ativo15Ate) || 0 },
          { num: 16, de: Number((valores as any).ativo16De) || 0, ate: Number((valores as any).ativo16Ate) || 0 },
          { num: 17, de: Number((valores as any).ativo17De) || 0, ate: Number((valores as any).ativo17Ate) || 0 },
          { num: 18, de: Number((valores as any).ativo18De) || 0, ate: Number((valores as any).ativo18Ate) || 0 },
          { num: 19, de: Number((valores as any).ativo19De) || 0, ate: Number((valores as any).ativo19Ate) || 0 },
          { num: 20, de: Number((valores as any).ativo20De) || 0, ate: Number((valores as any).ativo20Ate) || 0 },
        ];

        for (const f of faixas) {
          if (f.ate > 0 && somaLiq >= f.de && somaLiq <= f.ate) {
            nivelNum = f.num;
            break;
          }
        }
        if (!nivelNum) nivelNum = 20;
      }
    }

    if (!nivelNum) nivelNum = 1;
    const ativoCol = `ativo${String(nivelNum).padStart(2, '0')}`;

    const parcelaNum = typeof parcela === 'string' ? parseInt(parcela) || 0 : (parcela || 0);
    const jurosPerc = toPerc(juros);

    const todasLinhas = await db.select().from(tabelasComissao);

    const linhasEmpresa = todasLinhas.filter(t => {
      if (!t.empresa) return true;
      const partes = t.empresa.split(/[\/,]/).map((p: string) => norm(p)).filter((p: string) => p.length > 0);
      const agNorm = norm(empresa);
      return partes.some((p: string) => agNorm === p || agNorm.includes(p) || p.includes(agNorm));
    });

    const linhasConvenio = linhasEmpresa.filter(t => {
      if (!t.convenio) return false;
      const descNorm = norm(descricao || '');
      const partes = t.convenio.split(/[\/,]/).map((p: string) => norm(p)).filter((p: string) => p.length > 0);
      return partes.some((p: string) => descNorm.includes(p) || p.includes(descNorm));
    });

    const linhasPrazo = linhasConvenio.filter((t: any) => {
      const mDe = parseInt(t.mesesDe || '0') || 0;
      const mAte = parseInt(t.mesesAte || '9999') || 9999;
      return parcelaNum >= mDe && parcelaNum <= mAte;
    });

    const linhasJuros = linhasPrazo.filter((t: any) => {
      const jDe = toPerc(t.txJurosDe);
      const jAte = toPerc(t.txJurosAte);
      return jurosPerc >= (jDe - 0.001) && jurosPerc <= (jAte + 0.001);
    });

    linhasJuros.sort((a, b) => toPerc(a.txJurosAte) - toPerc(b.txJurosAte));

    const tabelaMatch = linhasJuros[0] ?? linhasPrazo[0] ?? linhasConvenio[0] ?? null;

    if (!tabelaMatch) {
      console.warn(`[calcularPercPago] Linha não encontrada: empresa=${empresa}, convenio=${descricao}, parcela=${parcelaNum}, juros=${jurosPerc}%`);
      return { perc: 0, ativoUsado: null };
    }

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
