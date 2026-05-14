import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { eq, desc, like, or, and, sql } from "drizzle-orm";
import { crmClientes, crmOportunidades, crmAtendimentos, crmTarefas, crmMailing } from "../../drizzle/schema";
import { getDb } from "../db";
// ============================================================================
// CRM ROUTER
// ============================================================================

export const crmRouter = router({

  // --------------------------------------------------------------------------
  // CLIENTES
  // --------------------------------------------------------------------------
  clientes: router({
    listar: protectedProcedure
      .input(z.object({
        busca: z.string().optional(),
        convenio: z.string().optional(),
        chaveJAgente: z.string().optional(),
        pagina: z.number().default(1),
        porPagina: z.number().default(20),
      }))
      .query(async ({ input }) => {
        const offset = (input.pagina - 1) * input.porPagina;
        const conditions = [];
        if (input.busca) {
          conditions.push(
            or(
              like(crmClientes.nome, `%${input.busca}%`),
              like(crmClientes.cpf, `%${input.busca}%`),
              like(crmClientes.telefone, `%${input.busca}%`),
            )
          );
        }
        if (input.convenio) conditions.push(eq(crmClientes.convenio, input.convenio));
        if (input.chaveJAgente) conditions.push(eq(crmClientes.chaveJAgente, input.chaveJAgente));

        const where = conditions.length > 0 ? and(...conditions) : undefined;
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const [clientes, totalResult] = await Promise.all([
          db.select().from(crmClientes).where(where).orderBy(desc(crmClientes.createdAt)).limit(input.porPagina).offset(offset),
          db.select({ count: sql<number>`count(*)` }).from(crmClientes).where(where),
        ]);
        return { clientes, total: Number(totalResult[0]?.count ?? 0) };
      }),

    obter: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const [cliente] = await db.select().from(crmClientes).where(eq(crmClientes.id, input.id));
        return cliente ?? null;
      }),

    criar: protectedProcedure
      .input(z.object({
        nome: z.string().min(2),
        cpf: z.string().optional(),
        dataNascimento: z.string().optional(),
        telefone: z.string().optional(),
        telefone2: z.string().optional(),
        email: z.string().optional(),
        endereco: z.string().optional(),
        cidade: z.string().optional(),
        uf: z.string().max(2).optional(),
        convenio: z.string().optional(),
        matricula: z.string().optional(),
        margemDisponivel: z.string().optional(),
        beneficio: z.string().optional(),
        banco: z.string().optional(),
        agencia: z.string().optional(),
        conta: z.string().optional(),
        agenteResponsavel: z.string().optional(),
        chaveJAgente: z.string().optional(),
        origem: z.string().optional(),
        observacoes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const result = await db.insert(crmClientes).values({
          ...input,
          margemDisponivel: input.margemDisponivel ? input.margemDisponivel as any : null,
        });
        return { id: (result as any).insertId };
      }),

    atualizar: protectedProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().min(2).optional(),
        cpf: z.string().optional(),
        dataNascimento: z.string().optional(),
        telefone: z.string().optional(),
        telefone2: z.string().optional(),
        email: z.string().optional(),
        endereco: z.string().optional(),
        cidade: z.string().optional(),
        uf: z.string().max(2).optional(),
        convenio: z.string().optional(),
        matricula: z.string().optional(),
        margemDisponivel: z.string().optional(),
        beneficio: z.string().optional(),
        banco: z.string().optional(),
        agencia: z.string().optional(),
        conta: z.string().optional(),
        agenteResponsavel: z.string().optional(),
        chaveJAgente: z.string().optional(),
        origem: z.string().optional(),
        observacoes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { id, ...data } = input;
        await db.update(crmClientes).set(data as any).where(eq(crmClientes.id, id));
        return { success: true };
      }),

    excluir: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.delete(crmClientes).where(eq(crmClientes.id, input.id));
        return { success: true };
      }),
  }),

  // --------------------------------------------------------------------------
  // OPORTUNIDADES
  // --------------------------------------------------------------------------
  oportunidades: router({
    listar: protectedProcedure
      .input(z.object({
        busca: z.string().optional(),
        status: z.string().optional(),
        chaveJAgente: z.string().optional(),
        pagina: z.number().default(1),
        porPagina: z.number().default(50),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const conditions = [];
        if (input.busca) conditions.push(like(crmOportunidades.clienteNome, `%${input.busca}%`));
        if (input.status) conditions.push(eq(crmOportunidades.status, input.status as any));
        if (input.chaveJAgente) conditions.push(eq(crmOportunidades.chaveJAgente, input.chaveJAgente));
        const where = conditions.length > 0 ? and(...conditions) : undefined;
        return db.select().from(crmOportunidades).where(where).orderBy(desc(crmOportunidades.createdAt)).limit(input.porPagina).offset((input.pagina - 1) * input.porPagina);
      }),

    criar: protectedProcedure
      .input(z.object({
        clienteId: z.number().optional(),
        clienteNome: z.string().min(2),
        produto: z.string().optional(),
        valorEstimado: z.string().optional(),
        status: z.enum(["novo","em_contato","proposta_enviada","aprovado","fechado","perdido"]).default("novo"),
        motivoPerda: z.string().optional(),
        agenteResponsavel: z.string().optional(),
        chaveJAgente: z.string().optional(),
        previsaoFechamento: z.string().optional(),
        observacoes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const result = await db.insert(crmOportunidades).values(input as any);
        return { id: (result as any).insertId };
      }),

    atualizar: protectedProcedure
      .input(z.object({
        id: z.number(),
        clienteNome: z.string().optional(),
        produto: z.string().optional(),
        valorEstimado: z.string().optional(),
        status: z.enum(["novo","em_contato","proposta_enviada","aprovado","fechado","perdido"]).optional(),
        motivoPerda: z.string().optional(),
        agenteResponsavel: z.string().optional(),
        chaveJAgente: z.string().optional(),
        previsaoFechamento: z.string().optional(),
        observacoes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { id, ...data } = input;
        await db.update(crmOportunidades).set(data as any).where(eq(crmOportunidades.id, id));
        return { success: true };
      }),

    excluir: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.delete(crmOportunidades).where(eq(crmOportunidades.id, input.id));
        return { success: true };
      }),
  }),

  // --------------------------------------------------------------------------
  // ATENDIMENTOS
  // --------------------------------------------------------------------------
  atendimentos: router({
    listar: protectedProcedure
      .input(z.object({
        clienteId: z.number().optional(),
        chaveJAgente: z.string().optional(),
        pagina: z.number().default(1),
        porPagina: z.number().default(20),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const conditions = [];
        if (input.clienteId) conditions.push(eq(crmAtendimentos.clienteId, input.clienteId));
        if (input.chaveJAgente) conditions.push(eq(crmAtendimentos.chaveJAgente, input.chaveJAgente));
        const where = conditions.length > 0 ? and(...conditions) : undefined;
        return db.select().from(crmAtendimentos).where(where).orderBy(desc(crmAtendimentos.dataAtendimento)).limit(input.porPagina).offset((input.pagina - 1) * input.porPagina);
      }),

    criar: protectedProcedure
      .input(z.object({
        clienteId: z.number().optional(),
        clienteNome: z.string().min(2),
        oportunidadeId: z.number().optional(),
        canal: z.enum(["telefone","whatsapp","presencial","email","outro"]).default("telefone"),
        assunto: z.string().optional(),
        descricao: z.string().optional(),
        resultado: z.enum(["contato_realizado","sem_resposta","retornar","proposta_aceita","proposta_recusada","encerrado"]).default("contato_realizado"),
        proximoPasso: z.string().optional(),
        dataAtendimento: z.string().optional(),
        agenteResponsavel: z.string().optional(),
        chaveJAgente: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const result = await db.insert(crmAtendimentos).values(input as any);
        return { id: (result as any).insertId };
      }),

    excluir: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.delete(crmAtendimentos).where(eq(crmAtendimentos.id, input.id));
        return { success: true };
      }),
  }),

  // --------------------------------------------------------------------------
  // TAREFAS
  // --------------------------------------------------------------------------
  tarefas: router({
    listar: protectedProcedure
      .input(z.object({
        status: z.string().optional(),
        chaveJAgente: z.string().optional(),
        pagina: z.number().default(1),
        porPagina: z.number().default(30),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const conditions = [];
        if (input.status) conditions.push(eq(crmTarefas.status, input.status as any));
        if (input.chaveJAgente) conditions.push(eq(crmTarefas.chaveJAgente, input.chaveJAgente));
        const where = conditions.length > 0 ? and(...conditions) : undefined;
        return db.select().from(crmTarefas).where(where).orderBy(crmTarefas.dataVencimento).limit(input.porPagina).offset((input.pagina - 1) * input.porPagina);
      }),

    criar: protectedProcedure
      .input(z.object({
        clienteId: z.number().optional(),
        clienteNome: z.string().optional(),
        oportunidadeId: z.number().optional(),
        titulo: z.string().min(2),
        descricao: z.string().optional(),
        tipo: z.enum(["ligar","whatsapp","email","visita","enviar_proposta","outro"]).default("ligar"),
        prioridade: z.enum(["baixa","media","alta"]).default("media"),
        dataVencimento: z.string().optional(),
        agenteResponsavel: z.string().optional(),
        chaveJAgente: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const result = await db.insert(crmTarefas).values(input as any);
        return { id: (result as any).insertId };
      }),

    atualizar: protectedProcedure
      .input(z.object({
        id: z.number(),
        titulo: z.string().optional(),
        descricao: z.string().optional(),
        tipo: z.enum(["ligar","whatsapp","email","visita","enviar_proposta","outro"]).optional(),
        prioridade: z.enum(["baixa","media","alta"]).optional(),
        status: z.enum(["pendente","em_andamento","concluida","cancelada"]).optional(),
        dataVencimento: z.string().optional(),
        dataConclusao: z.string().optional(),
        agenteResponsavel: z.string().optional(),
        chaveJAgente: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { id, ...data } = input;
        await db.update(crmTarefas).set(data as any).where(eq(crmTarefas.id, id));
        return { success: true };
      }),

    excluir: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.delete(crmTarefas).where(eq(crmTarefas.id, input.id));
        return { success: true };
      }),
  }),

  // --------------------------------------------------------------------------
  // MAILING
  // --------------------------------------------------------------------------
  mailing: router({
    listarListas: protectedProcedure
      .query(async () => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const result = await db.select({
          listaId: crmMailing.listaId,
          listaNome: crmMailing.listaNome,
          total: sql<number>`count(*)`,
          naoContatados: sql<number>`sum(case when status = 'nao_contatado' then 1 else 0 end)`,
          convertidos: sql<number>`sum(case when status = 'convertido' then 1 else 0 end)`,
        }).from(crmMailing).groupBy(crmMailing.listaId, crmMailing.listaNome).orderBy(desc(sql`max(${crmMailing.createdAt})`));
        return result;
      }),

    listarContatos: protectedProcedure
      .input(z.object({
        listaId: z.string(),
        status: z.string().optional(),
        busca: z.string().optional(),
        chaveJAgente: z.string().optional(),
        pagina: z.number().default(1),
        porPagina: z.number().default(30),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const conditions = [eq(crmMailing.listaId, input.listaId)];
        if (input.status) conditions.push(eq(crmMailing.status, input.status as any));
        if (input.chaveJAgente) conditions.push(eq(crmMailing.chaveJAgente, input.chaveJAgente));
        if (input.busca) { const b = input.busca; conditions.push(or(like(crmMailing.nome, `%${b}%`), like(crmMailing.cpf, `%${b}%`), like(crmMailing.telefone, `%${b}%`))!); }
        const where = and(...conditions);
        const [contatos, totalResult] = await Promise.all([
          db.select().from(crmMailing).where(where).orderBy(crmMailing.nome).limit(input.porPagina).offset((input.pagina - 1) * input.porPagina),
          db.select({ count: sql<number>`count(*)` }).from(crmMailing).where(where),
        ]);
        return { contatos, total: Number(totalResult[0]?.count ?? 0) };
      }),

    importar: protectedProcedure
      .input(z.object({
        listaNome: z.string().min(2),
        contatos: z.array(z.object({
          nome: z.string(),
          cpf: z.string().optional(),
          telefone: z.string().optional(),
          telefone2: z.string().optional(),
          convenio: z.string().optional(),
          beneficio: z.string().optional(),
          margemDisponivel: z.string().optional(),
        })),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const listaId = crypto.randomUUID();
        const rows = input.contatos.map(c => ({
          listaId,
          listaNome: input.listaNome,
          nome: c.nome,
          cpf: c.cpf,
          telefone: c.telefone,
          telefone2: c.telefone2,
          convenio: c.convenio,
          beneficio: c.beneficio,
          margemDisponivel: c.margemDisponivel as any,
        }));
        // Inserir em lotes de 100
        for (let i = 0; i < rows.length; i += 100) {
          await db.insert(crmMailing).values(rows.slice(i, i + 100) as any);
        }
        return { listaId, total: rows.length };
      }),

    atualizarStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["nao_contatado","em_contato","convertido","sem_interesse","invalido"]),
        agenteResponsavel: z.string().optional(),
        chaveJAgente: z.string().optional(),
        observacoes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { id, ...data } = input;
        await db.update(crmMailing).set({ ...data, dataContato: new Date() } as any).where(eq(crmMailing.id, id));
        return { success: true };
      }),

    excluirLista: protectedProcedure
      .input(z.object({ listaId: z.string() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.delete(crmMailing).where(eq(crmMailing.listaId, input.listaId));
        return { success: true };
      }),
  }),

  // --------------------------------------------------------------------------
  // RELATÓRIOS
  // --------------------------------------------------------------------------
  relatorios: router({
    funil: protectedProcedure
      .query(async () => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const result = await db.select({
          status: crmOportunidades.status,
          total: sql<number>`count(*)`,
          valorTotal: sql<number>`sum(valorEstimado)`,
        }).from(crmOportunidades).groupBy(crmOportunidades.status);
        return result;
      }),

    produtividadeAgentes: protectedProcedure
      .query(async () => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const [oportunidades, atendimentos, tarefas] = await Promise.all([
          db.select({
            agente: crmOportunidades.agenteResponsavel,
            chaveJ: crmOportunidades.chaveJAgente,
            total: sql<number>`count(*)`,
            fechados: sql<number>`sum(case when status = 'fechado' then 1 else 0 end)`,
          }).from(crmOportunidades).groupBy(crmOportunidades.agenteResponsavel, crmOportunidades.chaveJAgente),
          db.select({
            agente: crmAtendimentos.agenteResponsavel,
            chaveJ: crmAtendimentos.chaveJAgente,
            total: sql<number>`count(*)`,
          }).from(crmAtendimentos).groupBy(crmAtendimentos.agenteResponsavel, crmAtendimentos.chaveJAgente),
          db.select({
            agente: crmTarefas.agenteResponsavel,
            chaveJ: crmTarefas.chaveJAgente,
            concluidas: sql<number>`sum(case when status = 'concluida' then 1 else 0 end)`,
            pendentes: sql<number>`sum(case when status = 'pendente' then 1 else 0 end)`,
          }).from(crmTarefas).groupBy(crmTarefas.agenteResponsavel, crmTarefas.chaveJAgente),
        ]);
        return { oportunidades, atendimentos, tarefas };
      }),

    resumo: protectedProcedure
      .query(async () => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const [totalClientes, totalOportunidades, tarefasPendentes, mailingStats] = await Promise.all([
          db.select({ count: sql<number>`count(*)` }).from(crmClientes),
          db.select({ count: sql<number>`count(*)` }).from(crmOportunidades).where(or(eq(crmOportunidades.status, "novo"), eq(crmOportunidades.status, "em_contato"), eq(crmOportunidades.status, "proposta_enviada"))),
          db.select({ count: sql<number>`count(*)` }).from(crmTarefas).where(or(eq(crmTarefas.status, "pendente"), eq(crmTarefas.status, "em_andamento"))),
          db.select({ count: sql<number>`count(*)` }).from(crmMailing).where(eq(crmMailing.status, "nao_contatado")),
        ]);
        return {
          totalClientes: Number(totalClientes[0]?.count ?? 0),
          oportunidadesAtivas: Number(totalOportunidades[0]?.count ?? 0),
          tarefasPendentes: Number(tarefasPendentes[0]?.count ?? 0),
          mailingNaoContatado: Number(mailingStats[0]?.count ?? 0),
        };
      }),
  }),
});
