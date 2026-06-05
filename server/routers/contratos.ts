import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { contratos, crm } from "../../drizzle/schema";
import { eq, desc, like, and, sql } from "drizzle-orm";
import { storagePut } from "../storage";
import { PDFParse } from 'pdf-parse';

// ─── Extração de dados do PDF ────────────────────────────────────────────────
function extrairDadosContrato(texto: string) {
  const num = (s: string | null | undefined): number | null => {
    if (!s) return null;
    const n = parseFloat(s.replace(/\./g, '').replace(',', '.'));
    return isNaN(n) ? null : n;
  };

  const campo = (regex: RegExp): string | null => {
    const m = texto.match(regex);
    return m ? (m[1]?.trim() ?? null) : null;
  };

  // Formato real: campos na mesma linha separados por espaço
  const numeroProposta = campo(/Número da proposta:\s*(\d+)/i);

  // Linha de crédito: no PDF com layout em colunas, o valor pode estar
  // na linha ANTERIOR ao label (coluna esquerda) e continuar na linha POSTERIOR (coluna direita)
  // Exemplo: "BB CRED CONSIG NÃO\nLinha de crédito: [espaços] Mês(Meses)...\n[espaços]CORRENTISTA"
  let linhaCredito: string | null = null;
  {
    const linhas = texto.split('\n');
    const idxLabel = linhas.findIndex(l => /Linha de crédito:/i.test(l));
    if (idxLabel >= 0) {
      // Parte 1: linha anterior ao label (texto antes do label na coluna esquerda)
      const linhaBefore = idxLabel > 0 ? linhas[idxLabel - 1].trim() : '';
      // Parte 2: linha posterior ao label (continuação na coluna direita)
      const linhaAfter = idxLabel < linhas.length - 1 ? linhas[idxLabel + 1].trim() : '';
      // Parte 3: mesmo label pode ter valor na mesma linha (formato simples)
      const mesmLinha = linhas[idxLabel].replace(/Linha de crédito:/i, '').replace(/Mês\(Meses\).*/i, '').trim();
      // Montar: prioriza parte antes + depois; se não houver, usa mesma linha
      const partes: string[] = [];
      if (linhaBefore && !/^\d+$/.test(linhaBefore) && !/Proposta|CPF|Operador|Chave|Correspondente|Loja|Agência|Conta/i.test(linhaBefore)) {
        partes.push(linhaBefore);
      }
      if (mesmLinha) partes.push(mesmLinha);
      if (linhaAfter && !/^\d+$/.test(linhaAfter) && !/Valor|Taxa|Prazo|IOF|Parcela|Data|Quantidade|Mês/i.test(linhaAfter)) {
        partes.push(linhaAfter);
      }
      const combined = partes.join(' ').trim();
      linhaCredito = combined || null;
    }
  }

  const taxaMensalStr = campo(/Taxa Mensal de Juros\s*\(%\):\s*([\d,]+)%?/i);
  const taxaMensalJuros = num(taxaMensalStr);

  const prazoStr = campo(/Prazo em Meses:\s*(\d+)/i);
  const prazoMeses = prazoStr ? parseInt(prazoStr) : null;

  const valorSolicitado = num(campo(/Valor solicitado\s+([\d.,]+)/i));
  const valorTotalEmprestimo = num(campo(/Valor Total do Empréstimo:\s*([\d.,]+)/i));
  const valorParcela = num(campo(/Valor Parcela\s+([\d.,]+)/i));
  const valorTotalParcelas = num(campo(/Valor Total das Parcelas:\s*([\d.,]+)/i));

  // Nome do cliente — linha após "Nome"
  const nomeCliente = campo(/\bNome\b\s*\n([A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇÀÈÌÒÙÄËÏÖÜ][^\n]+)/i);

  // CPF do cliente — linha após "CPF" (antes do Nome)
  const cpfRaw = campo(/\bCPF\b\s*\n([\d.,]+)/i);
  const cpfCliente = cpfRaw ? cpfRaw.replace(/[^\d]/g, '') : null;

  // Convênio
  const nomeConvenio = campo(/Nome do convênio\s*\n([^\n]+)/i);
  const nrConvenio = campo(/Número do Convênio\s*\n(\d+)/i);

  // Data do contrato (data de emissão/assinatura)
  const dataContrato = campo(/Data de Emiss[aã]o:\s*([\d./]+)/i)
    ?? campo(/Data do Contrato:\s*([\d./]+)/i)
    ?? campo(/Data:\s*([\d]{2}[./][\d]{2}[./][\d]{4})/i)
    ?? campo(/Emitido em:\s*([\d./]+)/i);

  // Datas das parcelas
  const dataPrimeiraParcela = campo(/Data do Débito da Primeira Parcela:\s*([\d.]+)/i);
  const dataUltimaParcela = campo(/Data do Débito Da Última Parcela:\s*([\d.]+)/i);

  // Operador
  const nomeOperador = campo(/\bOperador\b\s*\n([A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇÀÈÌÒÙÄËÏÖÜ][^\n]+)/i);
  const chaveJOperador = campo(/\bChave\b\s*\n([A-Z]\d+)/i);

  // Agência e Conta do cliente (seção 2 - Dados do Cliente)
  // Aceita variações de codificação do acento: Agência, Agencia, Agência
  const agencia = campo(/Ag[eêéè]ncia\s*\n\s*([\d]+)/i);
  const conta = campo(/\bConta\b\s*\n\s*([\d.\-]+)/i);
  // Nome do correspondente: fica na linha logo após "Correspondente"
  // Estrutura real (pdf-parse): Correspondente -> BRASIL MAIS FORTE LTDA -> Loja -> MAISBB...
  let empresa: string | null = null;
  {
    const linhas = texto.split('\n');
    const idxCorr = linhas.findIndex(l => l.trim() === 'Correspondente');
    if (idxCorr >= 0) {
      for (let j = idxCorr + 1; j < linhas.length; j++) {
        const val = linhas[j].trim();
        if (val && val !== 'Loja') {
          empresa = val;
          break;
        }
      }
    }
  }

  return {
    numeroProposta,
    linhaCredito: linhaCredito?.trim() ?? null,
    taxaMensalJuros,
    prazoMeses,
    valorSolicitado,
    valorTotalEmprestimo,
    valorParcela,
    valorTotalParcelas,
    nomeCliente: nomeCliente?.trim() ?? null,
    cpfCliente,
    nrConvenio,
    nomeConvenio: nomeConvenio?.trim() ?? null,
    dataContrato: dataContrato?.trim() ?? null,
    dataPrimeiraParcela,
    dataUltimaParcela,
    chaveJOperador,
    nomeOperador: nomeOperador?.trim() ?? null,
    empresa: empresa?.trim() ?? null,
    agencia: agencia?.trim() ?? null,
    conta: conta?.trim() ?? null,
  };
}

// ─── Elegível para refinanciamento (> 1 ano da primeira parcela) ─────────────
function calcularElegibilidadeRefin(dataPrimeiraParcela: string | null): boolean {
  if (!dataPrimeiraParcela) return false;
  const partes = dataPrimeiraParcela.split(/[./]/);
  if (partes.length < 3) return false;
  const [dia, mes, ano] = partes.map(Number);
  if (!dia || !mes || !ano) return false;
  const dataParcela = new Date(ano, mes - 1, dia);
  const umAnoAtras = new Date();
  umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);
  return dataParcela <= umAnoAtras;
}

// ─── Formata telefones do mailing ─────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatarTelefones(row: any): string[] {
  const tels: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const idx = String(i).padStart(2, '0');
    const ddd = row[`ddd${idx}`];
    const tel = row[`tel${idx}`];
    if (ddd && tel) tels.push(`(${ddd}) ${tel}`);
    else if (tel) tels.push(tel);
  }
  return tels;
}

export const contratosRouter = router({
  // Upload de um contrato PDF e extração automática dos dados
  upload: protectedProcedure
    .input(z.object({
      fileBase64: z.string(),
      nomeArquivo: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Banco de dados indisponível');
      const buffer = Buffer.from(input.fileBase64, 'base64');

      // Upload para S3
      const fileKey = `contratos/${Date.now()}_${input.nomeArquivo.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { key, url } = await storagePut(fileKey, buffer, 'application/pdf');

      // Extrair texto do PDF
      let dados: ReturnType<typeof extrairDadosContrato> | null = null;
      let statusExtracao = 'ok';
      let erroExtracao: string | null = null;

      try {
        const uint8 = new Uint8Array(buffer);
        const parser = new PDFParse(uint8);
        const parsed = await parser.getText();
        dados = extrairDadosContrato(parsed.text);
      } catch (e: unknown) {
        statusExtracao = 'erro';
        erroExtracao = e instanceof Error ? e.message : 'Erro ao processar PDF';
      }

      // Salvar no banco
      await db.insert(contratos).values({
        fileKey: key,
        fileUrl: url,
        nomeArquivo: input.nomeArquivo,
        statusExtracao,
        erroExtracao,
        uploadPorId: ctx.user.id,
        numeroProposta: dados?.numeroProposta ?? null,
        linhaCredito: dados?.linhaCredito ?? null,
        taxaMensalJuros: dados?.taxaMensalJuros != null ? String(dados.taxaMensalJuros) : null,
        prazoMeses: dados?.prazoMeses ?? null,
        valorSolicitado: dados?.valorSolicitado != null ? String(dados.valorSolicitado) : null,
        valorTotalEmprestimo: dados?.valorTotalEmprestimo != null ? String(dados.valorTotalEmprestimo) : null,
        valorParcela: dados?.valorParcela != null ? String(dados.valorParcela) : null,
        valorTotalParcelas: dados?.valorTotalParcelas != null ? String(dados.valorTotalParcelas) : null,
        nomeCliente: dados?.nomeCliente ?? null,
        cpfCliente: dados?.cpfCliente ?? null,
        nrConvenio: dados?.nrConvenio ?? null,
        nomeConvenio: dados?.nomeConvenio ?? null,
        dataContrato: dados?.dataContrato ?? null,
        dataPrimeiraParcela: dados?.dataPrimeiraParcela ?? null,
        dataUltimaParcela: dados?.dataUltimaParcela ?? null,
        chaveJOperador: dados?.chaveJOperador ?? null,
        nomeOperador: dados?.nomeOperador ?? null,
        empresa: dados?.empresa ?? null,
        agencia: dados?.agencia ?? null,
        conta: dados?.conta ?? null,
      });

      return { status: statusExtracao, dados };
    }),

  // Upload em lote: processa múltiplos PDFs em paralelo (até 50 por vez)
  uploadLote: protectedProcedure
    .input(z.object({
      arquivos: z.array(z.object({
        fileBase64: z.string(),
        nomeArquivo: z.string(),
      })).max(50),
      substituirDuplicatas: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Banco de dados indisponível');

      let duplicatas = 0;
      const resultados = await Promise.allSettled(
        input.arquivos.map(async (arq) => {
          const buffer = Buffer.from(arq.fileBase64, 'base64');

          // Extrair dados primeiro para verificar duplicata
          let dados: ReturnType<typeof extrairDadosContrato> | null = null;
          let statusExtracao = 'ok';
          let erroExtracao: string | null = null;

          try {
            const uint8 = new Uint8Array(buffer);
            const parser = new PDFParse(uint8);
            const parsed = await parser.getText();
            dados = extrairDadosContrato(parsed.text);
          } catch (e: unknown) {
            statusExtracao = 'erro';
            erroExtracao = e instanceof Error ? e.message : 'Erro ao processar PDF';
          }

          // Regras de duplicata:
          // - Mesmo CPF + mesma linha + mesma proposta = duplicata (substitui se solicitado)
          // - Mesmo CPF + mesma linha + proposta diferente = bloqueia (contrato diferente, não entra)
          // - Mesmo CPF + linha diferente = permite (produto diferente)
          if (dados?.cpfCliente && dados?.linhaCredito) {
            const [existente] = await db
              .select({ id: contratos.id, numeroProposta: contratos.numeroProposta })
              .from(contratos)
              .where(
                and(
                  eq(contratos.cpfCliente, dados.cpfCliente),
                  eq(contratos.linhaCredito, dados.linhaCredito)
                )
              )
              .limit(1);

            if (existente) {
              const mesmaPropoosta = existente.numeroProposta === dados.numeroProposta;
              if (mesmaPropoosta) {
                // Duplicata exata: substitui se solicitado, senão ignora
                if (!input.substituirDuplicatas) {
                  duplicatas++;
                  return { nome: arq.nomeArquivo, status: 'duplicata' };
                }
                await db.delete(contratos).where(eq(contratos.id, existente.id));
              } else {
                // Mesmo CPF + mesma linha mas proposta diferente: bloqueia sempre
                duplicatas++;
                return { nome: arq.nomeArquivo, status: 'duplicata' };
              }
            }
          }

          const fileKey = `contratos/${Date.now()}_${Math.random().toString(36).slice(2)}_${arq.nomeArquivo.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
          const { key, url } = await storagePut(fileKey, buffer, 'application/pdf');

          await db.insert(contratos).values({
            fileKey: key,
            fileUrl: url,
            nomeArquivo: arq.nomeArquivo,
            statusExtracao,
            erroExtracao,
            uploadPorId: ctx.user.id,
            numeroProposta: dados?.numeroProposta ?? null,
            linhaCredito: dados?.linhaCredito ?? null,
            taxaMensalJuros: dados?.taxaMensalJuros != null ? String(dados.taxaMensalJuros) : null,
            prazoMeses: dados?.prazoMeses ?? null,
            valorSolicitado: dados?.valorSolicitado != null ? String(dados.valorSolicitado) : null,
            valorTotalEmprestimo: dados?.valorTotalEmprestimo != null ? String(dados.valorTotalEmprestimo) : null,
            valorParcela: dados?.valorParcela != null ? String(dados.valorParcela) : null,
            valorTotalParcelas: dados?.valorTotalParcelas != null ? String(dados.valorTotalParcelas) : null,
            nomeCliente: dados?.nomeCliente ?? null,
            cpfCliente: dados?.cpfCliente ?? null,
            nrConvenio: dados?.nrConvenio ?? null,
            nomeConvenio: dados?.nomeConvenio ?? null,
            dataContrato: dados?.dataContrato ?? null,
            dataPrimeiraParcela: dados?.dataPrimeiraParcela ?? null,
            dataUltimaParcela: dados?.dataUltimaParcela ?? null,
            chaveJOperador: dados?.chaveJOperador ?? null,
            nomeOperador: dados?.nomeOperador ?? null,
            empresa: dados?.empresa ?? null,
            agencia: dados?.agencia ?? null,
            conta: dados?.conta ?? null,
          });
          return { nome: arq.nomeArquivo, status: statusExtracao };
        })
      );

      const ok = resultados.filter(r => r.status === 'fulfilled' && (r.value as {status:string}).status !== 'duplicata').length;
      const erros = resultados.filter(r => r.status === 'rejected').length;
      return { ok, erros, duplicatas, total: input.arquivos.length };
    }),

  // Listar contratos com cruzamento de mailing
  listar: protectedProcedure
    .input(z.object({
      chaveJ: z.string().optional(),
      nomeCliente: z.string().optional(),
      numeroProposta: z.string().optional(),
      nomeOperador: z.string().optional(),
      empresa: z.string().optional(),
      linhaCredito: z.string().optional(),
      cidade: z.string().optional(),
      apenasElegiveis: z.boolean().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Banco de dados indisponível');
      const offset = (input.page - 1) * input.pageSize;

      const rows = await db
        .select()
        .from(contratos)
        .where(
          and(
            input.chaveJ ? eq(contratos.chaveJOperador, input.chaveJ) : undefined,
            input.nomeCliente ? like(contratos.nomeCliente, `%${input.nomeCliente}%`) : undefined,
            input.numeroProposta ? like(contratos.numeroProposta, `%${input.numeroProposta}%`) : undefined,
            input.nomeOperador ? like(contratos.nomeOperador, `%${input.nomeOperador}%`) : undefined,
            input.empresa ? like(contratos.empresa, `%${input.empresa}%`) : undefined,
            input.linhaCredito ? like(contratos.linhaCredito, `%${input.linhaCredito}%`) : undefined,
          )
        )
        .orderBy(desc(contratos.createdAt))
        .limit(input.pageSize)
        .offset(offset);

      // Cruzar com mailing pelo CPF
      const cpfs = rows
        .map(r => r.cpfCliente)
        .filter((c): c is string => !!c && c.length >= 11);

            let mailingMap: Map<string, { telefones: string[]; cidade: string | null; dtaNasc: string | null }> = new Map();
      if (cpfs.length > 0) {
        // Buscar em lotes de 100
        const lote = cpfs.slice(0, 200);
        const mailingRows = await db
          .select()
          .from(crm)
          .where(sql`cpf IN (${sql.join(lote.map(c => sql`${c}`), sql`, `)})`);
        for (const m of mailingRows) {
          if (!m.cpf) continue;
          const cpfLimpo = m.cpf.replace(/[^\d]/g, '');
          const tels = formatarTelefones(m as unknown as Record<string, unknown>);
          mailingMap.set(cpfLimpo, { telefones: tels, cidade: m.cidade ?? null, dtaNasc: m.dtaNasc ?? null });
        }
      }

      const resultado = rows.map(r => {
        const mailing = r.cpfCliente ? mailingMap.get(r.cpfCliente) : undefined;
        // Combinar telefones do mailing com telefones manuais (sem duplicatas)
        const telsMailing = mailing?.telefones ?? [];
        const telsManuais = r.telefoneManuais
          ? r.telefoneManuais.split(',').map((t: string) => t.trim()).filter(Boolean)
          : [];
        const todosTs = [...telsMailing, ...telsManuais.filter((t: string) => !telsMailing.includes(t))];
        return {
          ...r,
          elegivelRefin: calcularElegibilidadeRefin(r.dataPrimeiraParcela),
          telefones: todosTs,
          cidade: mailing?.cidade ?? null,
          dtaNasc: mailing?.dtaNasc ?? null,
        };
      });

      let filtrados = input.apenasElegiveis
        ? resultado.filter(r => r.elegivelRefin)
        : resultado;

      // Filtro por cidade (vem do mailing, após cruzamento)
      if (input.cidade) {
        const cidadeLower = input.cidade.toLowerCase();
        filtrados = filtrados.filter(r =>
          r.cidade?.toLowerCase().includes(cidadeLower)
        );
      }

      return { rows: filtrados, total: filtrados.length };
    }),

  // Buscar contrato por ID com telefones do mailing
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Banco de dados indisponível');
      const [row] = await db.select().from(contratos).where(eq(contratos.id, input.id));
      if (!row) throw new Error('Contrato não encontrado');

      let telefones: string[] = [];
      if (row.cpfCliente) {
        const [mailingRow] = await db
          .select()
          .from(crm)
          .where(sql`REPLACE(cpf, '.', '') = ${row.cpfCliente}`)
          .limit(1);
        if (mailingRow) {
          telefones = formatarTelefones(mailingRow as unknown as Record<string, unknown>);
        }
      }

      // Combinar com telefones manuais
      const telsManuais = row.telefoneManuais
        ? row.telefoneManuais.split(',').map((t: string) => t.trim()).filter(Boolean)
        : [];
      const todosTs = [...telefones, ...telsManuais.filter((t: string) => !telefones.includes(t))];

      return {
        ...row,
        elegivelRefin: calcularElegibilidadeRefin(row.dataPrimeiraParcela),
        telefones: todosTs,
      };
    }),

  // Estatísticas do relatório
  estatisticas: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error('Banco de dados indisponível');
      const rows = await db.select().from(contratos).orderBy(desc(contratos.createdAt));

      const total = rows.length;
      const comErro = rows.filter(r => r.statusExtracao === 'erro').length;
      const elegiveis = rows.filter(r => calcularElegibilidadeRefin(r.dataPrimeiraParcela)).length;
      const comTaxa = rows.filter(r => r.taxaMensalJuros != null);
      const taxaMedia = comTaxa.length > 0
        ? comTaxa.reduce((acc, r) => acc + parseFloat(String(r.taxaMensalJuros ?? 0)), 0) / comTaxa.length
        : 0;

      // Contatos realizados: registros com anotacaoCrm preenchida
      const comContato = rows.filter(r => r.anotacaoCrm && r.anotacaoCrm.trim() !== '');
      const totalContatos = comContato.length;
      // Agrupar por operador
      const porOperador: Record<string, number> = {};
      for (const r of comContato) {
        const op = r.nomeOperador || r.chaveJOperador || 'Desconhecido';
        porOperador[op] = (porOperador[op] ?? 0) + 1;
      }
      const contatosPorOperador = Object.entries(porOperador)
        .map(([nome, qtd]) => ({ nome, qtd }))
        .sort((a, b) => b.qtd - a.qtd);

      return { total, comErro, elegiveis, taxaMedia, totalContatos, contatosPorOperador };
    }),

  // Atualizar anotação CRM e data do contato (CRM Refinanciamento)
  atualizarCrm: protectedProcedure
    .input(z.object({
      id: z.number(),
      anotacaoCrm: z.string().nullable().optional(),
      dataContatoCrm: z.string().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Banco de dados indisponível');
      const { id, ...campos } = input;
      await db.update(contratos).set(campos).where(eq(contratos.id, id));
      return { ok: true };
    }),

  // Atualizar campos de um contrato (correção manual)
  atualizar: protectedProcedure
    .input(z.object({
      id: z.number(),
      empresa: z.string().optional(),
      nomeCliente: z.string().optional(),
      nomeConvenio: z.string().optional(),
      nomeOperador: z.string().optional(),
      chaveJOperador: z.string().optional(),
      dataPrimeiraParcela: z.string().optional(),
      dataUltimaParcela: z.string().optional(),
      telefoneManuais: z.string().optional(), // telefones separados por vírgula
      situacao: z.string().optional(),        // Contratada | Cancelada | Pendente
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Banco de dados indisponível');
      const { id, ...campos } = input;
      await db.update(contratos).set(campos).where(eq(contratos.id, id));
      return { ok: true };
    }),

  // Deletar contrato — requer senha CEO
  deletar: protectedProcedure
    .input(z.object({ id: z.number(), senhaCeo: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Banco de dados indisponível');

      // Verificar se o usuário é CEO/admin
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas o CEO pode excluir contratos.' });
      }

      // Verificar senha do CEO contra a senha de login
      const { agentes } = await import('../../drizzle/schema');
      const agenteId = parseInt(ctx.user.openId.replace('agente_', ''), 10);
      const [agente] = await db
        .select({ senha: agentes.senha })
        .from(agentes)
        .where(eq(agentes.id, agenteId))
        .limit(1);

      if (!agente) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Agente não encontrado.' });
      }

      if (agente.senha !== input.senhaCeo) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Senha incorreta.' });
      }

      await db.delete(contratos).where(eq(contratos.id, input.id));
      return { ok: true };
    }),

  // Salvar telefone na Perspectiva de Ganho (com validação anti-duplicata por CPF)
  salvarTelefone: protectedProcedure
    .input(z.object({
      contratoId: z.number(),
      telefone: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Banco de dados indisponível');

      // Normalizar telefone (apenas dígitos)
      const telNorm = input.telefone.replace(/\D/g, '');
      if (telNorm.length < 8) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Telefone inválido.' });

      // Buscar o contrato atual para obter o CPF
      const [contratoAtual] = await db
        .select({ id: contratos.id, cpfCliente: contratos.cpfCliente, telefoneManuais: contratos.telefoneManuais })
        .from(contratos)
        .where(eq(contratos.id, input.contratoId))
        .limit(1);

      if (!contratoAtual) throw new TRPCError({ code: 'NOT_FOUND', message: 'Contrato não encontrado.' });

      const cpfAtual = contratoAtual.cpfCliente?.replace(/\D/g, '') || '';

      // Verificar se o telefone já está em uso em outro CPF
      if (telNorm) {
        const todosContratos = await db
          .select({ id: contratos.id, cpfCliente: contratos.cpfCliente, telefoneManuais: contratos.telefoneManuais })
          .from(contratos)
          .where(sql`${contratos.telefoneManuais} IS NOT NULL AND ${contratos.telefoneManuais} != ''`);

        for (const c of todosContratos) {
          if (c.id === input.contratoId) continue;
          const cpfOutro = c.cpfCliente?.replace(/\D/g, '') || '';
          if (cpfOutro === cpfAtual) continue; // mesmo CPF: permitido
          const tels = (c.telefoneManuais || '').split(',').map(t => t.replace(/\D/g, '').trim()).filter(Boolean);
          if (tels.includes(telNorm)) {
            throw new TRPCError({ code: 'CONFLICT', message: 'Este telefone já está cadastrado para outro cliente.' });
          }
        }
      }

      // Adicionar telefone à lista (evitar duplicata no mesmo contrato)
      const telsAtuais = (contratoAtual.telefoneManuais || '').split(',').map(t => t.trim()).filter(Boolean);
      if (!telsAtuais.includes(input.telefone)) {
        telsAtuais.push(input.telefone);
      }

      await db
        .update(contratos)
        .set({ telefoneManuais: telsAtuais.join(',') })
        .where(eq(contratos.id, input.contratoId));

      return { ok: true, telefones: telsAtuais };
    }),
});
