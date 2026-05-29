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

  const linhaCreditoRaw = campo(/Linha de crédito:\s*([^\n]+)/i);
  // Remove o texto após "Mês(Meses)" se vier na mesma linha
  const linhaCredito = linhaCreditoRaw?.replace(/\s*Mês\(Meses\).*$/i, '').trim() ?? null;

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

      let mailingMap: Map<string, { telefones: string[]; cidade: string | null }> = new Map();
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
          mailingMap.set(cpfLimpo, { telefones: tels, cidade: m.cidade ?? null });
        }
      }

      const resultado = rows.map(r => {
        const mailing = r.cpfCliente ? mailingMap.get(r.cpfCliente) : undefined;
        return {
          ...r,
          elegivelRefin: calcularElegibilidadeRefin(r.dataPrimeiraParcela),
          telefones: mailing?.telefones ?? [],
          cidade: mailing?.cidade ?? null,
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

      return {
        ...row,
        elegivelRefin: calcularElegibilidadeRefin(row.dataPrimeiraParcela),
        telefones,
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

      return { total, comErro, elegiveis, taxaMedia };
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
});
