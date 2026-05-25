import { eq, like, and, asc, desc, isNotNull, sql } from "drizzle-orm";
import { z } from "zod";
import { agentes, certificacoes } from "../../drizzle/schema";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";

// Schema de validação para Agente
const agenteSchema = z.object({
  numCadastro: z.string().optional(),
  empresa: z.string().optional(),
  chaveJ: z.string().optional(),
  senha: z.string().optional(),
  nomeAgente: z.string().min(1, "Nome do agente é obrigatório"),
  dataAdmissao: z.string().optional(),
  cargo: z.string().optional(),
  area: z.string().optional(),
  vinculo: z.string().optional(),
  situacao: z.string().optional(),
  nrAgencia: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().optional(),
  supervisor: z.string().optional(),
  email: z.string().email().optional(),
  favorecido: z.string().optional(),
  favProprio: z.boolean().optional(),
  banco: z.string().optional(),
  agencia: z.string().optional(),
  conta: z.string().optional(),
  tipo: z.string().optional(),
  cpfAgente: z.string().optional(),
  pix: z.string().optional(),
  dataNascimento: z.string().optional(),
  celular: z.string().optional(),
  permissoes: z.string().optional(),
  permissoesModulos: z.string().optional(), // JSON string com permissoes por sub-aba
});

const agenteUpdateSchema = agenteSchema.partial();

// Função para gerar número de cadastro sequencial (0001/2026, 0002/2026, etc)
async function generateNumCadastro(db: any): Promise<string> {
  const currentYear = new Date().getFullYear();
  const result = await db
    .select({ numCadastro: agentes.numCadastro })
    .from(agentes)
    .where(like(agentes.numCadastro, `%/${currentYear}`))
    .orderBy(desc(agentes.id))
    .limit(1);

  let nextNumber = 1;
  if (result.length > 0 && result[0].numCadastro) {
    const lastNum = parseInt(result[0].numCadastro.split('/')[0]);
    nextNumber = lastNum + 1;
  }

  return `${String(nextNumber).padStart(4, '0')}/${currentYear}`;
}

export const agentesRouter = router({
  // Listar todos os agentes com filtros
  list: protectedProcedure
    .input(
      z.object({
        empresa: z.string().optional(),
        situacao: z.string().optional(),
        cidade: z.string().optional(),
        search: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [];

      if (input.empresa) {
        conditions.push(eq(agentes.empresa, input.empresa));
      }
      if (input.situacao) {
        conditions.push(eq(agentes.situacao, input.situacao));
      }
      if (input.cidade) {
        conditions.push(eq(agentes.cidade, input.cidade));
      }
      if (input.search) {
        conditions.push(
          like(agentes.nomeAgente, `%${input.search}%`)
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const result = await db
        .select()
        .from(agentes)
        .where(whereClause)
        .orderBy(asc(agentes.nomeAgente))
        .limit(input.limit)
        .offset(input.offset);

      return result;
    }),

  // Contar total de agentes
  count: protectedProcedure
    .input(
      z.object({
        empresa: z.string().optional(),
        situacao: z.string().optional(),
        cidade: z.string().optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [];

      if (input.empresa) {
        conditions.push(eq(agentes.empresa, input.empresa));
      }
      if (input.situacao) {
        conditions.push(eq(agentes.situacao, input.situacao));
      }
      if (input.cidade) {
        conditions.push(eq(agentes.cidade, input.cidade));
      }
      if (input.search) {
        conditions.push(
          like(agentes.nomeAgente, `%${input.search}%`)
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const result = await db
        .select({ count: agentes.id })
        .from(agentes)
        .where(whereClause);

      return result.length;
    }),

  // Obter agente por ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db
        .select()
        .from(agentes)
        .where(eq(agentes.id, input.id))
        .limit(1);

      return result.length > 0 ? result[0] : null;
    }),

  // Obter agente por email (case-insensitive)
  getByEmail: protectedProcedure
    .input(z.object({ email: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const emailLower = input.email.toLowerCase().trim();
      const result = await db
        .select()
        .from(agentes)
        .where(sql`LOWER(TRIM(${agentes.email})) = ${emailLower}`)
        .limit(1);
      return result.length > 0 ? result[0] : null;
    }),

  // Obter agente por ChaveJ (case-insensitive)
  getByChaveJ: protectedProcedure
    .input(z.object({ chaveJ: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const chaveJUpper = input.chaveJ.toUpperCase().trim();
      // Busca case-insensitive: compara UPPER(TRIM(chaveJ)) com o valor em maiúsculas
      const result = await db
        .select()
        .from(agentes)
        .where(sql`UPPER(TRIM(${agentes.chaveJ})) = ${chaveJUpper}`)
        .limit(1);

      return result.length > 0 ? result[0] : null;
    }),

  // Criar novo agente
  create: protectedProcedure
    .input(agenteSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Gerar número de cadastro automaticamente se não fornecido
      const numCadastro = input.numCadastro || (await generateNumCadastro(db));

      const dataToInsert: any = { ...input, numCadastro };
      // Manter datas como string YYYY-MM-DD (sem conversão)
      
      const result = await db.insert(agentes).values(dataToInsert as any);

      // Buscar o agente criado para retornar com ID
      const created = await db
        .select()
        .from(agentes)
        .where(input.chaveJ ? eq(agentes.chaveJ, input.chaveJ) : isNotNull(agentes.id))
        .limit(1);

      return created.length > 0 ? created[0] : null;
    }),

  // Atualizar agente
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: agenteUpdateSchema,
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const updateData: Record<string, unknown> = { ...input.data };

      // Manter datas como string (YYYY-MM-DD) sem conversão para evitar fuso horário

      await db
        .update(agentes)
        .set(updateData)
        .where(eq(agentes.id, input.id));

      return { success: true };
    }),

  // Deletar agente
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.delete(agentes).where(eq(agentes.id, input.id));

      return { success: true };
    }),

  // Buscar por CPF
  getByCpf: protectedProcedure
    .input(z.object({ cpf: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db
        .select()
        .from(agentes)
        .where(eq(agentes.cpfAgente, input.cpf))
        .limit(1);

      return result.length > 0 ? result[0] : null;
    }),

  // Listar empresas únicas
  getEmpresas: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

      const result = await db
        .selectDistinct({ empresa: agentes.empresa })
        .from(agentes)
        .where(isNotNull(agentes.empresa));

      return result.map(r => r.empresa).filter(Boolean);
  }),

  // Listar cidades únicas
  getCidades: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

      const result = await db
        .selectDistinct({ cidade: agentes.cidade })
        .from(agentes)
        .where(isNotNull(agentes.cidade));

      return result.map(r => r.cidade).filter(Boolean);
  }),

  // Listar supervisores únicos
  getSupervisores: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

      const result = await db
        .selectDistinct({ supervisor: agentes.supervisor })
        .from(agentes)
        .where(isNotNull(agentes.supervisor));

      return result.map(r => r.supervisor).filter(Boolean);
  }),

  // Detectar e listar duplicatas por Nome + CPF
  listarDuplicatas: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const todos = await db.select().from(agentes);
    // Agrupar por nome normalizado + CPF normalizado
    const grupos: Record<string, typeof todos> = {};
    for (const a of todos) {
      const nome = (a.nomeAgente ?? '').trim().toUpperCase();
      const cpf = (a.cpfAgente ?? '').replace(/\D/g, '');
      if (!nome || !cpf) continue;
      const chave = `${nome}||${cpf}`;
      if (!grupos[chave]) grupos[chave] = [];
      grupos[chave].push(a);
    }
    // Retornar apenas grupos com mais de 1 registro
    return Object.values(grupos).filter(g => g.length > 1);
  }),

  // Sincronizar campos pessoais entre duplicatas (mesmo Nome): preenche campos vazios
  // em cada registro com dados do outro, sem excluir nenhum
  sincronizarDuplicatas: protectedProcedure
    .input(z.object({ ids: z.array(z.number()) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (input.ids.length < 2) throw new Error("Informe ao menos 2 IDs para sincronizar");

      // Buscar todos os registros
      const registros: any[] = [];
      for (const id of input.ids) {
        const r = await db.select().from(agentes).where(eq(agentes.id, id)).limit(1);
        if (r.length > 0) registros.push(r[0]);
      }
      if (registros.length < 2) throw new Error("Registros não encontrados");

      // Campos pessoais que devem ser sincronizados entre registros do mesmo agente
      const camposPessoais = [
        'cpfAgente','email','celular','banco','agencia','conta','pix',
        'dataNascimento','favorecido','tipo'
      ];

      // Construir o conjunto de valores mais completo para campos pessoais
      const valoresMesclados: Record<string, any> = {};
      for (const campo of camposPessoais) {
        for (const reg of registros) {
          if (!valoresMesclados[campo] && reg[campo] && reg[campo] !== '') {
            valoresMesclados[campo] = reg[campo];
          }
        }
      }

      // Atualizar cada registro com os campos pessoais mesclados (somente onde está vazio)
      const atualizados: number[] = [];
      for (const reg of registros) {
        const updates: Record<string, any> = {};
        for (const campo of camposPessoais) {
          if (valoresMesclados[campo] && (!reg[campo] || reg[campo] === '')) {
            updates[campo] = valoresMesclados[campo];
          }
        }
        if (Object.keys(updates).length > 0) {
          await db.update(agentes).set(updates).where(eq(agentes.id, reg.id));
          atualizados.push(reg.id);
        }
      }

      return { sincronizados: input.ids, atualizados, valoresMesclados };
    }),

  // Status de certificação para todos os agentes (coluna Certificação na tabela de Agentes)
  statusCertificacoes: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const certs = await db.select({
      chaveJ: certificacoes.chaveJ,
      ventoCertif: certificacoes.ventoCertif,
      ventoCertif3: certificacoes.ventoCertif3,
    }).from(certificacoes);

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    function parseData(val: string | null | undefined): Date | null {
      if (!val) return null;
      const us = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
      if (us) {
        let yyyy = us[3];
        if (yyyy.length === 2) yyyy = parseInt(yyyy) >= 50 ? `19${yyyy}` : `20${yyyy}`;
        const d = new Date(`${yyyy}-${us[1].padStart(2,'0')}-${us[2].padStart(2,'0')}`);
        return isNaN(d.getTime()) ? null : d;
      }
      const iso = val.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (iso) { const d = new Date(val); return isNaN(d.getTime()) ? null : d; }
      return null;
    }

    function calcDias(vencto: string | null | undefined): number | null {
      const d = parseData(vencto);
      if (!d) return null;
      return Math.floor((d.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    }

    type CertStatus = { status: string; dias: number | null };
    function toStatus(dias: number | null): CertStatus {
      if (dias === null) return { status: 'SEM_CERTIFICACAO', dias: null };
      if (dias <= 0) return { status: 'VENCIDO', dias };
      if (dias <= 15) return { status: 'CRITICO', dias };
      return { status: 'A_VENCER', dias };
    }
    const map: Record<string, { consig: CertStatus; lgpd: CertStatus }> = {};
    for (const c of certs) {
      if (!c.chaveJ || c.chaveJ === 'chaveJ') continue;
      const dias1 = calcDias(c.ventoCertif);
      const dias2 = calcDias(c.ventoCertif3);
      map[c.chaveJ.trim().toUpperCase()] = { consig: toStatus(dias1), lgpd: toStatus(dias2) };
    }
    return map;
  }),

  // Listar agentes com suas permissões (para gestão em massa)
  listComPermissoes: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const result = await db
      .select({
        id: agentes.id,
        nomeAgente: agentes.nomeAgente,
        chaveJ: agentes.chaveJ,
        empresa: agentes.empresa,
        cargo: agentes.cargo,
        situacao: agentes.situacao,
        permissoes: agentes.permissoes,
        permissoesModulos: agentes.permissoesModulos,
      })
      .from(agentes)
      .orderBy(asc(agentes.nomeAgente));
    return result;
  }),

  // Aplicar template de permissões em massa por cargo
  aplicarTemplatePermissoes: protectedProcedure
    .input(z.object({
      cargo: z.string(), // cargo alvo (ex: 'Promotor')
      permissoes: z.string(), // nível geral (ex: 'leitor')
      permissoesModulos: z.string(), // JSON string com o template de módulos
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      // Buscar todos os agentes com esse cargo
      const alvos = await db
        .select({ id: agentes.id })
        .from(agentes)
        .where(eq(agentes.cargo, input.cargo));
      if (alvos.length === 0) return { atualizados: 0 };
      // Atualizar permissões de todos
      for (const a of alvos) {
        await db.update(agentes)
          .set({ permissoes: input.permissoes, permissoesModulos: input.permissoesModulos })
          .where(eq(agentes.id, a.id));
      }
      return { atualizados: alvos.length };
    }),

  // Atualizar permissões de um agente individual (inline)
  atualizarPermissoes: protectedProcedure
    .input(z.object({
      id: z.number(),
      permissoes: z.string(),
      permissoesModulos: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(agentes)
        .set({ permissoes: input.permissoes, permissoesModulos: input.permissoesModulos })
        .where(eq(agentes.id, input.id));
      return { success: true };
    }),

  // Autocomplete: buscar agentes por nome parcial (retorna nome + chaveJ)
  autocomplete: protectedProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const result = await db
        .select({ nomeAgente: agentes.nomeAgente, chaveJ: agentes.chaveJ })
        .from(agentes)
        .where(like(agentes.nomeAgente, `%${input.query}%`))
        .orderBy(asc(agentes.nomeAgente))
        .limit(10);
      return result;
    }),

  // Listar cargos únicos (para o seletor de template)
  getCargos: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const result = await db
      .selectDistinct({ cargo: agentes.cargo })
      .from(agentes)
      .where(isNotNull(agentes.cargo));
    return result.map(r => r.cargo).filter(Boolean);
  }),
});
