import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, adminProcedure, protectedProcedure } from "./_core/trpc";
import { agentesRouter } from "./routers/agentes";
import { auditoriaRouter } from "./routers/auditoria";
import { certificacoesRouter } from "./routers/certificacoes";
import { crmRouter } from "./routers/crm";
import { febrabanRouter } from "./routers/febraban";
import { pagamentosRouter } from "./routers/pagamentos";
import { proRataRouter } from "./routers/proRata";
import { calculosRouter } from "./routers/calculos";
import { despesasFixasRouter } from "./routers/despesasFixas";
import { feriadosRouter } from "./routers/feriados";
import { consorcioRouter } from "./routers/consorcio";
import { contaCorrenteRouter } from "./routers/contaCorrente";
import { supervisoresRouter } from "./routers/supervisores";
import { ativoImobilizadoRouter } from "./routers/ativoImobilizado";
import { uniformesCrachasRouter } from "./routers/uniformesCrachas";
import { minutosSabedoriaRouter } from "./routers/minutosSabedoria";
import { mensagensMotivacionaisRouter } from "./routers/mensagensMotivacionais";
import { engajamentoRouter } from "./routers/engajamento";
import { contasLojasRouter } from "./routers/contasLojas";
import { documentosAgentesRouter } from "./routers/documentosAgentes";
import { horoscopoRouter } from "./routers/horoscopo";
import { ourocapRouter } from "./routers/ourocap";
import { segurosRouter } from "./routers/seguros";
import { bbdentalRouter } from "./routers/bbdental";
import { webauthnRouter } from "./routers/webauthn";
import { z } from "zod";
import { getAgenteByChaveJ, getLoginAttempts, incrementLoginAttempts, resetLoginAttempts, createAuditLog, unlockLoginAttempts, getAllBlockedAttempts, getLoginAttemptsHistory, upsertUser, createSessao, getSessaoByChaveJ, getTodasSessoesAtivas, updateSessaoUltimoAcesso, encerrarSessao, criarMensagem, obterMensagensPrivadas, obterMensagensNaoLidas, marcarMensagensComoLidas, getDb, obterValoresCalculo, atualizarValoresCalculo, calcularPercPago } from "./db";
import { users, agentes, despesasFixas, pagamentos } from "../drizzle/schema";
import { eq, and, or, isNull } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";
import { sdk } from "./_core/sdk";
import { TRPCError } from "@trpc/server";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  certificacoes: certificacoesRouter,
  auth: router({
    me: publicProcedure.query(async (opts) => {
      const user = opts.ctx.user;
      if (!user) return null;
      // Owner do projeto sempre tem acesso admin
      const ownerOpenId = process.env.OWNER_OPEN_ID;
      if (ownerOpenId && user.openId === ownerOpenId) {
        return { ...user, permissoes: 'admin', cargo: 'CEO', permissoesModulos: null };
      }
      // Buscar permissoesModulos e cargo do agente logado
      if (user.openId?.startsWith('agente_')) {
        const agenteId = parseInt(user.openId.replace('agente_', ''), 10);
        const db = await getDb();
        if (db) {
          const [agenteRow] = await db.select({
            permissoes: agentes.permissoes,
            permissoesModulos: agentes.permissoesModulos,
            cargo: agentes.cargo,
            nomeAgente: agentes.nomeAgente,
            chaveJ: agentes.chaveJ,
            situacao: agentes.situacao,
          }).from(agentes).where(eq(agentes.id, agenteId)).limit(1);
          if (agenteRow) {
            return {
              ...user,
              permissoes: agenteRow.permissoes ?? 'leitor',
              permissoesModulos: agenteRow.permissoesModulos ?? null,
              cargo: agenteRow.cargo ?? null,
              nomeAgente: agenteRow.nomeAgente ?? null,
              chaveJ: agenteRow.chaveJ ?? null,
              situacao: agenteRow.situacao ?? null,
            };
          }
        }
      }
      return user;
    }),
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
        latitude: z.string().optional(),
        longitude: z.string().optional(),
        geoEndereco: z.string().optional(),
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
        
        // Lista de ChaveJs isentas de geolocalização
        const CHAVES_ISENTAS_GEO = ['J1234567', 'JBMF1234'];
        const isentoGeo = CHAVES_ISENTAS_GEO.includes(agente.chaveJ?.toUpperCase?.() ?? '');
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
          latitude: isentoGeo ? null : (input.latitude ?? null),
          longitude: isentoGeo ? null : (input.longitude ?? null),
          geoEndereco: isentoGeo ? null : (input.geoEndereco ?? null),
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
        
        // ── Notificação de pagamentos do dia para Thiago V Ultramare ──
        const parseDataBR2 = (s: string | null): Date | null => {
          if (!s) return null;
          const p = s.split('/');
          if (p.length !== 3) return null;
          return new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
        };
        const THIAGO_NOME = 'thiago v ultramare';
        if (agente.nomeAgente?.toLowerCase().trim() === THIAGO_NOME) {
          try {
            const db2 = await getDb();
            if (db2) {
              const agora2 = new Date();
              const brasilia = new Date(agora2.getTime() - 3 * 60 * 60 * 1000);
              const dd = String(brasilia.getUTCDate()).padStart(2, '0');
              const mm = String(brasilia.getUTCMonth() + 1).padStart(2, '0');
              const aaaa = String(brasilia.getUTCFullYear());
              const hoje2Str = `${dd}/${mm}/${aaaa}`;

              // Buscar pagamentos não pagos de despesas fixas com vencimento hoje ou atrasados
              const todasDespesas = await db2.select().from(despesasFixas)
                .where(and(eq(despesasFixas.pago, false), isNull(despesasFixas.dataPagto)));
              const todasPagamentos = await db2.select().from(pagamentos)
                .where(and(eq(pagamentos.pago, false), isNull(pagamentos.dataPagto)));

              const hojeDate = new Date(Number(aaaa), Number(mm) - 1, Number(dd));
              hojeDate.setHours(0, 0, 0, 0);

              type ItemPagto = { nome: string; valor: string; vencer: string; tipo: string; empresa: string };
              const itens: ItemPagto[] = [];

              for (const d of todasDespesas) {
                const dt = parseDataBR2(d.dataVencer);
                if (dt && dt <= hojeDate) {
                  itens.push({
                    nome: d.nome || d.chaveResp || '-',
                    valor: d.valor ? `R$ ${parseFloat(String(d.valor)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-',
                    vencer: d.dataVencer || '-',
                    tipo: d.tipoPagto || 'Desp. Fixa',
                    empresa: d.empresa || '-',
                  });
                }
              }

              for (const p of todasPagamentos) {
                const dt = parseDataBR2(p.dataVencer);
                if (dt && dt <= hojeDate) {
                  itens.push({
                    nome: p.nomeFavorecido || p.chaveJ || '-',
                    valor: p.valor ? `R$ ${parseFloat(String(p.valor)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-',
                    vencer: p.dataVencer || '-',
                    tipo: p.tipoPagto || 'Pagamento',
                    empresa: p.empresa || '-',
                  });
                }
              }

              if (itens.length > 0) {
                const linhas = itens.slice(0, 20).map((it, i) =>
                  `${i + 1}. ${it.nome} | ${it.tipo} | ${it.empresa} | ${it.valor} | Vence: ${it.vencer}`
                ).join('\n');
                const total = itens.reduce((acc, it) => {
                  const v = parseFloat(it.valor.replace('R$ ', '').replace(/\./g, '').replace(',', '.'));
                  return acc + (isNaN(v) ? 0 : v);
                }, 0);
                const totalStr = `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                await notifyOwner({
                  title: `📋 Pagamentos do dia ${hoje2Str} — ${itens.length} item(s)`,
                  content: `Olá Thiago! Aqui está o que tem para pagar hoje (${hoje2Str}):\n\n${linhas}${itens.length > 20 ? `\n... e mais ${itens.length - 20} item(s)` : ''}\n\nTOTAL: ${totalStr}`,
                });
              } else {
                await notifyOwner({
                  title: `✅ Sem pagamentos pendentes em ${hoje2Str}`,
                  content: `Olá Thiago! Não há pagamentos com vencimento hoje ou em atraso. Bom dia! 😊`,
                });
              }
            }
          } catch (e) {
            console.warn('[Login] Erro ao enviar notificação de pagamentos:', e);
          }
        }
        // ── Fim notificação ──

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

        // Verificar se o agente tem acesso irrestrito (sem bloqueio de horário)
        const AGENTES_ACESSO_IRRESTRITO = ['Sidnei Honorato Ultramare', 'Thiago Viana Ultramare'];
        const acessoIrrestrito = AGENTES_ACESSO_IRRESTRITO.some(
          nome => agente.nomeAgente?.toLowerCase().trim() === nome.toLowerCase().trim()
        );

        // Verificar bloqueio de horário (apenas para agentes sem acesso irrestrito)
        if (!acessoIrrestrito) {
          // Usar horário de Brasília (UTC-3)
          const agora = new Date();
          const horarioBrasilia = new Date(agora.getTime() - 3 * 60 * 60 * 1000);
          const diaSemana = horarioBrasilia.getUTCDay(); // 0=Dom, 6=Sáb
          const hora = horarioBrasilia.getUTCHours();
          const minuto = horarioBrasilia.getUTCMinutes();
          const totalMinutos = hora * 60 + minuto;
          const inicioPermitido = 7 * 60 + 30; // 07:30
          const fimPermitido = 19 * 60 + 30; // 19:30

          if (diaSemana === 0 || diaSemana === 6) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Acesso permitido apenas de segunda a sexta.',
            });
          }

          if (totalMinutos < inicioPermitido || totalMinutos >= fimPermitido) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Acesso permitido apenas entre 07:30 e 19:30.',
            });
          }
        }

        return {
          success: true,
          numeroEntrada,
          isAniversario,
          acessoIrrestrito,
          isentoGeo,
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
  crm: crmRouter,
  despesasFixas: despesasFixasRouter,
  auditoria: auditoriaRouter,
  febraban: febrabanRouter,
  feriados: feriadosRouter,
  consorcio: consorcioRouter,
  contaCorrenteProd: contaCorrenteRouter,
  pagamentos: pagamentosRouter,
  proRata: proRataRouter,
  calculosImportados: calculosRouter,
  supervisores: supervisoresRouter,
  ativoImobilizado: ativoImobilizadoRouter,
  uniformesCrachas: uniformesCrachasRouter,
  minutosSabedoria: minutosSabedoriaRouter,
  mensagensMotivacionais: mensagensMotivacionaisRouter,
  engajamento: engajamentoRouter,
  contasLojas: contasLojasRouter,
  documentosAgentes: documentosAgentesRouter,
  horoscopo: horoscopoRouter,
  ourocap: ourocapRouter,
  seguros: segurosRouter,
  bbdental: bbdentalRouter,
  webauthn: webauthnRouter,
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
        codigo: z.string().max(24).optional(),
        faixa1: z.string().optional(), faixa2: z.string().optional(),
        faixa3: z.string().optional(), faixa4: z.string().optional(), faixa5: z.string().optional(),
        tabelaCalculo: z.string().optional(), referencia: z.string().optional(),
        convenio: z.string().optional(),
        txJurosDe: z.string().optional(), txJurosAte: z.string().optional(),
        valorMinimo: z.string().optional(),
        mesesDe: z.string().optional(), mesesAte: z.string().optional(),
        ativo01: z.string().optional(), ativo01De: z.string().optional(), ativo01Ate: z.string().optional(),
        ativo02: z.string().optional(), ativo02De: z.string().optional(), ativo02Ate: z.string().optional(),
        ativo03: z.string().optional(), ativo03De: z.string().optional(), ativo03Ate: z.string().optional(),
        ativo04: z.string().optional(), ativo04De: z.string().optional(), ativo04Ate: z.string().optional(),
        ativo05: z.string().optional(), ativo05De: z.string().optional(), ativo05Ate: z.string().optional(),
        ativo06: z.string().optional(), ativo06De: z.string().optional(), ativo06Ate: z.string().optional(),
        ativo07: z.string().optional(), ativo07De: z.string().optional(), ativo07Ate: z.string().optional(),
        ativo08: z.string().optional(), ativo08De: z.string().optional(), ativo08Ate: z.string().optional(),
        ativo09: z.string().optional(), ativo09De: z.string().optional(), ativo09Ate: z.string().optional(),
        ativo10: z.string().optional(), ativo10De: z.string().optional(), ativo10Ate: z.string().optional(),
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
        codigo: z.string().max(24).optional(),
        faixa1: z.string().optional(), faixa2: z.string().optional(),
        faixa3: z.string().optional(), faixa4: z.string().optional(), faixa5: z.string().optional(),
        tabelaCalculo: z.string().optional(), referencia: z.string().optional(),
        convenio: z.string().optional(),
        txJurosDe: z.string().optional(), txJurosAte: z.string().optional(),
        valorMinimo: z.string().optional(),
        mesesDe: z.string().optional(), mesesAte: z.string().optional(),
        ativo01: z.string().optional(), ativo01De: z.string().optional(), ativo01Ate: z.string().optional(),
        ativo02: z.string().optional(), ativo02De: z.string().optional(), ativo02Ate: z.string().optional(),
        ativo03: z.string().optional(), ativo03De: z.string().optional(), ativo03Ate: z.string().optional(),
        ativo04: z.string().optional(), ativo04De: z.string().optional(), ativo04Ate: z.string().optional(),
        ativo05: z.string().optional(), ativo05De: z.string().optional(), ativo05Ate: z.string().optional(),
        ativo06: z.string().optional(), ativo06De: z.string().optional(), ativo06Ate: z.string().optional(),
        ativo07: z.string().optional(), ativo07De: z.string().optional(), ativo07Ate: z.string().optional(),
        ativo08: z.string().optional(), ativo08De: z.string().optional(), ativo08Ate: z.string().optional(),
        ativo09: z.string().optional(), ativo09De: z.string().optional(), ativo09Ate: z.string().optional(),
        ativo10: z.string().optional(), ativo10De: z.string().optional(), ativo10Ate: z.string().optional(),
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
        const { eq, and, like, isNotNull, ne } = await import('drizzle-orm');
        const conditions: any[] = [
          isNotNull(consignados.chaveJ),
          ne(consignados.chaveJ, ''),
        ];
        if (input?.mes) conditions.push(eq(consignados.mes, input.mes));
        if (input?.empresa) conditions.push(eq(consignados.empresa, input.empresa));
        if (input?.chaveJ) conditions.push(like(consignados.chaveJ, `%${input.chaveJ}%`));
        if (input?.convenio) conditions.push(eq(consignados.convenio, input.convenio));
        const { desc, asc, sql: sqlOrd } = await import('drizzle-orm');
        // Ordenar por mês DESC (mais novo primeiro) — formato MM/AAAA → AAAAMM para comparação
        // ex: "04/2026" → CONCAT(RIGHT(mes,4), LEFT(mes,2)) = "202604"
        const mesOrdem = sqlOrd`CONCAT(RIGHT(mes, 4), LEFT(mes, 2))`;
        return await db.select().from(consignados).where(and(...conditions)).orderBy(desc(mesOrdem), asc(consignados.empresa), asc(consignados.chaveJ));
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

    // Procedure para buscar registros com filtros
    buscarComFiltros: publicProcedure
      .input(z.object({
        mes: z.string().optional(),
        chaveJ: z.string().optional(),
        nomeAgente: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const { consignados } = await import('../drizzle/schema');
        const { eq, and, like } = await import('drizzle-orm');
        const conditions: any[] = [];
        if (input?.mes) conditions.push(eq(consignados.mes, input.mes));
        if (input?.chaveJ) conditions.push(like(consignados.chaveJ, `%${input.chaveJ}%`));
        if (input?.nomeAgente) conditions.push(like(consignados.nomeAgente, `%${input.nomeAgente}%`));
        const { desc: descOrd2, asc: ascOrd2, sql: sqlOrd2 } = await import('drizzle-orm');
        const mesOrdem2 = sqlOrd2`CONCAT(RIGHT(mes, 4), LEFT(mes, 2))`;
        return conditions.length > 0
          ? await db.select().from(consignados).where(and(...conditions)).orderBy(descOrd2(mesOrdem2), ascOrd2(consignados.empresa), ascOrd2(consignados.chaveJ))
          : await db.select().from(consignados).orderBy(descOrd2(mesOrdem2), ascOrd2(consignados.empresa), ascOrd2(consignados.chaveJ));
      }),

    // Procedure para calcular fórmulas automáticas dado chaveJ e convenio
    calcularFormulas: publicProcedure
      .input(z.object({
        chaveJ: z.string(),
        convenio: z.string().optional(),
        descricaoProduto: z.string().optional(),
        juros: z.string().optional(),
        meses: z.string().optional(),
        valorLiquido: z.string().optional(),
        rbm: z.string().optional(),
        mes: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        const { agentes } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');

        // Buscar agente
        const [agente] = await db.select().from(agentes).where(eq(agentes.chaveJ, input.chaveJ)).limit(1);

        // Regra 1: Se RBM é zero ou vazio, Perc. Pago = 0%
        const rbmValCheck = input.rbm ? parseFloat(input.rbm.replace(',', '.').replace(/[^0-9.]/g, '')) : 0;
        if (!input.rbm || rbmValCheck === 0) {
          return {
            empresa: agente?.empresa || null,
            nomeAgente: agente?.nomeAgente || null,
            supervisor: agente?.supervisor || null,
            percPago: '0',
            totalComissao: '0',
            difEmpresa: input.rbm ? '0' : null,
          };
        }

        if (!agente) return { erro: 'Agente não encontrado' };

        // Usar descricaoProduto (preferência) ou convenio como fallback
        const descricao = input.descricaoProduto || input.convenio || '';
        const empresa = agente.empresa || '';
        const situacao = agente.situacao || '';
        const parcela = input.meses || '';
        const juros = input.juros || '';
        const mes = input.mes || '';

        const calcResult = await calcularPercPago(
          rbmValCheck,
          situacao,
          input.chaveJ,
          empresa,
          parcela,
          descricao,
          juros,
          mes
        );
        const percPagoNum = calcResult.perc;
        const percPago = percPagoNum > 0 ? String(percPagoNum) : null;;

        // Calcular totalComissao e difEmpresa
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
      const { desc: dMes, sql: sqlMes } = await import('drizzle-orm');
      const mesOrd = sqlMes`CONCAT(RIGHT(mes, 4), LEFT(mes, 2))`;
      const rows = await db.selectDistinct({ mes: consignados.mes }).from(consignados).orderBy(dMes(mesOrd));
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
                  
                  // Regra 1: Se RBM é zero ou vazio, Perc. Pago = 0%
                  const rbmImportCheck = record.rbm ? parseFloat((record.rbm as string).replace(',', '.').replace(/[^0-9.]/g, '')) : 0;
                  if (!record.rbm || rbmImportCheck === 0) {
                    processed.percPago = '0';
                    processed.totalComissao = '0';
                  } else {
                    // Usar calcularPercPago unificado (usa descricaoProduto, empresa, parcela, juros, mes)
                    const situacaoAgente = agente.situacao || '';
                    const chaveJAgente = record.chaveJ || '';
                    const empresaAgente = record.empresa || agente.empresa || '';
                    const parcelaRec = String(record.parcela || '');
                    const descricaoRec = record.descricaoProduto || '';
                    const jurosRec = record.juros || '';
                    const mesRec = record.mes || '';

                       const calcImportResult = await calcularPercPago(
                      rbmImportCheck,
                      situacaoAgente,
                      chaveJAgente,
                      empresaAgente,
                      parcelaRec,
                      descricaoRec,
                      jurosRec,
                      mesRec
                    );
                    const percPagoVal = calcImportResult.perc;
                    if (percPagoVal > 0) {
                      processed.percPago = String(percPagoVal);
                      processed.tabela = calcImportResult.ativoUsado || undefined;
                      // Calcular totalComissao
                      if (record.valorLiquido) {
                        const vl = parseFloat((record.valorLiquido as string).replace(',', '.').replace(/[^0-9.]/g, ''));
                        const pp = percPagoVal > 1 ? percPagoVal / 100 : percPagoVal;
                        if (!isNaN(vl) && !isNaN(pp)) {
                          processed.totalComissao = String((vl * pp).toFixed(2));
                          // Calcular difEmpresa
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
              } catch (err) {
                console.error(`Erro ao processar ChaveJ ${record.chaveJ}:`, err);
              }
            }
            
            return processed;
          })
        );
        
        // Inserir registros processados
        try {
          await db.insert(consignados).values(processedRecords as any[]);
          return { count: processedRecords.length };
        } catch (err: any) {
          console.error('Erro ao inserir registros:', err);
          throw new TRPCError({ 
            code: 'INTERNAL_SERVER_ERROR', 
            message: `Erro ao importar: ${err?.message || 'Erro desconhecido'}` 
          });
        }
      }),

    marcarDuplicatas: publicProcedure.mutation(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB indisponivel' });
      const { consignados } = await import('../drizzle/schema');
      const { eq, sql } = await import('drizzle-orm');

      // 1. Limpar isDuplicate anterior
      await db.update(consignados).set({ isDuplicate: false });

      // 2. Buscar todos os registros com nrOperacao duplicado
      const result = await db.execute(sql`
        SELECT nrOperacao, COUNT(*) as cnt
        FROM consignados
        WHERE nrOperacao IS NOT NULL AND nrOperacao != ''
        GROUP BY nrOperacao
        HAVING cnt > 1
      `);
      
      // Extrair dados do resultado
      const duplicatas = Array.isArray(result[0]) ? result[0] : [];

      // 3. Marcar como duplicado
      for (const row of duplicatas) {
        const nrOp = (row as any).nrOperacao;
        await db.update(consignados)
          .set({ isDuplicate: true })
          .where(eq(consignados.nrOperacao, nrOp));
      }

      return { duplicatasEncontradas: duplicatas.length };
    }),

    // Buscar todas as Chaves J de um mês/ano (com duplicatas)
    buscarChavesJPorMes: publicProcedure
      .input(z.object({
        mes: z.string(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const { consignados } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        
        const rows = await db.select({ chaveJ: consignados.chaveJ }).from(consignados).where(eq(consignados.mes, input.mes));
        return rows.map(r => r.chaveJ).filter(Boolean) as string[];
      }),

    // Recalcular Perc. Pago e Total Comissão para todos os registros de um mês
    recalcularMes: publicProcedure
      .input(z.object({ mes: z.string() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB indisponível' });
        const { consignados, agentes } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');

        // Verificar se mês é >= 05/2026
        const [mesNum, anoNum] = input.mes.split('/').map(Number);
        if (anoNum * 100 + mesNum < 202605) {
          return { count: 0, mensagem: 'Cálculo só se aplica a partir de 05/2026' };
        }

        // Buscar todos os registros do mês
        const registros = await db.select().from(consignados).where(eq(consignados.mes, input.mes));
        let atualizados = 0;

        for (const reg of registros) {
          if (!reg.chaveJ) continue;

          // Buscar agente
          const [agente] = await db.select().from(agentes).where(eq(agentes.chaveJ, reg.chaveJ)).limit(1);
          if (!agente) continue;

          const rbmNum = reg.rbm ? Number(reg.rbm) : 0;
          if (rbmNum === 0) {
            await db.update(consignados).set({ percPago: '0', totalComissao: '0' }).where(eq(consignados.id, reg.id));
            atualizados++;
            continue;
          }

           const calcRecalcResult = await calcularPercPago(
            rbmNum,
            agente.situacao || '',
            reg.chaveJ,
            agente.empresa || reg.empresa || '',
            String(reg.parcela || ''),
            reg.descricaoProduto || '',
            reg.juros || '',
            input.mes
          );
          const percPagoVal = calcRecalcResult.perc;
          if (percPagoVal > 0) {
            const vl = reg.valorLiquido ? Number(reg.valorLiquido) : 0;
            const pp = percPagoVal > 1 ? percPagoVal / 100 : percPagoVal;
            const totalComissao = !isNaN(vl) && !isNaN(pp) ? (vl * pp).toFixed(2) : null;
            const difEmpresa = !isNaN(rbmNum) && totalComissao ? (rbmNum - parseFloat(totalComissao)).toFixed(2) : null;
            await db.update(consignados).set({
              percPago: String(percPagoVal),
              totalComissao: totalComissao || undefined,
              difEmpresa: difEmpresa || undefined,
              tabela: calcRecalcResult.ativoUsado || undefined,
            }).where(eq(consignados.id, reg.id));
             atualizados++;
          }
        }
        return { count: atualizados, total: registros.length };
      }),

    // Enviar registros para a aba Cálculo (tabela calculos)
    // Agrupa por chaveJ+empresa+mes, soma totalComissao
    // Se já existe registro em calculos para chaveJ+mesRef → atualiza comissaoConsig
    // Se não existe → cria novo registro com dados do agente
    enviarParaCalculo: publicProcedure
      .input(z.object({
        mes: z.string().optional(),       // Enviar todo o mês
        ids: z.array(z.number()).optional(), // Enviar selecionados (uma por uma)
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB indisponível' });
        const { consignados, calculos, agentes: agentesTable } = await import('../drizzle/schema');
        const { eq, and, sql: sqlD } = await import('drizzle-orm');

        // 1. Buscar registros a processar
        let registros: any[] = [];
        if (input.ids && input.ids.length > 0) {
          // Uma por uma: buscar pelos IDs selecionados
          registros = await db.select().from(consignados)
            .where(sqlD`${consignados.id} IN (${sqlD.join(input.ids.map(id => sqlD`${id}`), sqlD`, `)})`);
        } else if (input.mes) {
          // Todo o mês
          registros = await db.select().from(consignados).where(eq(consignados.mes, input.mes));
        } else {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Informe o mês ou selecione registros' });
        }

        if (registros.length === 0) {
          return { criados: 0, atualizados: 0, total: 0 };
        }

        // 2. Agrupar por chaveJ + empresa + mes, somando totalComissao e rbm
        const grupos = new Map<string, { chaveJ: string; empresa: string; mes: string; totalComissao: number; rbmTotal: number }>();
        for (const r of registros) {
          const chaveJ = r.chaveJ ?? '';
          const empresa = r.empresa ?? '';
          const mes = r.mes ?? '';
          if (!chaveJ || !mes) continue;
          const key = `${chaveJ}|${empresa}|${mes}`;
          const comissao = parseFloat(String(r.totalComissao ?? 0)) || 0;
          const rbm = parseFloat(String(r.rbm ?? 0)) || 0;
          if (grupos.has(key)) {
            grupos.get(key)!.totalComissao += comissao;
            grupos.get(key)!.rbmTotal += rbm;
          } else {
            grupos.set(key, { chaveJ, empresa, mes, totalComissao: comissao, rbmTotal: rbm });
          }
        }

        let criados = 0;
        let atualizados = 0;

        for (const grupo of Array.from(grupos.values())) {
          const { chaveJ, empresa, mes, totalComissao, rbmTotal } = grupo;
          // mes no consignado é MM/AAAA
          const mesRef = mes;

          // 3. Verificar se já existe registro em calculos para chaveJ + empresa + mesRef
          const existente = await db.select().from(calculos)
            .where(and(eq(calculos.chaveJ, chaveJ), eq(calculos.empresa, empresa), eq(calculos.mesRef, mesRef)))
            .limit(1);

          if (existente.length > 0) {
            // Atualizar comissaoConsig e recalcular comissaoTotal
            const reg = existente[0];
            const toN = (v: any) => parseFloat(String(v ?? 0)) || 0;
            const novaComissaoTotal =
              totalComissao +
              toN(reg.comissaoConsorcio) +
              toN(reg.comissaoOurocap) +
              toN(reg.comissaoCc) +
              toN(reg.comissaoSeguros) +
              toN(reg.ajudaCusto) +
              toN(reg.creditosDebitos) -
              toN(reg.adiantamento);

            await db.update(calculos).set({
              comissaoConsig: String(totalComissao),
              comissaoTotal: String(novaComissaoTotal),
              rbmTotal: rbmTotal > 0 ? String(rbmTotal) : reg.rbmTotal,
              rbmCreditoC2: rbmTotal > 0 ? String(rbmTotal) : reg.rbmCreditoC2,
            }).where(eq(calculos.id, reg.id));
            atualizados++;
          } else {
            // Criar novo registro — buscar dados do agente
            let nomeAgente: string | null = null;
            let cidade: string | null = null;
            let situacao: string | null = null;

            const agenteRows = await db.select().from(agentesTable)
              .where(eq(agentesTable.chaveJ, chaveJ)).limit(1);
            if (agenteRows.length > 0) {
              const a = agenteRows[0];
              nomeAgente = a.nomeAgente ?? null;
              cidade = a.cidade ? (a.uf ? `${a.cidade}/${a.uf}` : a.cidade) : null;
              situacao = a.situacao ?? null;
            } else {
              // fallback: pegar do próprio consignado
              const r = registros.find(x => x.chaveJ === chaveJ);
              nomeAgente = r?.nomeAgente ?? null;
            }

            await db.insert(calculos).values({
              tipoPagamento: 'Comissão',
              mesRef,
              empresa: empresa || null,
              chaveJ: chaveJ || null,
              nomeAgente,
              cidade,
              situacao,
              comissaoConsig: String(totalComissao),
              comissaoTotal: String(totalComissao),
              rbmTotal: rbmTotal > 0 ? String(rbmTotal) : null,
              rbmCreditoC2: rbmTotal > 0 ? String(rbmTotal) : null,
            } as any);
            criados++;
          }
        }

        return { criados, atualizados, total: grupos.size };
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
        mes: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const resultado = await calcularPercPago(
          input.rbm,
          input.situacao,
          input.chaveJ,
          input.empresa,
          input.parcela,
          input.descricao,
          input.juros,
          input.mes
        );
        return { percPago: resultado.perc, ativoUsado: resultado.ativoUsado };
      }),
  }),
  valoresCalculo: router({
    obter: publicProcedure.query(async () => {
      return await obterValoresCalculo();
    }),
    atualizar: publicProcedure
      .input(z.object({
        ativo01: z.string().optional(), ativo01De: z.string().optional(), ativo01Ate: z.string().optional(),
        ativo02: z.string().optional(), ativo02De: z.string().optional(), ativo02Ate: z.string().optional(),
        ativo03: z.string().optional(), ativo03De: z.string().optional(), ativo03Ate: z.string().optional(),
        ativo04: z.string().optional(), ativo04De: z.string().optional(), ativo04Ate: z.string().optional(),
        ativo05: z.string().optional(), ativo05De: z.string().optional(), ativo05Ate: z.string().optional(),
        ativo06: z.string().optional(), ativo06De: z.string().optional(), ativo06Ate: z.string().optional(),
        ativo07: z.string().optional(), ativo07De: z.string().optional(), ativo07Ate: z.string().optional(),
        ativo08: z.string().optional(), ativo08De: z.string().optional(), ativo08Ate: z.string().optional(),
        ativo09: z.string().optional(), ativo09De: z.string().optional(), ativo09Ate: z.string().optional(),
        ativo10: z.string().optional(), ativo10De: z.string().optional(), ativo10Ate: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const dados: Record<string, string | number | null> = {};
        const allCampos = [
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
        
        allCampos.forEach(campo => {
          const val = (input as any)[campo];
          if (val !== undefined) {
            if (val === '' || val === null) {
              dados[campo] = null;
            } else {
              const normalized = String(val).replace(',', '.');
              const num = parseFloat(normalized);
              dados[campo] = isNaN(num) ? null : num;
            }
          }
        });

        await atualizarValoresCalculo(dados as any);
        return { success: true };
      }),
  }),

  // ─── EXTRATO CONSIGNADO ────────────────────────────────────────────────────
  // Helper interno: extrai chaveJ do agente logado via openId (formato: agente_<id>)
  extratoConsignado: router({
    // Lista operações do mês anterior para a ChaveJ do usuário logado
    listar: protectedProcedure
      .input(z.object({
        chaveJ: z.string().optional(),
        mesAno: z.string().optional(), // formato MM/AAAA
      }))
      .query(async ({ input, ctx }) => {
        const { consignados } = await import('../drizzle/schema');
        const dbConn = await getDb();
        if (!dbConn) throw new Error('Database connection not available');
        const db = dbConn;
        const { and, eq, like } = await import('drizzle-orm');

        // Determinar mês de referência: mês anterior ao atual
        const agora = new Date();
        const mesAnterior = agora.getMonth() === 0 ? 12 : agora.getMonth();
        const anoRef = agora.getMonth() === 0 ? agora.getFullYear() - 1 : agora.getFullYear();
        const mesRef = input.mesAno ?? `${String(mesAnterior).padStart(2, '0')}/${anoRef}`;
        // Converter MM/AAAA para formato usado no banco: M26 ou MM26 (mes sem zero + 2 digitos do ano)
        const [mm, aaaa] = mesRef.split('/');
        const mesFormatado = `${mm}/${aaaa}`; // para exibição
        const anoShort = aaaa ? aaaa.slice(2) : String(anoRef).slice(2); // ex: '26'
        const mesBanco = `${parseInt(mm, 10)}${anoShort}`; // ex: '426' para 04/2026

        // ChaveJ: busca pelo openId do usuário logado (formato: agente_<id>)
        let chaveJLogado: string | null = null;
        if (ctx.user?.openId?.startsWith('agente_')) {
          const agenteId = parseInt(ctx.user.openId.replace('agente_', ''), 10);
          const { agentes: agentesTable } = await import('../drizzle/schema');
          const [agenteRow] = await db.select({ chaveJ: agentesTable.chaveJ }).from(agentesTable).where(eq(agentesTable.id, agenteId)).limit(1);
          chaveJLogado = agenteRow?.chaveJ ?? null;
        }
        const chaveJ = input.chaveJ ?? chaveJLogado;

        const conditions = [];
        if (chaveJ) conditions.push(like(consignados.chaveJ, `%${chaveJ}%`));
        if (mesBanco) conditions.push(eq(consignados.mes, mesBanco));

        const rows = await db
          .select({
            id: consignados.id,
            nomeAgente: consignados.nomeAgente,
            nrOperacao: consignados.nrOperacao,
            parcelas: consignados.parcela,
            convenio: consignados.convenio,
            juros: consignados.juros,
            valorLiquido: consignados.valorLiquido,
            percentual: consignados.percentual,
            comissao: consignados.comissao,
            chaveJ: consignados.chaveJ,
            mes: consignados.mes,
            empresa: consignados.empresa,
          })
          .from(consignados)
          .where(conditions.length ? and(...conditions) : undefined)
          .orderBy(consignados.nomeAgente);

        return {
          rows,
          mesRef: mesFormatado,
          chaveJ: chaveJ ?? '',
        };
      }),
  }),
  minhaTabela: router({
    // Retorna o total Liq. sem SRCC do mês atual + tabela de comissão + nível ativo do agente
    obter: protectedProcedure.query(async ({ ctx }) => {
      const dbConn = await getDb();
      if (!dbConn) throw new Error('Database connection not available');
      const db = dbConn;
      const { consignados, tabelasComissao, valoresCalculo: valCalc } = await import('../drizzle/schema');
      const { and, eq, like, sql } = await import('drizzle-orm');
      // ChaveJ, empresa e situacao do agente logado
      let chaveJLogado: string | null = null;
      let empresaAgente: string | null = null;
      let situacaoAgente: string | null = null;
      if (ctx.user?.openId?.startsWith('agente_')) {
        const agenteId = parseInt(ctx.user.openId.replace('agente_', ''), 10);
        const { agentes: agentesTable } = await import('../drizzle/schema');
        const [agenteRow] = await db.select({ chaveJ: agentesTable.chaveJ, nomeAgente: agentesTable.nomeAgente, empresa: agentesTable.empresa, situacao: agentesTable.situacao }).from(agentesTable).where(eq(agentesTable.id, agenteId)).limit(1);
        chaveJLogado = agenteRow?.chaveJ ?? null;
        empresaAgente = agenteRow?.empresa ?? null;
        situacaoAgente = agenteRow?.situacao ?? null;
      }
      // Mês atual no formato do banco (ex: '526' para 05/2026)
      const agora = new Date();
      const mesAtual = agora.getMonth() + 1;
      const anoAtual = agora.getFullYear();
      const anoShort = String(anoAtual).slice(2);
      const mesBanco = `${mesAtual}${anoShort}`;
      const mesRef = `${String(mesAtual).padStart(2, '0')}/${anoAtual}`;
      // Buscar total de troco do Febraban (apenas Contratadas) para o mês atual
      let totalLiquidoSemSRCC = 0;
      if (chaveJLogado) {
        const { febraban: febTable } = await import('../drizzle/schema');
        const mesanoNum = parseInt(`${mesAtual}${anoShort}`);
        const rows = await db
          .select({ troco: febTable.troco })
          .from(febTable)
          .where(and(
            like(febTable.operador, `%${chaveJLogado}%`),
            eq(febTable.mesano, mesanoNum),
            eq(febTable.situacao, 'Contratada')
          ));
        totalLiquidoSemSRCC = rows.reduce((s, r) => s + (parseFloat(String(r.troco ?? '0')) || 0), 0);
      }
      // Buscar valores de meta dos ativos
      const [valRow] = await db.select().from(valCalc).where(eq(valCalc.id, 1)).limit(1);
      const metas: Record<string, number> = {};
      if (valRow) {
        for (let i = 1; i <= 10; i++) {
          const key = `ativo${String(i).padStart(2, '0')}` as keyof typeof valRow;
          metas[key] = parseFloat(String(valRow[key] ?? '0')) || 0;
        }
      }
      // Determinar nível ativo:
      // 1. Usar o campo 'situacao' do cadastro do agente (ex: 'Ativo03' → 'ativo03')
      // 2. Fallback: calcular pela produção Febraban vs metas
      let nivelAtivo: string | null = null;
      const ativoKeys = ['ativo01','ativo02','ativo03','ativo04','ativo05','ativo06','ativo07','ativo08','ativo09','ativo10'];
      if (situacaoAgente) {
        // Converte 'Ativo03' → 'ativo03', 'Ativo3' → 'ativo03'
        const match = situacaoAgente.match(/[Aa]tivo\s*(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          const key = `ativo${String(num).padStart(2, '0')}`;
          if (ativoKeys.includes(key)) nivelAtivo = key;
        }
      }
      // Se não encontrou pelo cadastro, calcula pela produção
      if (!nivelAtivo) {
        for (let i = ativoKeys.length - 1; i >= 0; i--) {
          const meta = metas[ativoKeys[i]] ?? 0;
          if (meta > 0 && totalLiquidoSemSRCC >= meta) {
            nivelAtivo = ativoKeys[i];
            break;
          }
        }
      }
      // Buscar tabela de comissão: FLEX e BMF compartilham a mesma tabela (BMF)
      // Mapear empresa do agente para a empresa da tabela
      const empresaTabela = (empresaAgente === 'FLEX' || empresaAgente === 'BMF') ? 'BMF' : (empresaAgente ?? 'BMF');
      const tabela = await db.select().from(tabelasComissao).where(eq(tabelasComissao.empresa, empresaTabela));
      return {
        totalLiquidoSemSRCC,
        nivelAtivo,
        metas,
        tabela,
        mesRef,
        chaveJ: chaveJLogado ?? '',
        empresa: empresaAgente ?? '',
      };
    }),
  }),
  extratoCC: router({
    listar: protectedProcedure
      .input(z.object({
        chaveJ: z.string().optional(),
        mesAno: z.string().optional(),
      }))
      .query(async ({ input, ctx }) => {
        const { extratoContas } = await import('../drizzle/schema');
        const dbConn = await getDb();
        if (!dbConn) throw new Error('Database connection not available');
        const db = dbConn;
        const { and, eq, like } = await import('drizzle-orm');
        const agora = new Date();
        const mesAnterior = agora.getMonth() === 0 ? 12 : agora.getMonth();
        const anoRef = agora.getMonth() === 0 ? agora.getFullYear() - 1 : agora.getFullYear();
        const mesRef = input.mesAno ?? `${String(mesAnterior).padStart(2, '0')}/${anoRef}`;
        let chaveJLogado: string | null = null;
        if (ctx.user?.openId?.startsWith('agente_')) {
          const agenteId = parseInt(ctx.user.openId.replace('agente_', ''), 10);
          const { agentes: agentesTable } = await import('../drizzle/schema');
          const [agenteRow] = await db.select({ chaveJ: agentesTable.chaveJ }).from(agentesTable).where(eq(agentesTable.id, agenteId)).limit(1);
          chaveJLogado = agenteRow?.chaveJ ?? null;
        }
        const chaveJ = input.chaveJ ?? chaveJLogado;
        const conditions: any[] = [];
        if (chaveJ) conditions.push(like(extratoContas.chaveJ, `%${chaveJ}%`));
        if (mesRef) conditions.push(eq(extratoContas.mesAno, mesRef));
        const rows = await db
          .select()
          .from(extratoContas)
          .where(conditions.length ? and(...conditions) : undefined)
          .orderBy(extratoContas.nome);
        return { rows, mesRef, chaveJ: chaveJ ?? '' };
      }),
  }),

  extratoConsorcio: router({
    listar: protectedProcedure
      .input(z.object({
        chaveJ: z.string().optional(),
        mesAno: z.string().optional(),
      }))
      .query(async ({ input, ctx }) => {
        const { extratoConsorcios } = await import('../drizzle/schema');
        const dbConn = await getDb();
        if (!dbConn) throw new Error('Database connection not available');
        const db = dbConn;
        const { and, eq, like } = await import('drizzle-orm');
        const agora = new Date();
        const mesAnterior = agora.getMonth() === 0 ? 12 : agora.getMonth();
        const anoRef = agora.getMonth() === 0 ? agora.getFullYear() - 1 : agora.getFullYear();
        const mesRef = input.mesAno ?? `${String(mesAnterior).padStart(2, '0')}/${anoRef}`;
        let chaveJLogado: string | null = null;
        if (ctx.user?.openId?.startsWith('agente_')) {
          const agenteId = parseInt(ctx.user.openId.replace('agente_', ''), 10);
          const { agentes: agentesTable } = await import('../drizzle/schema');
          const [agenteRow] = await db.select({ chaveJ: agentesTable.chaveJ }).from(agentesTable).where(eq(agentesTable.id, agenteId)).limit(1);
          chaveJLogado = agenteRow?.chaveJ ?? null;
        }
        const chaveJ = input.chaveJ ?? chaveJLogado;
        const conditions: any[] = [];
        if (chaveJ) conditions.push(like(extratoConsorcios.chaveJ, `%${chaveJ}%`));
        if (mesRef) conditions.push(eq(extratoConsorcios.mesAno, mesRef));
        const rows = await db
          .select()
          .from(extratoConsorcios)
          .where(conditions.length ? and(...conditions) : undefined)
          .orderBy(extratoConsorcios.nome);
        return { rows, mesRef, chaveJ: chaveJ ?? '' };
      }),
  }),

  extratoOurocap: router({
    listar: protectedProcedure
      .input(z.object({
        chaveJ: z.string().optional(),
        mesAno: z.string().optional(),
      }))
      .query(async ({ input, ctx }) => {
        const { extratoOurocap } = await import('../drizzle/schema');
        const dbConn = await getDb();
        if (!dbConn) throw new Error('Database connection not available');
        const db = dbConn;
        const { and, eq, like } = await import('drizzle-orm');
        const agora = new Date();
        const mesAnterior = agora.getMonth() === 0 ? 12 : agora.getMonth();
        const anoRef = agora.getMonth() === 0 ? agora.getFullYear() - 1 : agora.getFullYear();
        const mesRef = input.mesAno ?? `${String(mesAnterior).padStart(2, '0')}/${anoRef}`;
        let chaveJLogado: string | null = null;
        if (ctx.user?.openId?.startsWith('agente_')) {
          const agenteId = parseInt(ctx.user.openId.replace('agente_', ''), 10);
          const { agentes: agentesTable } = await import('../drizzle/schema');
          const [agenteRow] = await db.select({ chaveJ: agentesTable.chaveJ }).from(agentesTable).where(eq(agentesTable.id, agenteId)).limit(1);
          chaveJLogado = agenteRow?.chaveJ ?? null;
        }
        const chaveJ = input.chaveJ ?? chaveJLogado;
        const conditions: any[] = [];
        if (chaveJ) conditions.push(like(extratoOurocap.chaveJ, `%${chaveJ}%`));
        if (mesRef) conditions.push(eq(extratoOurocap.mesAno, mesRef));
        const rows = await db
          .select()
          .from(extratoOurocap)
          .where(conditions.length ? and(...conditions) : undefined)
          .orderBy(extratoOurocap.nome);
        return { rows, mesRef, chaveJ: chaveJ ?? '' };
      }),
  }),
});
export type AppRouter = typeof appRouter;;