import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, adminProcedure } from "./_core/trpc";
import { agentesRouter } from "./routers/agentes";
import { auditoriaRouter } from "./routers/auditoria";
import { z } from "zod";
import { getAgenteByChaveJ, getLoginAttempts, incrementLoginAttempts, resetLoginAttempts, createAuditLog, unlockLoginAttempts, getAllBlockedAttempts, getLoginAttemptsHistory, upsertUser, createSessao, getSessaoByChaveJ, getTodasSessoesAtivas, updateSessaoUltimoAcesso, encerrarSessao, criarMensagem, obterMensagensPrivadas, obterMensagensNaoLidas, marcarMensagensComoLidas, getDb, obterValoresCalculo, atualizarValoresCalculo, calcularPercPago } from "./db";
import { users, agentes } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { sdk } from "./_core/sdk";
import { TRPCError } from "@trpc/server";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    loginCustom: publicProcedure
      .input(z.object({
        chaveJ: z.string().min(1, "ChaveJ é obrigatório"),
        senha: z.string().min(1, "Senha é obrigatória"),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verificar se está bloqueado
        const loginAttempt = await getLoginAttempts(input.chaveJ);
        if (loginAttempt?.isBlocked) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Sistema bloqueado após 3 tentativas falhas. Contate o administrador.",
          });
        }
        
        // Buscar agente pelo ChaveJ
        const agente = await getAgenteByChaveJ(input.chaveJ);
        
        if (!agente) {
          await incrementLoginAttempts(input.chaveJ);
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "ChaveJ ou Senha inválidos",
          });
        }
        
        // Verificar senha
        if (agente.senha !== input.senha) {
          await incrementLoginAttempts(input.chaveJ);
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "ChaveJ ou Senha inválidos",
          });
        }
        
        // Reset tentativas após login bem-sucedido
        await resetLoginAttempts(input.chaveJ);
        
        // Gerar número de entrada único
        const numeroEntrada = `ENT-${Date.now()}-${agente.id}`;
        
        // Criar/atualizar usuário no banco de dados
        const openId = `agente_${agente.id}`;
        await upsertUser({
          openId,
          name: agente.nomeAgente || "",
          email: agente.email || null,
          loginMethod: "custom",
        });
        
        // Criar registro de auditoria
        await createAuditLog({
          agenteId: agente.id,
          chaveJ: agente.chaveJ,
          nomeAgente: agente.nomeAgente,
          numeroEntrada,
          modulo: "Login",
          acao: "Entrada",
          descricao: `Agente ${agente.nomeAgente} fez login no sistema`,
          ipAddress: (ctx.req as any).ip || (ctx.req.headers as any)['x-forwarded-for'] || 'unknown',
          userAgent: (ctx.req.headers as any)['user-agent'] || 'unknown',
        });
        
        // Criar token de sessão customizado
        const sessionToken = await sdk.signSession(
          {
            openId,
            appId: process.env.VITE_APP_ID || "app",
            name: agente.nomeAgente || "",
          },
          { expiresInMs: ONE_YEAR_MS }
        );
        
        // Registrar sessão ativa
        const ipAddress = ((ctx.req as any).ip || (ctx.req.headers as any)['x-forwarded-for'] || 'unknown') as string;
        const userAgent = ((ctx.req.headers as any)['user-agent'] || 'unknown') as string;
        const sessaoResult = await createSessao({
          agenteId: agente.id,
          chaveJ: agente.chaveJ,
          nomeAgente: agente.nomeAgente,
          ipAddress,
          userAgent,
        });
        
        // Definir cookie de sessão
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });
        
        // Adicionar ID da sessão ao cookie para validação
        if (sessaoResult && (sessaoResult as any).insertId) {
          ctx.res.cookie('sessionId', String((sessaoResult as any).insertId), {
            ...cookieOptions,
            maxAge: ONE_YEAR_MS,
          });
        }
        
        // Verificar se hoje é aniversário do agente
        const hoje = new Date();
        const diaHoje = hoje.getDate();
        const mesHoje = hoje.getMonth() + 1;
        let isAniversario = false;
        if (agente.dataNascimento) {
          const partes = agente.dataNascimento.split('-');
          const mesNasc = parseInt(partes[1], 10);
          const diaNasc = parseInt(partes[2], 10);
          isAniversario = diaNasc === diaHoje && mesNasc === mesHoje;
        }

        return {
          success: true,
          numeroEntrada,
          isAniversario,
          agente: {
            id: agente.id,
            chaveJ: agente.chaveJ,
            nome: agente.nomeAgente,
            dataNascimento: agente.dataNascimento,
          },
        };
      }),
    acceptLGPD: publicProcedure.mutation(async ({ ctx }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Usuário não autenticado",
        });
      }

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao conectar ao banco de dados",
        });
      }

      await db.update(users)
        .set({
          lgpdAceito: true,
          lgpdAceitoEm: new Date(),
        })
        .where(eq(users.id, ctx.user.id));

      return {
        success: true,
        message: "LGPD aceito com sucesso",
      };
    }),
  }),
  agentes: agentesRouter,
  auditoria: auditoriaRouter,
  sessoes: router({
    // Obter todas as sessões ativas
    getAtivas: publicProcedure.query(async () => {
      return await getTodasSessoesAtivas();
    }),
    
    // Criar sessão ao fazer login
    criar: publicProcedure
      .input(z.object({
        agenteId: z.number(),
        chaveJ: z.string(),
        nomeAgente: z.string(),
        ipAddress: z.string().optional(),
        userAgent: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await createSessao({
          agenteId: input.agenteId,
          chaveJ: input.chaveJ,
          nomeAgente: input.nomeAgente,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        });
      }),
    
    // Desconectar forçado (apenas admin)
    desconectarForcado: adminProcedure
      .input(z.object({
        sessaoId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await encerrarSessao(input.sessaoId);
        return { success: true };
      }),

    // Atualizar último acesso
    atualizarAcesso: publicProcedure
      .input(z.object({
        sessaoId: z.number(),
        modulo: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await updateSessaoUltimoAcesso(input.sessaoId, input.modulo);
      }),
  }),
  admin: router({
    // Desbloquear um agente bloqueado (apenas admin)
    unlockAgent: adminProcedure
      .input(z.object({
        chaveJ: z.string().min(1, "ChaveJ é obrigatório"),
      }))
      .mutation(async ({ input }) => {
        await unlockLoginAttempts(input.chaveJ);
        return { success: true, message: `Agente ${input.chaveJ} desbloqueado com sucesso` };
      }),
    
    // Obter todos os agentes bloqueados (apenas admin)
    getBlockedAgents: adminProcedure.query(async () => {
      return await getAllBlockedAttempts();
    }),
    
    // Obter histórico de tentativas de um agente (apenas admin)
    getAttemptHistory: adminProcedure
      .input(z.object({
        chaveJ: z.string().min(1, "ChaveJ é obrigatório"),
      }))
      .query(async ({ input }) => {
        return await getLoginAttemptsHistory(input.chaveJ);
      }),
    

    validateSession: publicProcedure.query(async ({ ctx }) => {
      if (!ctx.user) {
        return { isValid: false };
      }
      
      let chaveJ: string | null = null;
      if (ctx.user.email && ctx.user.email.includes('@')) {
        chaveJ = ctx.user.email.split('@')[0];
      }
      
      if (!chaveJ) {
        return { isValid: false };
      }
      
      const sessao = await getSessaoByChaveJ(chaveJ);
      return { isValid: sessao ? true : false };
    }),
   }),
  chat: router({
    // Enviar mensagem privada
    enviarMensagem: publicProcedure
      .input(z.object({
        remetenteId: z.number(),
        remetenteNome: z.string(),
        destinatarioId: z.number(),
        destinatarioNome: z.string(),
        conteudo: z.string().min(1, "Mensagem não pode estar vazia"),
      }))
      .mutation(async ({ input }) => {
        return await criarMensagem({
          remetenteId: input.remetenteId,
          remetenteNome: input.remetenteNome,
          destinatarioId: input.destinatarioId,
          destinatarioNome: input.destinatarioNome,
          conteudo: input.conteudo,
          tipo: "texto",
          lida: false,
        });
      }),
    
    // Obter mensagens privadas entre dois usuários
    obterMensagensPrivadas: publicProcedure
      .input(z.object({
        usuarioId: z.number(),
        outroUsuarioId: z.number(),
      }))
      .query(async ({ input }) => {
        return await obterMensagensPrivadas(input.usuarioId, input.outroUsuarioId);
      }),
    
    // Obter mensagens não lidas
    obterNaoLidas: publicProcedure
      .input(z.object({
        usuarioId: z.number(),
      }))
      .query(async ({ input }) => {
        return await obterMensagensNaoLidas(input.usuarioId);
      }),
    
    // Marcar mensagens como lidas
    marcarComoLidas: publicProcedure
      .input(z.object({
        usuarioId: z.number(),
        remetenteId: z.number(),
      }))
      .mutation(async ({ input }) => {
        return await marcarMensagensComoLidas(input.usuarioId, input.remetenteId);
      }),
  }),
  tabelaComissao: router({
    listar: publicProcedure
      .input(z.object({
        empresa: z.string().optional(),
        convenio: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const { tabelasComissao } = await import('../drizzle/schema');
        const { and, eq, like } = await import('drizzle-orm');
        let query = db.select().from(tabelasComissao);
        const conditions = [];
        if (input?.empresa) conditions.push(eq(tabelasComissao.empresa, input.empresa));
        if (input?.convenio) conditions.push(like(tabelasComissao.convenio, `%${input.convenio}%`));
        if (conditions.length > 0) {
          return await query.where(and(...conditions)).orderBy(tabelasComissao.empresa, tabelasComissao.convenio);
        }
        return await query.orderBy(tabelasComissao.empresa, tabelasComissao.convenio);
      }),

    criar: publicProcedure
      .input(z.object({
        empresa: z.string().optional(),
        faixa1: z.string().optional(), faixa2: z.string().optional(),
        faixa3: z.string().optional(), faixa4: z.string().optional(), faixa5: z.string().optional(),
        tabelaCalculo: z.string().optional(), referencia: z.string().optional(),
        convenio: z.string().optional(),
        txJurosDe: z.string().optional(), txJurosAte: z.string().optional(),
        valorMinimo: z.string().optional(),
        mesesDe: z.string().optional(), mesesAte: z.string().optional(),
        ativo01: z.string().optional(), ativo02: z.string().optional(),
        ativo03: z.string().optional(), ativo04: z.string().optional(),
        ativo05: z.string().optional(), ativo06: z.string().optional(),
        ativo07: z.string().optional(), ativo08: z.string().optional(),
        ativo09: z.string().optional(), ativo10: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB indisponível' });
        const { tabelasComissao } = await import('../drizzle/schema');
        return await db.insert(tabelasComissao).values(input);
      }),

    atualizar: publicProcedure
      .input(z.object({
        id: z.number(),
        empresa: z.string().optional(),
        faixa1: z.string().optional(), faixa2: z.string().optional(),
        faixa3: z.string().optional(), faixa4: z.string().optional(), faixa5: z.string().optional(),
        tabelaCalculo: z.string().optional(), referencia: z.string().optional(),
        convenio: z.string().optional(),
        txJurosDe: z.string().optional(), txJurosAte: z.string().optional(),
        valorMinimo: z.string().optional(),
        mesesDe: z.string().optional(), mesesAte: z.string().optional(),
        ativo01: z.string().optional(), ativo02: z.string().optional(),
        ativo03: z.string().optional(), ativo04: z.string().optional(),
        ativo05: z.string().optional(), ativo06: z.string().optional(),
        ativo07: z.string().optional(), ativo08: z.string().optional(),
        ativo09: z.string().optional(), ativo10: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB indisponível' });
        const { tabelasComissao } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const { id, ...data } = input;
        return await db.update(tabelasComissao).set(data).where(eq(tabelasComissao.id, id));
      }),

    excluir: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB indisponível' });
        const { tabelasComissao } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        return await db.delete(tabelasComissao).where(eq(tabelasComissao.id, input.id));
      }),

    listarEmpresas: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      const { tabelasComissao } = await import('../drizzle/schema');
      const rows = await db.selectDistinct({ empresa: tabelasComissao.empresa }).from(tabelasComissao).orderBy(tabelasComissao.empresa);
      return rows.map(r => r.empresa).filter(Boolean);
    }),
    listarConvenios: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      const { tabelasComissao } = await import('../drizzle/schema');
      const rows = await db.selectDistinct({ convenio: tabelasComissao.convenio }).from(tabelasComissao).orderBy(tabelasComissao.convenio);
      return rows.map(r => r.convenio).filter(Boolean);
    }),
  }),

  consignado: router({
    listar: publicProcedure
      .input(z.object({
        mes: z.string().optional(),
        empresa: z.string().optional(),
        chaveJ: z.string().optional(),
        convenio: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const { consignados } = await import('../drizzle/schema');
        const { eq, and, like } = await import('drizzle-orm');
        const conditions: any[] = [];
        if (input?.mes) conditions.push(eq(consignados.mes, input.mes));
        if (input?.empresa) conditions.push(eq(consignados.empresa, input.empresa));
        if (input?.chaveJ) conditions.push(like(consignados.chaveJ, `%${input.chaveJ}%`));
        if (input?.convenio) conditions.push(eq(consignados.convenio, input.convenio));
        const { desc } = await import('drizzle-orm');
        return conditions.length > 0
          ? await db.select().from(consignados).where(and(...conditions)).orderBy(desc(consignados.createdAt), consignados.mes, consignados.nomeAgente)
          : await db.select().from(consignados).orderBy(desc(consignados.createdAt), consignados.mes, consignados.nomeAgente);
      }),

    criar: publicProcedure
      .input(z.object({
        empresa: z.string().optional(), mes: z.string().optional(),
        chaveJ: z.string().optional(), nomeAgente: z.string().optional(),
        convenio: z.string().optional(), nrOperacao: z.string().optional(),
        valorBruto: z.string().optional(), valorLiquido: z.string().optional(),
        rbm: z.string().optional(), parcela: z.number().optional(),
        prefixoBB: z.string().optional(), dtContratacao: z.string().optional(),
        produto: z.string().optional(), descricaoProduto: z.string().optional(),
        juros: z.string().optional(), tabelaMes: z.string().optional(),
        percAVista: z.string().optional(), restricaoSRCC: z.string().optional(),
        percPago: z.string().optional(), totalComissao: z.string().optional(),
        difEmpresa: z.string().optional(), tabela: z.string().optional(),
        supervisor: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB indisponível' });
        const { consignados } = await import('../drizzle/schema');
        return await db.insert(consignados).values(input as any);
      }),

    atualizar: publicProcedure
      .input(z.object({
        id: z.number(),
        empresa: z.string().optional(), mes: z.string().optional(),
        chaveJ: z.string().optional(), nomeAgente: z.string().optional(),
        convenio: z.string().optional(), nrOperacao: z.string().optional(),
        valorBruto: z.string().optional(), valorLiquido: z.string().optional(),
        rbm: z.string().optional(), parcela: z.number().optional(),
        prefixoBB: z.string().optional(), dtContratacao: z.string().optional(),
        produto: z.string().optional(), descricaoProduto: z.string().optional(),
        juros: z.string().optional(), tabelaMes: z.string().optional(),
        percAVista: z.string().optional(), restricaoSRCC: z.string().optional(),
        percPago: z.string().optional(), totalComissao: z.string().optional(),
        difEmpresa: z.string().optional(), tabela: z.string().optional(),
        supervisor: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB indisponível' });
        const { consignados } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const { id, ...data } = input;
        return await db.update(consignados).set(data as any).where(eq(consignados.id, id));
      }),

    excluir: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB indisponível' });
        const { consignados } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        return await db.delete(consignados).where(eq(consignados.id, input.id));
      }),

    // Procedure para calcular fórmulas automáticas dado chaveJ e convenio
    calcularFormulas: publicProcedure
      .input(z.object({
        chaveJ: z.string(),
        convenio: z.string().optional(),
        juros: z.string().optional(),
        meses: z.string().optional(),
        valorLiquido: z.string().optional(),
        rbm: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        const { agentes, tabelasComissao } = await import('../drizzle/schema');
        const { eq, and, lte, gte, or, isNull } = await import('drizzle-orm');

        // 1. Buscar agente pelo chaveJ
        const [agente] = await db.select().from(agentes).where(eq(agentes.chaveJ, input.chaveJ)).limit(1);
        if (!agente) return { erro: 'Agente não encontrado' };

        // 2. Determinar nível do agente (situacao: Ativo01..Ativo10 → ativo01..ativo10)
        const situacao = agente.situacao || '';
        const nivelMatch = situacao.match(/Ativo(\d{2})/i);
        const nivelNum = nivelMatch ? parseInt(nivelMatch[1]) : null;
        const ativoCol = nivelNum ? `ativo${String(nivelNum).padStart(2, '0')}` : null;

        // 3. Buscar percentual na Tabela Comissão pelo convênio
        let percPago: string | null = null;
        if (input.convenio && ativoCol) {
          const tabelas = await db.select().from(tabelasComissao)
            .where(eq(tabelasComissao.convenio, input.convenio))
            .limit(20);
          // Filtrar pela faixa de juros e meses se fornecidos
          let tabelaMatch = tabelas[0];
          if (input.juros && input.meses) {
            const jurosNum = parseFloat(input.juros.replace(',', '.'));
            const mesesNum = parseInt(input.meses);
            tabelaMatch = tabelas.find(t => {
              const jDe = t.txJurosDe ? parseFloat(t.txJurosDe) : 0;
              const jAte = t.txJurosAte && t.txJurosAte !== 'acima' ? parseFloat(t.txJurosAte) : 999;
              const mDe = t.mesesDe ? parseInt(t.mesesDe) : 0;
              const mAte = t.mesesAte ? parseInt(t.mesesAte) : 999;
              return jurosNum >= jDe && jurosNum <= jAte && mesesNum >= mDe && mesesNum <= mAte;
            }) || tabelas[0];
          }
          if (tabelaMatch) {
            percPago = (tabelaMatch as any)[ativoCol] || null;
          }
        }

        // 4. Calcular totalComissao e difEmpresa
        let totalComissao: string | null = null;
        let difEmpresa: string | null = null;
        if (percPago && input.valorLiquido) {
          const vl = parseFloat(input.valorLiquido.replace(',', '.').replace(/[^0-9.]/g, ''));
          const pp = parseFloat(percPago) > 1 ? parseFloat(percPago) / 100 : parseFloat(percPago);
          if (!isNaN(vl) && !isNaN(pp)) {
            totalComissao = (vl * pp).toFixed(2);
            if (input.rbm) {
              const rbmNum = parseFloat(input.rbm.replace(',', '.').replace(/[^0-9.]/g, ''));
              if (!isNaN(rbmNum)) difEmpresa = (rbmNum - vl * pp).toFixed(2);
            }
          }
        }

        return {
          empresa: agente.empresa || null,
          nomeAgente: agente.nomeAgente || null,
          supervisor: agente.supervisor || null,
          percPago,
          totalComissao,
          difEmpresa,
        };
      }),

    listarMeses: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      const { consignados } = await import('../drizzle/schema');
      const rows = await db.selectDistinct({ mes: consignados.mes }).from(consignados).orderBy(consignados.mes);
      return rows.map(r => r.mes).filter(Boolean) as string[];
    }),

    listarEmpresas: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      const { consignados } = await import('../drizzle/schema');
      const rows = await db.selectDistinct({ empresa: consignados.empresa }).from(consignados).orderBy(consignados.empresa);
      return rows.map(r => r.empresa).filter(Boolean) as string[];
    }),

    obterTotalizador: publicProcedure
      .input(z.object({
        mes: z.string().optional(),
        empresa: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { totalVrLiquido: 0, totalComissao: 0 };
        const { consignados } = await import('../drizzle/schema');
        const { eq, and } = await import('drizzle-orm');
        
        const conditions: any[] = [];
        if (input?.mes) conditions.push(eq(consignados.mes, input.mes));
        if (input?.empresa) conditions.push(eq(consignados.empresa, input.empresa));
        
        const rows = conditions.length > 0
          ? await db.select().from(consignados).where(and(...conditions))
          : await db.select().from(consignados);
        
        const totalVrLiquido = rows.reduce((sum, r) => {
          const val = parseFloat(r.valorLiquido || '0');
          return sum + (isNaN(val) ? 0 : val);
        }, 0);
        
        const totalComissao = rows.reduce((sum, r) => {
          const val = parseFloat(r.totalComissao || '0');
          return sum + (isNaN(val) ? 0 : val);
        }, 0);
        
        return {
          totalVrLiquido,
          totalComissao,
          registros: rows.length,
        };
      }),

    importar: publicProcedure
      .input(z.array(z.object({
        empresa: z.string().optional(), mes: z.string().optional(),
        chaveJ: z.string().optional(), nomeAgente: z.string().optional(),
        convenio: z.string().optional(), nrOperacao: z.string().optional(),
        valorBruto: z.string().optional(), valorLiquido: z.string().optional(),
        rbm: z.string().optional(), parcela: z.number().optional(),
        prefixoBB: z.string().optional(), dtContratacao: z.string().optional(),
        produto: z.string().optional(), descricaoProduto: z.string().optional(),
        juros: z.string().optional(), tabelaMes: z.string().optional(),
        percAVista: z.string().optional(), restricaoSRCC: z.string().optional(),
        percPago: z.string().optional(), totalComissao: z.string().optional(),
        difEmpresa: z.string().optional(), tabela: z.string().optional(),
        supervisor: z.string().optional(),
      })))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB indisponível' });
        const { consignados, agentes, tabelasComissao } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        
        if (input.length === 0) return { count: 0 };
        
        // Normalizar campos numéricos: dividir por 100 se valor > 100 (converter de percentual inteiro para decimal)
        const normalizePercentage = (val: any): number | undefined => {
          if (!val) return undefined;
          const num = parseFloat(String(val).replace(',', '.').replace(/[^0-9.]/g, ''));
          if (isNaN(num)) return undefined;
          // Se valor >= 100, é percentual inteiro (ex: 185 = 1.85%)
          if (num >= 100) {
            return parseFloat((num / 100).toFixed(4));
          }
          return parseFloat(num.toFixed(4));
        };
        
        // Processar cada registro para calcular as 5 colunas finais
        const processedRecords = await Promise.all(
          input.map(async (record) => {
            const processed = { ...record };
            
            // Juros já vem como percentual (ex: 2.40 = 2,40%), não normalizar
            // Manter como está
            
            // Normalizar Perc. A Vista
            if (processed.percAVista) {
              const normalized = normalizePercentage(processed.percAVista);
              processed.percAVista = normalized !== undefined ? String(normalized) : undefined;
            }
            
            // Normalizar tabelaMes para 4 casas decimais
            if (processed.tabelaMes) {
              const tabelaNum = parseFloat(String(processed.tabelaMes).replace(',', '.').replace(/[^0-9.]/g, ''));
              if (!isNaN(tabelaNum)) {
                processed.tabelaMes = tabelaNum.toFixed(4);
              }
            }
            
            // Se chaveJ está preenchido, buscar dados do agente e calcular fórmulas
            if (record.chaveJ) {
              try {
                // 1. Buscar agente
                const [agente] = await db.select().from(agentes)
                  .where(eq(agentes.chaveJ, record.chaveJ))
                  .limit(1);
                
                if (agente) {
                  // Preencher campos que vêm do agente
                  if (!processed.empresa) processed.empresa = agente.empresa || undefined;
                  if (!processed.nomeAgente) processed.nomeAgente = agente.nomeAgente || undefined;
                  if (!processed.supervisor) processed.supervisor = agente.supervisor || undefined;
                  
                  // 2. Determinar nível do agente
                  // Tentar primeiro usar o campo 'nivel', depois 'situacao' como fallback
                  let nivelNum: number | null = null;
                  
                  if (agente.nivel) {
                    const nivelMatch = agente.nivel.match(/\d{2}/);
                    nivelNum = nivelMatch ? parseInt(nivelMatch[0]) : null;
                  }
                  
                  if (!nivelNum) {
                    const situacao = agente.situacao || '';
                    const nivelMatch = situacao.match(/Ativo(\d{2})/i);
                    nivelNum = nivelMatch ? parseInt(nivelMatch[1]) : null;
                  }
                  
                  const ativoCol = nivelNum ? `ativo${String(nivelNum).padStart(2, '0')}` : null;
                  
                  // 3. Buscar percentual na Tabela Comissão
                  if (record.convenio && ativoCol) {
                    const tabelas = await db.select().from(tabelasComissao)
                      .where(eq(tabelasComissao.convenio, record.convenio))
                      .limit(20);
                    
                    let tabelaMatch = tabelas[0];
                    if (record.juros && record.tabelaMes) {
                      const jurosNum = parseFloat((record.juros as string).replace(',', '.'));
                      const mesesNum = parseInt(record.tabelaMes);
                      tabelaMatch = tabelas.find(t => {
                        const jDe = t.txJurosDe ? parseFloat(t.txJurosDe) : 0;
                        const jAte = t.txJurosAte && t.txJurosAte !== 'acima' ? parseFloat(t.txJurosAte) : 999;
                        const mDe = t.mesesDe ? parseInt(t.mesesDe) : 0;
                        const mAte = t.mesesAte ? parseInt(t.mesesAte) : 999;
                        return jurosNum >= jDe && jurosNum <= jAte && mesesNum >= mDe && mesesNum <= mAte;
                      }) || tabelas[0];
                    }
                    
                    if (tabelaMatch) {
                      const percPagoVal = (tabelaMatch as any)[ativoCol];
                      if (percPagoVal) {
                        processed.percPago = String(percPagoVal);
                        processed.tabela = tabelaMatch.convenio || undefined;
                        
                        // 4. Calcular totalComissao
                        if (record.valorLiquido) {
                          const vl = parseFloat((record.valorLiquido as string).replace(',', '.').replace(/[^0-9.]/g, ''));
                          const pp = parseFloat(String(percPagoVal)) > 1 ? parseFloat(String(percPagoVal)) / 100 : parseFloat(String(percPagoVal));
                          if (!isNaN(vl) && !isNaN(pp)) {
                            processed.totalComissao = String((vl * pp).toFixed(2));
                            
                            // 5. Calcular difEmpresa
                            if (record.rbm) {
                              const rbmNum = parseFloat((record.rbm as string).replace(',', '.').replace(/[^0-9.]/g, ''));
                              if (!isNaN(rbmNum)) {
                                processed.difEmpresa = String((rbmNum - vl * pp).toFixed(2));
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              } catch (err) {
                console.error(`Erro ao processar ChaveJ ${record.chaveJ}:`, err);
              }
            }
            
            return processed;
          })
        );
        
        // Inserir registros processados
        await db.insert(consignados).values(processedRecords as any[]);
        return { count: processedRecords.length };
      }),
  }),

  contaCorrente: router({
    listar: publicProcedure
      .input(z.object({
        mesAno: z.string().optional(),
        empresa: z.string().optional(),
        chaveJ: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const { contasCorrentes } = await import('../drizzle/schema');
        const { eq, and, like } = await import('drizzle-orm');
        const conditions: any[] = [];
        if (input?.mesAno) conditions.push(eq(contasCorrentes.mesAno, input.mesAno));
        if (input?.empresa) conditions.push(eq(contasCorrentes.empresa, input.empresa));
        if (input?.chaveJ) conditions.push(like(contasCorrentes.chaveJ, `%${input.chaveJ}%`));
        return conditions.length > 0
          ? await db.select().from(contasCorrentes).where(and(...conditions)).orderBy(contasCorrentes.mesAno, contasCorrentes.agente)
          : await db.select().from(contasCorrentes).orderBy(contasCorrentes.mesAno, contasCorrentes.agente);
      }),

    criar: publicProcedure
      .input(z.object({
        empresa: z.string().optional(), mesAno: z.string().optional(),
        chaveJ: z.string().optional(), agente: z.string().optional(),
        agencia: z.string().optional(), contaCorrente: z.string().optional(),
        tipoServ: z.string().optional(), dataOperacao: z.string().optional(),
        produto: z.string().optional(), modalidade: z.string().optional(),
        agRelacionamento: z.string().optional(), rbm: z.string().optional(),
        percComissao: z.string().optional(), comissao: z.string().optional(),
        supervisor: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB indisponível' });
        const { contasCorrentes } = await import('../drizzle/schema');
        const data: any = { ...input };
        if (data.rbm) data.rbm = parseFloat(data.rbm.replace(',', '.').replace(/[^0-9.]/g, '')) || null;
        if (data.percComissao) data.percComissao = parseFloat(data.percComissao.replace(',', '.').replace(/[^0-9.]/g, '')) || null;
        if (data.comissao) data.comissao = parseFloat(data.comissao.replace(',', '.').replace(/[^0-9.]/g, '')) || null;
        if (data.dataOperacao) data.dataOperacao = data.dataOperacao || null;
        return await db.insert(contasCorrentes).values(data);
      }),

    atualizar: publicProcedure
      .input(z.object({
        id: z.number(),
        empresa: z.string().optional(), mesAno: z.string().optional(),
        chaveJ: z.string().optional(), agente: z.string().optional(),
        agencia: z.string().optional(), contaCorrente: z.string().optional(),
        tipoServ: z.string().optional(), dataOperacao: z.string().optional(),
        produto: z.string().optional(), modalidade: z.string().optional(),
        agRelacionamento: z.string().optional(), rbm: z.string().optional(),
        percComissao: z.string().optional(), comissao: z.string().optional(),
        supervisor: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB indisponível' });
        const { contasCorrentes } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        const { id, ...rest } = input;
        const data: any = { ...rest };
        if (data.rbm) data.rbm = parseFloat(data.rbm.replace(',', '.').replace(/[^0-9.]/g, '')) || null;
        if (data.percComissao) data.percComissao = parseFloat(data.percComissao.replace(',', '.').replace(/[^0-9.]/g, '')) || null;
        if (data.comissao) data.comissao = parseFloat(data.comissao.replace(',', '.').replace(/[^0-9.]/g, '')) || null;
        return await db.update(contasCorrentes).set(data).where(eq(contasCorrentes.id, id));
      }),

    excluir: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB indisponível' });
        const { contasCorrentes } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        return await db.delete(contasCorrentes).where(eq(contasCorrentes.id, input.id));
      }),

    listarMeses: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      const { contasCorrentes } = await import('../drizzle/schema');
      const rows = await db.selectDistinct({ mesAno: contasCorrentes.mesAno }).from(contasCorrentes).orderBy(contasCorrentes.mesAno);
      return rows.map(r => r.mesAno).filter(Boolean) as string[];
    }),

    listarEmpresas: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      const { contasCorrentes } = await import('../drizzle/schema');
      const rows = await db.selectDistinct({ empresa: contasCorrentes.empresa }).from(contasCorrentes).orderBy(contasCorrentes.empresa);
      return rows.map(r => r.empresa).filter(Boolean) as string[];
    }),

    // Cálculos automáticos: busca empresa, agente, supervisor pelo chaveJ e percComissao na Tabela
    calcularFormulas: publicProcedure
      .input(z.object({
        chaveJ: z.string(),
        rbm: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        const { agentes, tabelasComissao } = await import('../drizzle/schema');
        const { eq, like } = await import('drizzle-orm');

        // 1. Buscar agente pelo chaveJ
        const [agente] = await db.select().from(agentes).where(eq(agentes.chaveJ, input.chaveJ)).limit(1);
        if (!agente) return { erro: 'Agente não encontrado' };

        // 2. Buscar percentual de Conta Corrente na Tabela Comissão
        // Busca pela linha com convenio = 'Conta Corrente' ou 'CONTA CORRENTE'
        const situacao = agente.situacao || '';
        const nivelMatch = situacao.match(/Ativo(\d{2})/i);
        const nivelNum = nivelMatch ? parseInt(nivelMatch[1]) : null;
        const ativoCol = nivelNum ? `ativo${String(nivelNum).padStart(2, '0')}` : null;

        let percComissao: string | null = null;
        if (ativoCol) {
          const tabelas = await db.select().from(tabelasComissao)
            .where(like(tabelasComissao.convenio, '%Conta%'))
            .limit(5);
          if (tabelas.length > 0) {
            percComissao = (tabelas[0] as any)[ativoCol] || null;
          }
        }

        // 3. Calcular comissao = rbm * percComissao
        let comissao: string | null = null;
        if (percComissao && input.rbm) {
          const rbmNum = parseFloat(input.rbm.replace(',', '.').replace(/[^0-9.]/g, ''));
          const pp = parseFloat(percComissao) > 1 ? parseFloat(percComissao) / 100 : parseFloat(percComissao);
          if (!isNaN(rbmNum) && !isNaN(pp)) {
            comissao = (rbmNum * pp).toFixed(2);
          }
        }

        return {
          empresa: agente.empresa || null,
          agente: agente.nomeAgente || null,
          supervisor: agente.supervisor || null,
          percComissao,
          comissao,
        };
      }),

    importar: publicProcedure
      .input(z.array(z.object({
        empresa: z.string().optional(), mesAno: z.string().optional(),
        chaveJ: z.string().optional(), agente: z.string().optional(),
        agencia: z.string().optional(), contaCorrente: z.string().optional(),
        tipoServ: z.string().optional(), dataOperacao: z.string().optional(),
        produto: z.string().optional(), modalidade: z.string().optional(),
        agRelacionamento: z.string().optional(), rbm: z.string().optional(),
        percComissao: z.string().optional(), comissao: z.string().optional(),
        supervisor: z.string().optional(),
      })))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB indisponível' });
        const { contasCorrentes } = await import('../drizzle/schema');
        if (input.length === 0) return { count: 0 };
        const rows = input.map((r: any) => ({
          ...r,
          rbm: r.rbm ? parseFloat(r.rbm.replace(',', '.').replace(/[^0-9.]/g, '')) || null : null,
          percComissao: r.percComissao ? parseFloat(r.percComissao.replace(',', '.').replace(/[^0-9.]/g, '')) || null : null,
          comissao: r.comissao ? parseFloat(r.comissao.replace(',', '.').replace(/[^0-9.]/g, '')) || null : null,
        }));
        await db.insert(contasCorrentes).values(rows);
        return { count: rows.length };
      }),

    calcularPercPago: publicProcedure
      .input(z.object({
        rbm: z.number(),
        situacao: z.string(),
        chaveJ: z.string(),
        empresa: z.string(),
        parcela: z.string(),
        descricao: z.string(),
        juros: z.string(),
      }))
      .query(async ({ input }) => {
        const resultado = await calcularPercPago(
          input.rbm,
          input.situacao,
          input.chaveJ,
          input.empresa,
          input.parcela,
          input.descricao,
          input.juros
        );
        return { percPago: resultado };
      }),
  }),
  valoresCalculo: router({
    obter: publicProcedure.query(async () => {
      return await obterValoresCalculo();
    }),
    atualizar: publicProcedure
      .input(z.object({
        ativo01: z.string().optional(),
        ativo02: z.string().optional(),
        ativo03: z.string().optional(),
        ativo04: z.string().optional(),
        ativo05: z.string().optional(),
        ativo06: z.string().optional(),
        ativo07: z.string().optional(),
        ativo08: z.string().optional(),
        ativo09: z.string().optional(),
        ativo10: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const dados: Record<string, string | number> = {};
        const campos = ['ativo01', 'ativo02', 'ativo03', 'ativo04', 'ativo05', 'ativo06', 'ativo07', 'ativo08', 'ativo09', 'ativo10'] as const;
        
        campos.forEach(campo => {
          if (input[campo] !== undefined && input[campo] !== '') {
            const normalized = String(input[campo]).replace(',', '.');
            dados[campo] = parseFloat(normalized) || 0;
          }
        });

        await atualizarValoresCalculo(dados as any);
        return { success: true };
      }),
  }),
});
export type AppRouter = typeof appRouter;