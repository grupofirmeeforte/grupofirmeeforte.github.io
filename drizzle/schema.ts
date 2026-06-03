import {
  int, 
  mysqlEnum, 
  mysqlTable, 
  text, 
  timestamp, 
  varchar,
  decimal,
  date,
  boolean,
  tinyint,
  index,
  bigint
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  lgpdAceito: boolean("lgpdAceito").default(false).notNull(),
  lgpdAceitoEm: timestamp("lgpdAceitoEm"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================================================
// TABELAS DO SISTEMA GRUPO FIRME E FORTE
// ============================================================================

/**
 * Tabela de Agentes
 * Armazena informações de todos os agentes do sistema
 */
export const agentes = mysqlTable('agentes', {
  id: int("id").autoincrement().primaryKey(),
  numCadastro: varchar("numCadastro", { length: 50 }).unique(),
  empresa: varchar("empresa", { length: 100 }),
  chaveJ: varchar("chaveJ", { length: 50 }).unique(),
  senha: varchar("senha", { length: 255 }),
  nomeAgente: varchar("nomeAgente", { length: 255 }).notNull(),
  dataAdmissao: varchar("dataAdmissao", { length: 10 }), // YYYY-MM-DD format
  cargo: varchar("cargo", { length: 100 }),
  area: varchar("area", { length: 100 }),
  vinculo: varchar("vinculo", { length: 100 }),
  situacao: varchar("situacao", { length: 50 }),
  nivel: varchar("nivel", { length: 10 }),
  nrAgencia: varchar("nrAgencia", { length: 50 }),
  cidade: varchar("cidade", { length: 100 }),
  uf: varchar("uf", { length: 2 }),
  supervisor: varchar("supervisor", { length: 255 }),
  email: varchar("email", { length: 255 }),
  favorecido: varchar("favorecido", { length: 255 }),
  favProprio: boolean("favProprio").default(false),
  banco: varchar("banco", { length: 100 }),
  agencia: varchar("agencia", { length: 50 }),
  conta: varchar("conta", { length: 50 }),
  tipo: varchar("tipo", { length: 50 }),
  cpfAgente: varchar("cpfAgente", { length: 14 }),
  pix: varchar("pix", { length: 255 }),
  dataNascimento: varchar("dataNascimento", { length: 10 }), // YYYY-MM-DD format
  celular: varchar("celular", { length: 20 }),
  pinAcesso: varchar("pinAcesso", { length: 10 }),   // PIN de 4-6 dígitos para acesso rápido
  faceToken: varchar("faceToken", { length: 100 }),              // Token do rosto no Face++
  faceFacesetToken: varchar("faceFacesetToken", { length: 100 }), // FaceSet token no Face++
  permissoes: varchar("permissoes", { length: 50 }).default("leitor"), // admin, editor, leitor, sem_acesso
  permissoesModulos: text("permissoesModulos"), // JSON com permissoes por sub-aba: {modulo: {subaba: nivel}}
  signo: varchar("signo", { length: 20 }), // signo zodiacal para horóscopo diário
  cep: varchar("cep", { length: 10 }),
  endereco: varchar("endereco", { length: 255 }),
  numero: varchar("numero", { length: 20 }),
  complemento: varchar("complemento", { length: 100 }),
  bairro: varchar("bairro", { length: 100 }),
  rg: varchar("rg", { length: 30 }),
  estadoCivil: varchar("estadoCivil", { length: 30 }),
  nacionalidade: varchar("nacionalidade", { length: 50 }).default('brasileiro(a)'),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  chaveJIdx: index("idx_agentes_chaveJ").on(table.chaveJ),
  cpfIdx: index("idx_agentes_cpf").on(table.cpfAgente),
  empresaIdx: index("idx_agentes_empresa").on(table.empresa),
}));

export type Agente = typeof agentes.$inferSelect;
export type InsertAgente = typeof agentes.$inferInsert;

/**
 * Tabela de Certificações
 * Controla certificações dos agentes
 */
export const certificacoes = mysqlTable("certificacoes", {
  id: int("id").autoincrement().primaryKey(),
  agenteId: int("agenteId"),
  empresa: varchar("empresa", { length: 100 }),
  cadastro: varchar("cadastro", { length: 50 }),
  chaveJ: varchar("chaveJ", { length: 50 }),
  nomeAgente: varchar("nomeAgente", { length: 255 }),
  cpf: varchar("cpf", { length: 20 }),
  situacao: varchar("situacao", { length: 100 }),
  dataCertif: varchar("dataCertif", { length: 10 }),
  ventoCertif: varchar("ventoCertif", { length: 10 }),
  diasFaltando: int("diasFaltando"),
  situacaoCertif: varchar("situacaoCertif", { length: 50 }),
  nrCertificadoConsig: varchar("nrCertificadoConsig", { length: 100 }),
  dataCertif2: varchar("dataCertif2", { length: 10 }),
  ventoCertif3: varchar("ventoCertif3", { length: 10 }),
  diasFaltando2: int("diasFaltando2"),
  situacaoCertif3: varchar("situacaoCertif3", { length: 50 }),
  nrCertificadoPldft: varchar("nrCertificadoPldft", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Certificacao = typeof certificacoes.$inferSelect;
export type InsertCertificacao = typeof certificacoes.$inferInsert;

/**
 * Tabela de Fornecedores
 */
export const fornecedores = mysqlTable("fornecedores", {
  id: int("id").autoincrement().primaryKey(),
  numCadastro: varchar("numCadastro", { length: 50 }).unique(),
  empresa: varchar("empresa", { length: 100 }),
  nomeFornecedor: varchar("nomeFornecedor", { length: 255 }).notNull(),
  cpfCnpj: varchar("cpfCnpj", { length: 18 }).unique(),
  situacao: varchar('situacao', { length: 50 }),
  contato: varchar("contato", { length: 255 }),
  email: varchar("email", { length: 255 }),
  telefone: varchar("telefone", { length: 20 }),
  celular: varchar("celular", { length: 20 }),
  endereco: varchar("endereco", { length: 255 }),
  cidade: varchar("cidade", { length: 100 }),
  uf: varchar("uf", { length: 2 }),
  observacoes: text("observacoes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Fornecedor = typeof fornecedores.$inferSelect;
export type InsertFornecedor = typeof fornecedores.$inferInsert;

/**
 * Tabela de Despesas Fixas
 */
export const despesasFixas = mysqlTable("despesasFixas", {
  id: int("id").autoincrement().primaryKey(),
  mesAno: varchar("mesAno", { length: 20 }),
  tipoPagto: varchar("tipoPagto", { length: 100 }),
  cidadeUF: varchar("cidadeUF", { length: 150 }),
  empresa: varchar("empresa", { length: 100 }),
  chaveResp: varchar("chaveResp", { length: 50 }),
  nome: varchar("nome", { length: 255 }),
  banco: varchar("banco", { length: 100 }),
  agencia: varchar("agencia", { length: 20 }),
  conta: varchar("conta", { length: 30 }),
  cpfCnpj: varchar("cpfCnpj", { length: 20 }),
  tipoConta: varchar("tipoConta", { length: 50 }),
  pix: varchar("pix", { length: 255 }),
  valor: decimal("valor", { precision: 15, scale: 2 }),
  pago: boolean("pago").default(false),
  dataPagto: varchar("dataPagto", { length: 20 }),
  dataVencer: varchar("dataVencer", { length: 20 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type DespesaFixa = typeof despesasFixas.$inferSelect;
export type InsertDespesaFixa = typeof despesasFixas.$inferInsert;

/**
 * Tabela de Tabelas de Comissão
 * Define as faixas e percentuais de comissão
 */
export const tabelasComissao = mysqlTable("tabelasComissao", {
  id: int("id").autoincrement().primaryKey(),
  empresa: varchar("empresa", { length: 100 }),
  codigo: varchar("codigo", { length: 24 }),
  faixa1: varchar("faixa1", { length: 20 }),
  faixa2: varchar("faixa2", { length: 20 }),
  faixa3: varchar("faixa3", { length: 20 }),
  faixa4: varchar("faixa4", { length: 20 }),
  faixa5: varchar("faixa5", { length: 20 }),
  tabelaCalculo: varchar("tabelaCalculo", { length: 20 }),
  referencia: varchar("referencia", { length: 20 }),
  convenio: varchar("convenio", { length: 150 }),
  txJurosDe: varchar("txJurosDe", { length: 20 }),
  txJurosAte: varchar("txJurosAte", { length: 20 }),
  valorMinimo: varchar("valorMinimo", { length: 50 }),
  mesesDe: varchar("mesesDe", { length: 10 }),
  mesesAte: varchar("mesesAte", { length: 10 }),
  ativo01: varchar("ativo01", { length: 20 }),
  ativo01De: varchar("ativo01De", { length: 20 }),
  ativo01Ate: varchar("ativo01Ate", { length: 20 }),
  ativo02: varchar("ativo02", { length: 20 }),
  ativo02De: varchar("ativo02De", { length: 20 }),
  ativo02Ate: varchar("ativo02Ate", { length: 20 }),
  ativo03: varchar("ativo03", { length: 20 }),
  ativo03De: varchar("ativo03De", { length: 20 }),
  ativo03Ate: varchar("ativo03Ate", { length: 20 }),
  ativo04: varchar("ativo04", { length: 20 }),
  ativo04De: varchar("ativo04De", { length: 20 }),
  ativo04Ate: varchar("ativo04Ate", { length: 20 }),
  ativo05: varchar("ativo05", { length: 20 }),
  ativo05De: varchar("ativo05De", { length: 20 }),
  ativo05Ate: varchar("ativo05Ate", { length: 20 }),
  ativo06: varchar("ativo06", { length: 20 }),
  ativo06De: varchar("ativo06De", { length: 20 }),
  ativo06Ate: varchar("ativo06Ate", { length: 20 }),
  ativo07: varchar("ativo07", { length: 20 }),
  ativo07De: varchar("ativo07De", { length: 20 }),
  ativo07Ate: varchar("ativo07Ate", { length: 20 }),
  ativo08: varchar("ativo08", { length: 20 }),
  ativo08De: varchar("ativo08De", { length: 20 }),
  ativo08Ate: varchar("ativo08Ate", { length: 20 }),
  ativo09: varchar("ativo09", { length: 20 }),
  ativo09De: varchar("ativo09De", { length: 20 }),
  ativo09Ate: varchar("ativo09Ate", { length: 20 }),
  ativo10: varchar("ativo10", { length: 20 }),
  ativo10De: varchar("ativo10De", { length: 20 }),
  ativo10Ate: varchar("ativo10Ate", { length: 20 }),
  // Campos exclusivos CEO: quanto recebo e quanto pago (apenas visualização, não entra em cálculo)
  receboPct: varchar("receboPct", { length: 20 }),
  pagoPct: varchar("pagoPct", { length: 20 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TabelaComissao = typeof tabelasComissao.$inferSelect;
export type InsertTabelaComissao = typeof tabelasComissao.$inferInsert;

/**
 * Tabela de Consignados (Operações)
 */
export const consignados = mysqlTable("consignados", {
  id: int("id").autoincrement().primaryKey(),
  // Colunas de importação
  empresa: varchar("empresa", { length: 100 }),
  mes: varchar("mes", { length: 10 }),
  chaveJ: varchar("chaveJ", { length: 50 }),
  nomeAgente: varchar("nomeAgente", { length: 255 }),
  convenio: varchar("convenio", { length: 100 }),
  nrOperacao: varchar("nrOperacao", { length: 100 }),
  valorBruto: decimal("valorBruto", { precision: 15, scale: 2 }),
  valorLiquido: decimal("valorLiquido", { precision: 15, scale: 2 }),
  rbm: decimal("rbm", { precision: 15, scale: 2 }),
  parcela: int("parcela"),
  prefixoBB: varchar("prefixoBB", { length: 20 }),
  dtContratacao: date("dtContratacao"),
  produto: varchar("produto", { length: 100 }),
  descricaoProduto: varchar("descricaoProduto", { length: 255 }),
  juros: decimal("juros", { precision: 10, scale: 4 }),
  tabelaMes: varchar("tabelaMes", { length: 50 }),
  percAVista: decimal("percAVista", { precision: 10, scale: 4 }),
  restricaoSRCC: varchar("restricaoSRCC", { length: 100 }),
  // Colunas calculadas por fórmula
  mesAno: varchar("mesAno", { length: 10 }),
  percPago: decimal("percPago", { precision: 10, scale: 4 }),
  totalComissao: decimal("totalComissao", { precision: 15, scale: 2 }),
  difEmpresa: decimal("difEmpresa", { precision: 15, scale: 2 }),
  tabela: varchar("tabela", { length: 100 }),
  supervisor: varchar("supervisor", { length: 255 }),
  // Sinalização de duplicatas
  isDuplicate: boolean("isDuplicate").default(false).notNull(),
  // Legado
  parcelas: int("parcelas"),
  percentual: decimal("percentual", { precision: 10, scale: 4 }),
  comissao: decimal("comissao", { precision: 15, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  mesAnoIdx: index("idx_consignados_mesAno").on(table.mes),
}));

export type Consignado = typeof consignados.$inferSelect;
export type InsertConsignado = typeof consignados.$inferInsert;

/**
 * Tabela de Contas Correntes (Operações)
 */
export const contasCorrentes = mysqlTable("contasCorrentes", {
  id: int("id").autoincrement().primaryKey(),
  empresa: varchar("empresa", { length: 100 }),
  mesAno: varchar("mesAno", { length: 10 }),
  chaveJ: varchar("chaveJ", { length: 50 }),
  agente: varchar("agente", { length: 255 }),
  agencia: varchar("agencia", { length: 50 }),
  contaCorrente: varchar("contaCorrente", { length: 50 }),
  tipoServ: varchar("tipoServ", { length: 100 }),
  dataOperacao: date("dataOperacao"),
  produto: varchar("produto", { length: 100 }),
  modalidade: varchar("modalidade", { length: 100 }),
  agRelacionamento: varchar("agRelacionamento", { length: 255 }),
  rbm: decimal("rbm", { precision: 15, scale: 2 }),
  percComissao: decimal("percComissao", { precision: 10, scale: 4 }),
  comissao: decimal("comissao", { precision: 15, scale: 2 }),
  supervisor: varchar("supervisor", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  mesAnoIdx: index("idx_contasCorrentes_mesAno").on(table.mesAno),
}));

export type ContaCorrente = typeof contasCorrentes.$inferSelect;
export type InsertContaCorrente = typeof contasCorrentes.$inferInsert;

/**
 * Tabela de Consórcios (Operações)
 */
export const consorcios = mysqlTable("consorcios", {
  id: int("id").autoincrement().primaryKey(),
  empresa: varchar("empresa", { length: 20 }),          // BMF | FLEX
  mesAno: varchar("mesAno", { length: 10 }),             // MM/AAAA
  proposta: varchar("proposta", { length: 50 }),         // Número da proposta
  data: varchar("data", { length: 12 }),                 // DD/MM/AAAA
  segmento: varchar("segmento", { length: 50 }),         // DEMAIS | IMOVEL
  valorBem: decimal("valorBem", { precision: 15, scale: 2 }),
  parcLiberada: varchar("parcLiberada", { length: 20 }), // PARC1..PARC9
  pctComissao1: decimal("pctComissao1", { precision: 10, scale: 6 }),
  rbm: decimal("rbm", { precision: 15, scale: 2 }),
  pctComissao2: decimal("pctComissao2", { precision: 10, scale: 6 }),
  comissao: decimal("comissao", { precision: 15, scale: 2 }),
  chaveJ: varchar("chaveJ", { length: 50 }),
  nomeAgente: varchar("nomeAgente", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  mesAnoIdx: index("idx_consorcios_mesAno").on(table.mesAno),
  empresaIdx: index("idx_consorcios_empresa").on(table.empresa),
  propostaIdx: index("idx_consorcios_proposta").on(table.proposta),
}));

export type Consorcio = typeof consorcios.$inferSelect;
export type InsertConsorcio = typeof consorcios.$inferInsert;

/**
 * Tabela de OuroCap (Operações)
 */
export const ourocap = mysqlTable("ourocap", {
  id: int("id").autoincrement().primaryKey(),
  empresa: varchar("empresa", { length: 100 }),
  mesAno: varchar("mesAno", { length: 10 }),
  chaveJ: varchar("chaveJ", { length: 50 }),
  nomeAgente: varchar("nomeAgente", { length: 255 }),
  proposta: varchar("proposta", { length: 100 }),
  cpfCliente: varchar("cpfCliente", { length: 14 }),
  dtVenda: date("dtVenda"),
  dtDebito: date("dtDebito"),
  codProduto: varchar("codProduto", { length: 50 }),
  vrProduto: decimal("vrProduto", { precision: 15, scale: 2 }),
  rbm: decimal("rbm", { precision: 15, scale: 2 }),
  comissao: decimal("comissao", { precision: 15, scale: 2 }),
  supervisor: varchar("supervisor", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  mesAnoIdx: index("idx_ourocap_mesAno").on(table.mesAno),
}));

export type Ourocap = typeof ourocap.$inferSelect;
export type InsertOurocap = typeof ourocap.$inferInsert;

/**
 * Tabela de Seguros (Operações)
 */
export const seguros = mysqlTable("seguros", {
  id: int("id").autoincrement().primaryKey(),
  empresa: varchar("empresa", { length: 100 }),
  mesAno: varchar("mesAno", { length: 10 }),
  chaveJ: varchar("chaveJ", { length: 50 }),
  nomeAgente: varchar("nomeAgente", { length: 255 }),
  dtOperacao: date("dtOperacao"),
  prazo: int("prazo"),
  banco: varchar("banco", { length: 100 }),
  nrContrato: varchar("nrContrato", { length: 100 }),
  vrEmprestimo: decimal("vrEmprestimo", { precision: 15, scale: 2 }),
  refinanciado: boolean("refinanciado"),
  dtPagto: date("dtPagto"),
  digitadoPor: varchar("digitadoPor", { length: 255 }),
  vrComissao: decimal("vrComissao", { precision: 15, scale: 2 }),
  percComissao: decimal("percComissao", { precision: 10, scale: 4 }),
  incremento: decimal("incremento", { precision: 10, scale: 4 }),
  parcela: int("parcela"),
  comissaoAgente: decimal("comissaoAgente", { precision: 15, scale: 2 }),
  observacao: text("observacao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  mesAnoIdx: index("idx_seguros_mesAno").on(table.mesAno),
}));

export type Seguro = typeof seguros.$inferSelect;
export type InsertSeguro = typeof seguros.$inferInsert;

/**
 * Tabela de Pagamentos
 * Espelha exatamente as colunas da aba Pagtos do Excel
 */
export const pagamentos = mysqlTable("pagamentos", {
  id: int("id").autoincrement().primaryKey(),
  mesAno: varchar("mesAno", { length: 10 }),           // MM/AAAA
  tipoPagto: varchar("tipoPagto", { length: 100 }),    // Comissão, Aluguel, Agua, etc.
  cidadeUF: varchar("cidadeUF", { length: 150 }),      // Cidade/UF
  empresa: varchar("empresa", { length: 100 }),
  chaveJ: varchar("chaveJ", { length: 50 }),
  cadastro: varchar("cadastro", { length: 50 }),
  nomeFavorecido: varchar("nomeFavorecido", { length: 255 }),
  banco: varchar("banco", { length: 100 }),
  agencia: varchar("agencia", { length: 50 }),
  conta: varchar("conta", { length: 50 }),
  cpfCnpj: varchar("cpfCnpj", { length: 18 }),
  tipoConta: varchar("tipoConta", { length: 50 }),
  pix: varchar("pix", { length: 255 }),
  valor: decimal("valor", { precision: 15, scale: 2 }),
  pago: boolean("pago").default(false).notNull(),
  dataPagto: varchar("dataPagto", { length: 10 }),     // DD/MM/AAAA
  dataVencer: varchar("dataVencer", { length: 10 }),   // DD/MM/AAAA
  origem: varchar("origem", { length: 50 }).default("manual"), // manual | sistema
   observacao: text("observacao"),
  chaveJResp: varchar("chaveJResp", { length: 50 }), // Chave J do responsável pelo lançamento
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  mesAnoIdx: index("idx_pagamentos_mesAno").on(table.mesAno),
  chaveJIdx: index("idx_pagamentos_chaveJ").on(table.chaveJ),
  empresaIdx: index("idx_pagamentos_empresa").on(table.empresa),
  chaveJRespIdx: index("idx_pagamentos_chaveJResp").on(table.chaveJResp),
}));
export type Pagamento = typeof pagamentos.$inferSelect;
export type InsertPagamento = typeof pagamentos.$inferInsert;

/**
 * Tabela de Cálculos Consolidados
 */
export const calculos = mysqlTable("calculos", {
  id: int("id").autoincrement().primaryKey(),
  tipoPagamento: varchar("tipoPagamento", { length: 100 }),
  mesRef: varchar("mesRef", { length: 10 }),
  empresa: varchar("empresa", { length: 100 }),
  chaveJ: varchar("chaveJ", { length: 50 }),
  nomeAgente: varchar("nomeAgente", { length: 255 }),
  cidade: varchar("cidade", { length: 100 }),
  situacao: varchar("situacao", { length: 50 }),
  percentual: decimal("percentual", { precision: 10, scale: 4 }),
  comissaoTotal: decimal("comissaoTotal", { precision: 15, scale: 2 }),
  rbmTotal: decimal("rbmTotal", { precision: 15, scale: 2 }),
  comissaoConsig: decimal("comissaoConsig", { precision: 15, scale: 2 }),
  comissaoConsorcio: decimal("comissaoConsorcio", { precision: 15, scale: 2 }),
  comissaoOurocap: decimal("comissaoOurocap", { precision: 15, scale: 2 }),
  comissaoCc: decimal("comissaoCc", { precision: 15, scale: 2 }),
  comissaoSeguros: decimal("comissaoSeguros", { precision: 15, scale: 2 }),
  ajudaCusto: decimal("ajudaCusto", { precision: 15, scale: 2 }),
  creditosDebitos: decimal("creditosDebitos", { precision: 15, scale: 2 }),
  adiantamento: decimal("adiantamento", { precision: 15, scale: 2 }),
  reajuste: decimal("reajuste", { precision: 15, scale: 2 }),
  comissaoSupervisor: decimal("comissaoSupervisor", { precision: 15, scale: 2 }),
  rbmCreditoC2: decimal("rbmCreditoC2", { precision: 15, scale: 2 }),
  rbmContaCorrente: decimal("rbmContaCorrente", { precision: 15, scale: 2 }),
  rbmConsorcioC2: decimal("rbmConsorcioC2", { precision: 15, scale: 2 }),
  rbmOurocap: decimal("rbmOurocap", { precision: 15, scale: 2 }),
  rbmSeguros: decimal("rbmSeguros", { precision: 15, scale: 2 }),
  qtdeContas: int("qtdeContas"),
  vrLiquidoC2: decimal("vrLiquidoC2", { precision: 15, scale: 2 }),
  srccC2: decimal("srccC2", { precision: 15, scale: 2 }),
  vrLiquidoSrcc: decimal("vrLiquidoSrcc", { precision: 15, scale: 2 }),
  dtPagto: varchar("dtPagto", { length: 10 }), // DD/MM/AAAA
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  mesRefIdx: index("idx_calculos_mesRef").on(table.mesRef),
}));

export type Calculo = typeof calculos.$inferSelect;
export type InsertCalculo = typeof calculos.$inferInsert;

/**
 * Tabela de Produção Banco do Brasil
 */
export const producaoBb = mysqlTable("producaoBb", {
  id: int("id").autoincrement().primaryKey(),
  mesData: varchar("mesData", { length: 10 }),
  empresa: varchar("empresa", { length: 100 }),
  recConsignado: decimal("recConsignado", { precision: 15, scale: 2 }),
  recProRata: decimal("recProRata", { precision: 15, scale: 2 }),
  recCc: decimal("recCc", { precision: 15, scale: 2 }),
  recConsorcio: decimal("recConsorcio", { precision: 15, scale: 2 }),
  recOurocap: decimal("recOurocap", { precision: 15, scale: 2 }),
  recSeguro: decimal("recSeguro", { precision: 15, scale: 2 }),
  prtSeguro: decimal("prtSeguro", { precision: 15, scale: 2 }),
  recBonus: decimal("recBonus", { precision: 15, scale: 2 }),
  recCreditos: decimal("recCreditos", { precision: 15, scale: 2 }),
  descDebitos: decimal("descDebitos", { precision: 15, scale: 2 }),
  recTotal: decimal("recTotal", { precision: 15, scale: 2 }),
  vrLiquido: decimal("vrLiquido", { precision: 15, scale: 2 }),
  qtdeOpCredito: int("qtdeOpCredito"),
  qtdeOpCc: int("qtdeOpCc"),
  qtdeOpConsorcio: int("qtdeOpConsorcio"),
  qtdeOpOurocap: int("qtdeOpOurocap"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  mesDataIdx: index("idx_producaoBb_mesData").on(table.mesData),
}));

export type ProducaoBb = typeof producaoBb.$inferSelect;
export type InsertProducaoBb = typeof producaoBb.$inferInsert;

/**
 * Tabela de Extratos Consignados
 */
export const extratoConsignados = mysqlTable("extratoConsignados", {
  id: int("id").autoincrement().primaryKey(),
  mesAno: varchar("mesAno", { length: 10 }),
  chaveJ: varchar("chaveJ", { length: 50 }),
  nomeAgente: varchar("nomeAgente", { length: 255 }),
  nrOperacao: varchar("nrOperacao", { length: 100 }),
  parcelas: int("parcelas"),
  convenio: varchar("convenio", { length: 100 }),
  juros: decimal("juros", { precision: 10, scale: 4 }),
  valorLiquido: decimal("valorLiquido", { precision: 15, scale: 2 }),
  percentual: decimal("percentual", { precision: 10, scale: 4 }),
  comissao: decimal("comissao", { precision: 15, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ExtratoConsignado = typeof extratoConsignados.$inferSelect;
export type InsertExtratoConsignado = typeof extratoConsignados.$inferInsert;

/**
 * Tabela de Extratos Contas Correntes
 */
export const extratoContas = mysqlTable("extratoContas", {
  id: int("id").autoincrement().primaryKey(),
  mesAno: varchar("mesAno", { length: 10 }),
  agencia: varchar("agencia", { length: 50 }),
  chaveJ: varchar("chaveJ", { length: 50 }),
  nome: varchar("nome", { length: 255 }),
  comissao: decimal("comissao", { precision: 15, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ExtratoConta = typeof extratoContas.$inferSelect;
export type InsertExtratoConta = typeof extratoContas.$inferInsert;

/**
 * Tabela de Extratos Consórcios
 */
export const extratoConsorcios = mysqlTable("extratoConsorcios", {
  id: int("id").autoincrement().primaryKey(),
  mesAno: varchar("mesAno", { length: 10 }),
  chaveJ: varchar("chaveJ", { length: 50 }),
  nome: varchar("nome", { length: 255 }),
  nrOperacao: varchar("nrOperacao", { length: 100 }),
  parcelas: int("parcelas"),
  segmento: varchar("segmento", { length: 100 }),
  valorBem: decimal("valorBem", { precision: 15, scale: 2 }),
  comissao: decimal("comissao", { precision: 15, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ExtratoConsorcio = typeof extratoConsorcios.$inferSelect;
export type InsertExtratoConsorcio = typeof extratoConsorcios.$inferInsert;

/**
 * Tabela de Extratos OuroCap
 */
export const extratoOurocap = mysqlTable("extratoOurocap", {
  id: int("id").autoincrement().primaryKey(),
  mesAno: varchar("mesAno", { length: 10 }),
  chaveJ: varchar("chaveJ", { length: 50 }),
  nome: varchar("nome", { length: 255 }),
  nrOperacao: varchar("nrOperacao", { length: 100 }),
  valorLiquido: decimal("valorLiquido", { precision: 15, scale: 2 }),
  comissao: decimal("comissao", { precision: 15, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ExtratoOurocap = typeof extratoOurocap.$inferSelect;
export type InsertExtratoOurocap = typeof extratoOurocap.$inferInsert;

/**
 * Tabela de Documentação
 */
export const documentacao = mysqlTable("documentacao", {
  id: int("id").autoincrement().primaryKey(),
  empresa: varchar("empresa", { length: 100 }),
  situacao: varchar("situacao", { length: 50 }),
  nomeDocumento: varchar("nomeDocumento", { length: 255 }),
  finalidade: varchar("finalidade", { length: 255 }),
  naPasta: varchar("naPasta", { length: 255 }),
  area: varchar("area", { length: 100 }),
  responsavelDocumento: varchar("responsavelDocumento", { length: 255 }),
  aprovador: varchar("aprovador", { length: 255 }),
  versao: varchar("versao", { length: 50 }),
  dataCriacao: date("dataCriacao"),
  publicacaoAtual: varchar("publicacaoAtual", { length: 50 }),
  dataAtualizacao: date("dataAtualizacao"),
  codigoDocumento: varchar("codigoDocumento", { length: 100 }),
  fluxoAprovacao: varchar("fluxoAprovacao", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Documentacao = typeof documentacao.$inferSelect;
export type InsertDocumentacao = typeof documentacao.$inferInsert;

/**
 * Tabela de Bloqueio de Login
 * Controla tentativas falhas de login e bloqueio do sistema
 */
export const loginAttempts = mysqlTable("loginAttempts", {
  id: int("id").autoincrement().primaryKey(),
  chaveJ: varchar("chaveJ", { length: 50 }).notNull(),
  attempts: int("attempts").default(0).notNull(),
  isBlocked: boolean("isBlocked").default(false).notNull(),
  blockedUntil: timestamp("blockedUntil"),
  lastAttempt: timestamp("lastAttempt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  chaveJIdx: index("idx_loginAttempts_chaveJ").on(table.chaveJ),
}));

export type LoginAttempt = typeof loginAttempts.$inferSelect;
export type InsertLoginAttempt = typeof loginAttempts.$inferInsert;

/**
 * Tabela de Auditoria/Logs
 * Rastreia todas as atividades dos agentes no sistema
 */
export const auditoria = mysqlTable("auditoria", {
  id: int("id").autoincrement().primaryKey(),
  agenteId: int("agenteId").notNull(),
  chaveJ: varchar("chaveJ", { length: 50 }).notNull(),
  nomeAgente: varchar("nomeAgente", { length: 255 }).notNull(),
  numeroEntrada: varchar("numeroEntrada", { length: 50 }).unique().notNull(),
  horarioEntrada: timestamp("horarioEntrada").defaultNow().notNull(),
  horarioSaida: timestamp("horarioSaida"),
  modulo: varchar("modulo", { length: 100 }),
  acao: varchar("acao", { length: 100 }),
  descricao: text("descricao"),
  tabela: varchar("tabela", { length: 100 }),
  registroId: int("registroId"),
  valorAnterior: text("valorAnterior"),
  valorNovo: text("valorNovo"),
  ipAddress: varchar("ipAddress", { length: 50 }),
  userAgent: text("userAgent"),
  latitude: varchar("latitude", { length: 30 }),
  longitude: varchar("longitude", { length: 30 }),
  geoEndereco: varchar("geoEndereco", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  agenteIdIdx: index("idx_auditoria_agenteId").on(table.agenteId),
  chaveJIdx: index("idx_auditoria_chaveJ").on(table.chaveJ),
  numeroEntradaIdx: index("idx_auditoria_numeroEntrada").on(table.numeroEntrada),
  moduloIdx: index("idx_auditoria_modulo").on(table.modulo),
  acaoIdx: index("idx_auditoria_acao").on(table.acao),
}));

export type Auditoria = typeof auditoria.$inferSelect;
export type InsertAuditoria = typeof auditoria.$inferInsert;

/**
 * Tabela de Sessões Ativas
 * Rastreia usuários conectados em tempo real
 */
export const sessoes = mysqlTable("sessoes", {
  id: int("id").autoincrement().primaryKey(),
  agenteId: int("agenteId").notNull(),
  chaveJ: varchar("chaveJ", { length: 50 }).notNull(),
  nomeAgente: varchar("nomeAgente", { length: 255 }),
  horarioConexao: timestamp("horarioConexao").defaultNow().notNull(),
  ultimoAcesso: timestamp("ultimoAcesso").defaultNow().notNull(),
  modulo: varchar("modulo", { length: 100 }).default("dashboard"),
  ipAddress: varchar("ipAddress", { length: 50 }),
  userAgent: text("userAgent"),
  ativo: tinyint("ativo").default(1).notNull(),
  motivoDesconexao: varchar("motivoDesconexao", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  agenteIdIdx: index("idx_sessoes_agenteId").on(table.agenteId),
  chaveJIdx: index("idx_sessoes_chaveJ").on(table.chaveJ),
  ativoIdx: index("idx_sessoes_ativo").on(table.ativo),
}));

export type Sessao = typeof sessoes.$inferSelect;
export type InsertSessao = typeof sessoes.$inferInsert;

/**
 * Tabela de Mensagens de Chat
 * Armazena mensagens entre usuários em tempo real
 */
export const mensagens = mysqlTable("mensagens", {
  id: int("id").autoincrement().primaryKey(),
  remetenteId: int("remetenteId").notNull(),
  remetenteNome: varchar("remetenteNome", { length: 255 }).notNull(),
  destinatarioId: int("destinatarioId"),
  destinatarioNome: varchar("destinatarioNome", { length: 255 }),
  conteudo: text("conteudo").notNull(),
  tipo: varchar("tipo", { length: 50 }).default("texto"), // texto, imagem, arquivo
  lida: boolean("lida").default(false).notNull(),
  grupoChat: varchar("grupoChat", { length: 100 }), // Para chats em grupo
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  remetenteIdIdx: index("idx_mensagens_remetenteId").on(table.remetenteId),
  destinatarioIdIdx: index("idx_mensagens_destinatarioId").on(table.destinatarioId),
  grupoChatIdx: index("idx_mensagens_grupoChat").on(table.grupoChat),
  lidaIdx: index("idx_mensagens_lida").on(table.lida),
}));

export type Mensagem = typeof mensagens.$inferSelect;
export type InsertMensagem = typeof mensagens.$inferInsert;


/**
 * Tabela de Valores para Cálculo por Nível
 * Armazena os valores dos Ativos 01-10 usados nos cálculos de comissão
 */
export const valoresCalculo = mysqlTable("valoresCalculo", {
  id: int("id").autoincrement().primaryKey(),
  ativo01: decimal("ativo01", { precision: 10, scale: 2 }).default("0.00"),
  ativo01De: decimal("ativo01De", { precision: 15, scale: 2 }),
  ativo01Ate: decimal("ativo01Ate", { precision: 15, scale: 2 }),
  ativo02: decimal("ativo02", { precision: 10, scale: 2 }).default("0.00"),
  ativo02De: decimal("ativo02De", { precision: 15, scale: 2 }),
  ativo02Ate: decimal("ativo02Ate", { precision: 15, scale: 2 }),
  ativo03: decimal("ativo03", { precision: 10, scale: 2 }).default("0.00"),
  ativo03De: decimal("ativo03De", { precision: 15, scale: 2 }),
  ativo03Ate: decimal("ativo03Ate", { precision: 15, scale: 2 }),
  ativo04: decimal("ativo04", { precision: 10, scale: 2 }).default("0.00"),
  ativo04De: decimal("ativo04De", { precision: 15, scale: 2 }),
  ativo04Ate: decimal("ativo04Ate", { precision: 15, scale: 2 }),
  ativo05: decimal("ativo05", { precision: 10, scale: 2 }).default("0.00"),
  ativo05De: decimal("ativo05De", { precision: 15, scale: 2 }),
  ativo05Ate: decimal("ativo05Ate", { precision: 15, scale: 2 }),
  ativo06: decimal("ativo06", { precision: 10, scale: 2 }).default("0.00"),
  ativo06De: decimal("ativo06De", { precision: 15, scale: 2 }),
  ativo06Ate: decimal("ativo06Ate", { precision: 15, scale: 2 }),
  ativo07: decimal("ativo07", { precision: 10, scale: 2 }).default("0.00"),
  ativo07De: decimal("ativo07De", { precision: 15, scale: 2 }),
  ativo07Ate: decimal("ativo07Ate", { precision: 15, scale: 2 }),
  ativo08: decimal("ativo08", { precision: 10, scale: 2 }).default("0.00"),
  ativo08De: decimal("ativo08De", { precision: 15, scale: 2 }),
  ativo08Ate: decimal("ativo08Ate", { precision: 15, scale: 2 }),
  ativo09: decimal("ativo09", { precision: 10, scale: 2 }).default("0.00"),
  ativo09De: decimal("ativo09De", { precision: 15, scale: 2 }),
  ativo09Ate: decimal("ativo09Ate", { precision: 15, scale: 2 }),
  ativo10: decimal("ativo10", { precision: 10, scale: 2 }).default("0.00"),
  ativo10De: decimal("ativo10De", { precision: 15, scale: 2 }),
  ativo10Ate: decimal("ativo10Ate", { precision: 15, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ValoresCalculo = typeof valoresCalculo.$inferSelect;
export type InsertValoresCalculo = typeof valoresCalculo.$inferInsert;




/**
 * Tabela Febraban - Relatório de Produção BB
 * Armazena os dados do relatório de produção do Banco do Brasil
 * Chave única: proposta (número da operação)
 */
export const febraban = mysqlTable("febraban", {
  id: int("id").autoincrement().primaryKey(),
  empresa: varchar("empresa", { length: 100 }),
  mesano: int("mesano"),                             // ex: 126 = jan/2026
  proposta: varchar("proposta", { length: 20 }).notNull(), // número da operação (chave de negócio)
  linha: int("linha"),                               // código da linha de produto
  situacao: varchar("situacao", { length: 100 }),    // Contratada, Cancelada, Pendente
  operador: varchar("operador", { length: 50 }),     // ChaveJ do operador
  solicitacao: varchar("solicitacao", { length: 20 }), // data da solicitação (DD/MM/YYYY)
  prazo: varchar("prazo", { length: 20 }),           // ex: 96meses
  troco: decimal("troco", { precision: 15, scale: 2 }),
  financiado: decimal("financiado", { precision: 15, scale: 2 }),
  financNovo: decimal("financNovo", { precision: 15, scale: 2 }),   // bruto quando troco=0 (financiamento novo)
  trocoRefin: decimal("trocoRefin", { precision: 15, scale: 2 }),   // troco quando troco>0 (refinanciamento)
  situacao2: varchar("situacao2", { length: 100 }),  // coluna "Situação" (11ª coluna do Excel)
  pago: tinyint("pago").default(0).notNull(),         // 0=Não, 1=Sim (manual), 2=SRCC
  ordemExcel: int("ordemExcel"),                      // posição original no Excel para ordenar
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  propostaIdx: index("idx_febraban_proposta").on(table.proposta),
  mesanoIdx: index("idx_febraban_mesano").on(table.mesano),
  empresaIdx: index("idx_febraban_empresa").on(table.empresa),
  operadorIdx: index("idx_febraban_operador").on(table.operador),
}));

export type Febraban = typeof febraban.$inferSelect;
export type InsertFebraban = typeof febraban.$inferInsert;

/**
 * Tabela de Feriados
 * Feriados nacionais e estaduais (Bahia)
 */
export const feriados = mysqlTable("feriados", {
  id: int("id").autoincrement().primaryKey(),
  data: varchar("data", { length: 10 }).notNull(),         // DD/MM/AAAA
  nome: varchar("nome", { length: 255 }).notNull(),
  tipo: varchar("tipo", { length: 20 }).notNull(),          // 'nacional' | 'estadual' | 'municipal'
  estado: varchar("estado", { length: 2 }),                 // 'BA' para estadual, null para nacional
  cidade: varchar("cidade", { length: 100 }),               // para feriados municipais
  ano: int("ano").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  dataIdx: index("idx_feriados_data").on(table.data),
  anoIdx: index("idx_feriados_ano").on(table.ano),
  tipoIdx: index("idx_feriados_tipo").on(table.tipo),
}));
export type Feriado = typeof feriados.$inferSelect;
export type InsertFeriado = typeof feriados.$inferInsert;

/**
 * Tabela Pró Rata
 * Operações de consignado com controle de parcelas pagas e a receber
 */
export const proRata = mysqlTable("pro_rata", {
  id: int("id").autoincrement().primaryKey(),
  agenciaBB: varchar("agenciaBB", { length: 20 }),
  nrOperacao: varchar("nrOperacao", { length: 50 }).notNull(),
  chaveJ: varchar("chaveJ", { length: 50 }),
  valorFinanciado: decimal("valorFinanciado", { precision: 15, scale: 2 }),
  comissao: decimal("comissao", { precision: 15, scale: 4 }),   // valor mensal da comissão
  dataFinal: varchar("dataFinal", { length: 10 }),              // DD/MM/AAAA
  qtdParcelasPagas: int("qtdParcelasPagas"),
  qtdParcelasTotal: int("qtdParcelasTotal"),
  codEst: varchar("codEst", { length: 20 }),
  empresa: varchar("empresa", { length: 100 }),
  // Colunas calculadas (armazenadas para facilitar filtros e totais)
  qtdFaltaReceber: int("qtdFaltaReceber"),
  vlr: decimal("vlr", { precision: 15, scale: 4 }),  // comissao * qtdFaltaReceber
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  nrOperacaoIdx: index("idx_pro_rata_nrOperacao").on(table.nrOperacao),
  chaveJIdx: index("idx_pro_rata_chaveJ").on(table.chaveJ),
}));
export type ProRata = typeof proRata.$inferSelect;
export type InsertProRata = typeof proRata.$inferInsert;

// Tabela de operações encerradas (detectadas ao importar nova planilha)
export const proRataEncerradas = mysqlTable("pro_rata_encerradas", {
  id: int("id").autoincrement().primaryKey(),
  importacaoId: varchar("importacaoId", { length: 36 }).notNull(), // UUID da importação
  importacaoData: timestamp("importacaoData").defaultNow().notNull(),
  nrOperacao: varchar("nrOperacao", { length: 50 }).notNull(),
  chaveJ: varchar("chaveJ", { length: 50 }),
  agenciaBB: varchar("agenciaBB", { length: 20 }),
  empresa: varchar("empresa", { length: 100 }),
  valorFinanciado: decimal("valorFinanciado", { precision: 15, scale: 2 }),
  comissao: decimal("comissao", { precision: 15, scale: 4 }),
  dataFinal: varchar("dataFinal", { length: 10 }),
  qtdParcelasPagas: int("qtdParcelasPagas"),
  qtdParcelasTotal: int("qtdParcelasTotal"),
  vlrPerdido: decimal("vlrPerdido", { precision: 15, scale: 4 }), // vlr que deixou de receber
  motivo: varchar("motivo", { length: 50 }).default("encerrada"), // 'encerrada' | 'removida'
}, (table) => ({
  nrOperacaoIdx: index("idx_enc_nrOperacao").on(table.nrOperacao),
  importacaoIdx: index("idx_enc_importacao").on(table.importacaoId),
}));
export type ProRataEncerrada = typeof proRataEncerradas.$inferSelect;
export type InsertProRataEncerrada = typeof proRataEncerradas.$inferInsert;

// ============================================================================
// MÓDULO CRM
// ============================================================================

/**
 * Clientes CRM
 */
export const crmClientes = mysqlTable("crm_clientes", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  cpf: varchar("cpf", { length: 14 }),
  dataNascimento: varchar("dataNascimento", { length: 10 }),
  telefone: varchar("telefone", { length: 20 }),
  telefone2: varchar("telefone2", { length: 20 }),
  email: varchar("email", { length: 255 }),
  endereco: varchar("endereco", { length: 255 }),
  cidade: varchar("cidade", { length: 100 }),
  uf: varchar("uf", { length: 2 }),
  convenio: varchar("convenio", { length: 100 }),
  matricula: varchar("matricula", { length: 50 }),
  margemDisponivel: decimal("margemDisponivel", { precision: 15, scale: 2 }),
  beneficio: varchar("beneficio", { length: 50 }),
  banco: varchar("banco", { length: 100 }),
  agencia: varchar("agencia", { length: 20 }),
  conta: varchar("conta", { length: 30 }),
  agenteResponsavel: varchar("agenteResponsavel", { length: 255 }),
  chaveJAgente: varchar("chaveJAgente", { length: 50 }),
  origem: varchar("origem", { length: 100 }), // indicação, mailing, ativo, etc
  observacoes: text("observacoes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  cpfIdx: index("idx_crm_clientes_cpf").on(table.cpf),
  agenteIdx: index("idx_crm_clientes_agente").on(table.chaveJAgente),
}));
export type CrmCliente = typeof crmClientes.$inferSelect;
export type InsertCrmCliente = typeof crmClientes.$inferInsert;

/**
 * Oportunidades CRM (Pipeline)
 */
export const crmOportunidades = mysqlTable("crm_oportunidades", {
  id: int("id").autoincrement().primaryKey(),
  clienteId: int("clienteId"),
  clienteNome: varchar("clienteNome", { length: 255 }).notNull(),
  produto: varchar("produto", { length: 100 }), // Consignado INSS, Público, Consórcio, etc
  valorEstimado: decimal("valorEstimado", { precision: 15, scale: 2 }),
  status: mysqlEnum("status", ["novo", "em_contato", "proposta_enviada", "aprovado", "fechado", "perdido"]).default("novo").notNull(),
  motivoPerda: varchar("motivoPerda", { length: 255 }),
  agenteResponsavel: varchar("agenteResponsavel", { length: 255 }),
  chaveJAgente: varchar("chaveJAgente", { length: 50 }),
  previsaoFechamento: date("previsaoFechamento"),
  observacoes: text("observacoes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  clienteIdx: index("idx_crm_op_cliente").on(table.clienteId),
  statusIdx: index("idx_crm_op_status").on(table.status),
  agenteIdx: index("idx_crm_op_agente").on(table.chaveJAgente),
}));
export type CrmOportunidade = typeof crmOportunidades.$inferSelect;
export type InsertCrmOportunidade = typeof crmOportunidades.$inferInsert;

/**
 * Atendimentos CRM
 */
export const crmAtendimentos = mysqlTable("crm_atendimentos", {
  id: int("id").autoincrement().primaryKey(),
  clienteId: int("clienteId"),
  clienteNome: varchar("clienteNome", { length: 255 }).notNull(),
  oportunidadeId: int("oportunidadeId"),
  canal: mysqlEnum("canal", ["telefone", "whatsapp", "presencial", "email", "outro"]).default("telefone").notNull(),
  assunto: varchar("assunto", { length: 255 }),
  descricao: text("descricao"),
  resultado: mysqlEnum("resultado", ["contato_realizado", "sem_resposta", "retornar", "proposta_aceita", "proposta_recusada", "encerrado"]).default("contato_realizado").notNull(),
  proximoPasso: varchar("proximoPasso", { length: 255 }),
  dataAtendimento: timestamp("dataAtendimento").defaultNow().notNull(),
  agenteResponsavel: varchar("agenteResponsavel", { length: 255 }),
  chaveJAgente: varchar("chaveJAgente", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  clienteIdx: index("idx_crm_at_cliente").on(table.clienteId),
  agenteIdx: index("idx_crm_at_agente").on(table.chaveJAgente),
}));
export type CrmAtendimento = typeof crmAtendimentos.$inferSelect;
export type InsertCrmAtendimento = typeof crmAtendimentos.$inferInsert;

/**
 * Tarefas / Follow-up CRM
 */
export const crmTarefas = mysqlTable("crm_tarefas", {
  id: int("id").autoincrement().primaryKey(),
  clienteId: int("clienteId"),
  clienteNome: varchar("clienteNome", { length: 255 }),
  oportunidadeId: int("oportunidadeId"),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricao: text("descricao"),
  tipo: mysqlEnum("tipo", ["ligar", "whatsapp", "email", "visita", "enviar_proposta", "outro"]).default("ligar").notNull(),
  prioridade: mysqlEnum("prioridade", ["baixa", "media", "alta"]).default("media").notNull(),
  status: mysqlEnum("status", ["pendente", "em_andamento", "concluida", "cancelada"]).default("pendente").notNull(),
  dataVencimento: timestamp("dataVencimento"),
  dataConclusao: timestamp("dataConclusao"),
  agenteResponsavel: varchar("agenteResponsavel", { length: 255 }),
  chaveJAgente: varchar("chaveJAgente", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  agenteIdx: index("idx_crm_tar_agente").on(table.chaveJAgente),
  statusIdx: index("idx_crm_tar_status").on(table.status),
  vencimentoIdx: index("idx_crm_tar_vencimento").on(table.dataVencimento),
}));
export type CrmTarefa = typeof crmTarefas.$inferSelect;
export type InsertCrmTarefa = typeof crmTarefas.$inferInsert;

/**
 * Mailing CRM
 */
export const crmMailing = mysqlTable("crm_mailing", {
  id: int("id").autoincrement().primaryKey(),
  listaId: varchar("listaId", { length: 36 }).notNull(), // UUID da lista
  listaNome: varchar("listaNome", { length: 255 }).notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  cpf: varchar("cpf", { length: 14 }),
  telefone: varchar("telefone", { length: 20 }),
  telefone2: varchar("telefone2", { length: 20 }),
  convenio: varchar("convenio", { length: 100 }),
  beneficio: varchar("beneficio", { length: 50 }),
  margemDisponivel: decimal("margemDisponivel", { precision: 15, scale: 2 }),
  status: mysqlEnum("status", ["nao_contatado", "em_contato", "convertido", "sem_interesse", "invalido"]).default("nao_contatado").notNull(),
  agenteResponsavel: varchar("agenteResponsavel", { length: 255 }),
  chaveJAgente: varchar("chaveJAgente", { length: 50 }),
  observacoes: text("observacoes"),
  dataContato: timestamp("dataContato"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  listaIdx: index("idx_crm_mail_lista").on(table.listaId),
  statusIdx: index("idx_crm_mail_status").on(table.status),
  agenteIdx: index("idx_crm_mail_agente").on(table.chaveJAgente),
}));
export type CrmMailingItem = typeof crmMailing.$inferSelect;
export type InsertCrmMailingItem = typeof crmMailing.$inferInsert;

/**
 * Minutos de Sabedoria — pensamentos do livro de C. Torres Pastorino
 */
export const minutosSabedoria = mysqlTable("minutos_sabedoria", {
  id: int("id").autoincrement().primaryKey(),
  numero: int("numero").notNull(),
  titulo: varchar("titulo", { length: 255 }),
  conteudo: text("conteudo").notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  numeroIdx: index("idx_ms_numero").on(table.numero),
}));
export type MinutoSabedoria = typeof minutosSabedoria.$inferSelect;
export type InsertMinutoSabedoria = typeof minutosSabedoria.$inferInsert;

/**
 * Controle do pensamento do dia por usuário
 * Garante que cada usuário recebe um pensamento fixo por dia, sem repetir
 */
export const pensamentoDoDiaUsuario = mysqlTable("pensamento_do_dia_usuario", {
  id: int("id").autoincrement().primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  dataDia: date("data_dia").notNull(),
  pensamentoId: int("pensamento_id").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PensamentoDoDiaUsuario = typeof pensamentoDoDiaUsuario.$inferSelect;


/**
 * Tabela de Contas das Lojas
 * Armazena comprovantes (PDF/imagem) de despesas das lojas com controle de pagamento
 */
export const contasLojas = mysqlTable("contasLojas", {
  id: int("id").autoincrement().primaryKey(),
  loja: varchar("loja", { length: 100 }).notNull(),          // Nome/identificação da loja
  tipo: varchar("tipo", { length: 100 }).notNull(),           // Água, Energia, Aluguel, Internet, etc.
  mesAno: varchar("mesAno", { length: 7 }),                   // MM/AAAA
  valor: varchar("valor", { length: 20 }),                    // Valor da conta
  vencimento: varchar("vencimento", { length: 10 }),          // DD/MM/AAAA
  pago: boolean("pago").default(false).notNull(),
  dataPagto: varchar("dataPagto", { length: 10 }),            // DD/MM/AAAA
  observacao: text("observacao"),
  arquivoUrl: varchar("arquivoUrl", { length: 500 }),         // URL do arquivo no S3
  arquivoKey: varchar("arquivoKey", { length: 500 }),         // Chave S3
  arquivoNome: varchar("arquivoNome", { length: 255 }),       // Nome original do arquivo
  adicionadoPor: varchar("adicionadoPor", { length: 100 }),   // Nome de quem adicionou
  pagoPor: varchar("pagoPor", { length: 100 }),               // Nome de quem marcou como pago
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContaLoja = typeof contasLojas.$inferSelect;
export type InsertContaLoja = typeof contasLojas.$inferInsert;

/**
 * Tabela de Documentação de Agentes
 * Armazena cópias de documentos dos agentes (RG, CPF, Contrato, etc.)
 */
export const documentosAgentes = mysqlTable("documentosAgentes", {
  id: int("id").autoincrement().primaryKey(),
  chaveJ: varchar("chaveJ", { length: 50 }).notNull(),          // Chave J do agente
  nomeAgente: varchar("nomeAgente", { length: 255 }),            // Nome do agente (denormalizado para exibição)
  empresa: varchar("empresa", { length: 100 }),                  // Empresa do agente
  tipoDocumento: varchar("tipoDocumento", { length: 100 }).notNull(), // Contrato, RG, CPF, Endereço, CNH, Conta Bancária, Foto 3x4, Outros
  descricao: varchar("descricao", { length: 255 }),              // Descrição adicional
  arquivoUrl: varchar("arquivoUrl", { length: 500 }),            // URL do arquivo no S3
  arquivoKey: varchar("arquivoKey", { length: 500 }),            // Chave S3
  arquivoNome: varchar("arquivoNome", { length: 255 }),          // Nome original do arquivo
  arquivoTipo: varchar("arquivoTipo", { length: 100 }),          // MIME type (image/jpeg, application/pdf, etc.)
  tamanho: int("tamanho"),                                       // Tamanho em bytes
  adicionadoPor: varchar("adicionadoPor", { length: 100 }),      // Nome de quem adicionou
  observacao: text("observacao"),                                // Observações livres
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DocumentoAgente = typeof documentosAgentes.$inferSelect;
export type InsertDocumentoAgente = typeof documentosAgentes.$inferInsert;

/**
 * Tabela de Ativos Imobilizados
 * Controle de bens patrimoniais (móveis, equipamentos, veículos, etc.)
 */
export const ativosImobilizados = mysqlTable("ativosImobilizados", {
  id: int("id").autoincrement().primaryKey(),
  descricao: varchar("descricao", { length: 255 }).notNull(),
  categoria: varchar("categoria", { length: 100 }),             // Móvel, Equipamento, Veículo, Imóvel, Outros
  numeroPatrimonio: varchar("numeroPatrimonio", { length: 50 }),
  valorAquisicao: decimal("valorAquisicao", { precision: 15, scale: 2 }),
  dataAquisicao: varchar("dataAquisicao", { length: 10 }),       // DD/MM/AAAA
  vidaUtilAnos: int("vidaUtilAnos"),
  taxaDepreciacao: decimal("taxaDepreciacao", { precision: 8, scale: 4 }),
  valorResidual: decimal("valorResidual", { precision: 15, scale: 2 }),
  localizacao: varchar("localizacao", { length: 255 }),
  responsavel: varchar("responsavel", { length: 255 }),
  situacao: varchar("situacao", { length: 50 }).default("Ativo"),
  observacoes: text("observacoes"),
  fotoUrl: varchar("fotoUrl", { length: 500 }),                  // URL da foto no S3
  fotoKey: varchar("fotoKey", { length: 500 }),                  // Chave S3
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AtivoImobilizado = typeof ativosImobilizados.$inferSelect;
export type InsertAtivoImobilizado = typeof ativosImobilizados.$inferInsert;

/**
 * Tabela de Uniformes e Crachás
 * Controle de entrega de uniformes e crachás por agente
 */
export const uniformesCrachas = mysqlTable("uniformesCrachas", {
  id: int("id").autoincrement().primaryKey(),
  chaveJ: varchar("chaveJ", { length: 20 }),
  nomeAgente: varchar("nomeAgente", { length: 255 }),
  tipoItem: varchar("tipoItem", { length: 100 }).notNull(),     // Uniforme, Crachá, Colete, Boné, Outros
  tamanho: varchar("tamanho", { length: 20 }),                  // PP, P, M, G, GG, XGG
  quantidade: int("quantidade").default(1),
  dataEntrega: varchar("dataEntrega", { length: 10 }),          // DD/MM/AAAA
  situacao: varchar("situacao", { length: 50 }).default("Entregue"), // Entregue, Pendente, Devolvido
  observacoes: text("observacoes"),
  fotoUrl: varchar("fotoUrl", { length: 500 }),                  // URL da foto no S3
  fotoKey: varchar("fotoKey", { length: 500 }),                  // Chave S3
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type UniformeCracha = typeof uniformesCrachas.$inferSelect;
export type InsertUniformeCracha = typeof uniformesCrachas.$inferInsert;

// ── Mensagens Motivacionais ──────────────────────────────────────────────────
export const mensagensMotivacionais = mysqlTable("mensagens_motivacionais", {
  id: int("id").autoincrement().primaryKey(),
  numero: int("numero").notNull(),
  autor: varchar("autor", { length: 255 }),
  conteudo: text("conteudo").notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  numeroIdx: index("idx_mm_numero").on(table.numero),
}));
export type MensagemMotivacional = typeof mensagensMotivacionais.$inferSelect;
export type InsertMensagemMotivacional = typeof mensagensMotivacionais.$inferInsert;

export const motivacionalDoDiaUsuario = mysqlTable("motivacional_do_dia_usuario", {
  id: int("id").autoincrement().primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  dataDia: date("data_dia").notNull(),
  mensagemId: int("mensagem_id").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type MotivacionalDoDiaUsuario = typeof motivacionalDoDiaUsuario.$inferSelect;

// ── Engajamento de Agentes ───────────────────────────────────────────────────
export const agenteStreak = mysqlTable("agente_streak", {
  id: int("id").autoincrement().primaryKey(),
  chaveJ: varchar("chaveJ", { length: 50 }).notNull().unique(),
  ultimoAcesso: date("ultimoAcesso").notNull(),
  streakAtual: int("streakAtual").notNull().default(1),
  maiorStreak: int("maiorStreak").notNull().default(1),
  totalAcessos: int("totalAcessos").notNull().default(1),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AgenteStreak = typeof agenteStreak.$inferSelect;

export const agenteMetas = mysqlTable("agente_metas", {
  id: int("id").autoincrement().primaryKey(),
  chaveJ: varchar("chaveJ", { length: 50 }).notNull(),
  mesRef: varchar("mesRef", { length: 10 }).notNull(),
  metaConsig: decimal("metaConsig", { precision: 15, scale: 2 }).default("0"),
  metaConsorcio: decimal("metaConsorcio", { precision: 15, scale: 2 }).default("0"),
  metaOurocap: decimal("metaOurocap", { precision: 15, scale: 2 }).default("0"),
  metaCc: decimal("metaCc", { precision: 15, scale: 2 }).default("0"),
  metaTotal: decimal("metaTotal", { precision: 15, scale: 2 }).default("0"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AgenteMeta = typeof agenteMetas.$inferSelect;

export const agenteConquistas = mysqlTable("agente_conquistas", {
  id: int("id").autoincrement().primaryKey(),
  chaveJ: varchar("chaveJ", { length: 50 }).notNull(),
  codigo: varchar("codigo", { length: 100 }).notNull(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricao: text("descricao"),
  icone: varchar("icone", { length: 50 }).default("trophy"),
  conquistadoEm: timestamp("conquistadoEm").defaultNow().notNull(),
});
export type AgenteConquista = typeof agenteConquistas.$inferSelect;

/**
 * Tabela de BB Dental
 */
export const bbdental = mysqlTable("bbdental", {
  id: int("id").autoincrement().primaryKey(),
  empresa: varchar("empresa", { length: 100 }),
  mesAno: varchar("mesAno", { length: 10 }),
  chaveJ: varchar("chaveJ", { length: 50 }),
  nomeAgente: varchar("nomeAgente", { length: 255 }),
  proposta: varchar("proposta", { length: 100 }),
  cpfCliente: varchar("cpfCliente", { length: 14 }),
  dtVenda: date("dtVenda"),
  produto: varchar("produto", { length: 100 }),
  vrProduto: decimal("vrProduto", { precision: 15, scale: 2 }),
  rbm: decimal("rbm", { precision: 15, scale: 2 }),
  comissao: decimal("comissao", { precision: 15, scale: 2 }),
  supervisor: varchar("supervisor", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  mesAnoIdx: index("idx_bbdental_mesAno").on(table.mesAno),
}));
export type BBDental = typeof bbdental.$inferSelect;
export type InsertBBDental = typeof bbdental.$inferInsert;

/**
 * Tabela de Credenciais WebAuthn (Biometria)
 * Armazena chaves públicas de autenticação biométrica (digital/face) por dispositivo
 */
export const webauthnCredentials = mysqlTable("webauthn_credentials", {
  id: int("id").autoincrement().primaryKey(),
  agenteId: int("agenteId").notNull(),
  chaveJ: varchar("chaveJ", { length: 50 }).notNull(),
  credentialId: varchar("credentialId", { length: 512 }).notNull().unique(),
  credentialPublicKey: text("credentialPublicKey").notNull(),
  counter: int("counter").default(0).notNull(),
  deviceType: varchar("deviceType", { length: 32 }).default("singleDevice"),
  backedUp: tinyint("backedUp").default(0),
  transports: varchar("transports", { length: 255 }),
  deviceName: varchar("deviceName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastUsedAt: timestamp("lastUsedAt"),
}, (table) => ({
  agenteIdIdx: index("idx_webauthn_agenteId").on(table.agenteId),
  chaveJIdx: index("idx_webauthn_chaveJ").on(table.chaveJ),
}));
export type WebAuthnCredential = typeof webauthnCredentials.$inferSelect;
export type InsertWebAuthnCredential = typeof webauthnCredentials.$inferInsert;

// ─── DESPESAS INTERNAS (acesso restrito: Sidnei e Thiago Ultramare) ───────────
export const despesasInternas = mysqlTable("despesas_internas", {
  id: int("id").autoincrement().primaryKey(),
  mesAno: varchar("mesAno", { length: 7 }).notNull(),           // MM/AAAA
  categoria: varchar("categoria", { length: 100 }).notNull(),   // Pro-labore, Cartão de Crédito, etc.
  descricao: text("descricao"),                                  // Descrição livre
  valor: decimal("valor", { precision: 15, scale: 2 }).notNull(),
  dataLancamento: varchar("dataLancamento", { length: 10 }),    // DD/MM/AAAA
  lancadoPor: varchar("lancadoPor", { length: 100 }),           // Nome do responsável
  chaveJLancador: varchar("chaveJLancador", { length: 50 }),    // ChaveJ de quem lançou
  observacao: text("observacao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  mesAnoIdx: index("idx_despesas_internas_mesAno").on(table.mesAno),
  categoriaIdx: index("idx_despesas_internas_categoria").on(table.categoria),
}));
export type DespesaInterna = typeof despesasInternas.$inferSelect;
export type InsertDespesaInterna = typeof despesasInternas.$inferInsert;

// ─── CRM — Gestão de Leads / Clientes ─────────────────────────────────────────
export const crm = mysqlTable("crm", {
  id: int("id").autoincrement().primaryKey(),
  sexo: varchar("sexo", { length: 1 }),                          // M / F
  mciEmpregador: varchar("mciEmpregador", { length: 50 }),       // MCI_EMPREGADOR_CADASTRO
  nrCvn13Salario: varchar("nrCvn13Salario", { length: 20 }),     // NR_CVN_13_SALARIO
  nrCvnConsig: varchar("nrCvnConsig", { length: 20 }),           // NR_CVN_CONSIG
  nrCvnSalario: varchar("nrCvnSalario", { length: 20 }),         // NR_CVN_SALARIO
  sgUf: varchar("sgUf", { length: 2 }),                          // SG_UF
  super: varchar("super", { length: 20 }),                       // SUPER
  cidade: varchar("cidade", { length: 100 }),                    // CIDADE
  naoPerturbe: varchar("naoPerturbe", { length: 50 }),           // NÃO_PERTUBE
  dtInclusao: varchar("dtInclusao", { length: 20 }),             // DT INCLUSÃO
  prfDepe: varchar("prfDepe", { length: 20 }),                   // PRF_DEPE
  nrCc: varchar("nrCc", { length: 30 }),                         // NR_C/C
  nome: varchar("nome", { length: 200 }),                        // NOME
  dtaNasc: varchar("dtaNasc", { length: 20 }),                   // DTA_NASC
  cpf: varchar("cpf", { length: 20 }),                           // CPF
  ddd01: varchar("ddd01", { length: 5 }),
  tel01: varchar("tel01", { length: 20 }),
  ddd02: varchar("ddd02", { length: 5 }),
  tel02: varchar("tel02", { length: 20 }),
  ddd03: varchar("ddd03", { length: 5 }),
  tel03: varchar("tel03", { length: 20 }),
  ddd04: varchar("ddd04", { length: 5 }),
  tel04: varchar("tel04", { length: 20 }),
  ddd05: varchar("ddd05", { length: 5 }),
  tel05: varchar("tel05", { length: 20 }),
  ddd06: varchar("ddd06", { length: 5 }),
  tel06: varchar("tel06", { length: 20 }),
  ddd07: varchar("ddd07", { length: 5 }),
  tel07: varchar("tel07", { length: 20 }),
  ddd08: varchar("ddd08", { length: 5 }),
  tel08: varchar("tel08", { length: 20 }),
  ddd09: varchar("ddd09", { length: 5 }),
  tel09: varchar("tel09", { length: 20 }),
  ddd10: varchar("ddd10", { length: 5 }),
  tel10: varchar("tel10", { length: 20 }),
  mci: varchar("mci", { length: 30 }),                           // MCI
  cdIdfr: varchar("cdIdfr", { length: 30 }),                     // CD_IDFR_BNFC
  dtPrimeiroPagto: varchar("dtPrimeiroPagto", { length: 20 }),   // DT_PRIMEIRO_PAGTO
  maiorLimiteCredito: varchar("maiorLimiteCredito", { length: 30 }), // MAIOR_LIMITE_DE_CREDITO_NOVO
  codCoban: varchar("codCoban", { length: 20 }),                 // Cod_COBAN
  campanha: varchar("campanha", { length: 100 }),                // CAMPANHA
  agente: varchar("agente", { length: 100 }),                    // AGENTE
  dataContato: varchar("dataContato", { length: 20 }),           // DATA
  resultado: varchar("resultado", { length: 200 }),              // RESULTADO
  dataInserido: varchar("dataInserido", { length: 20 }),         // DATA Inserido
  observacao: text("observacao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  nomeIdx: index("idx_crm_nome").on(table.nome),
  cpfIdx: index("idx_crm_cpf").on(table.cpf),
  agenteIdx: index("idx_crm_agente").on(table.agente),
  cidadeIdx: index("idx_crm_cidade").on(table.cidade),
  sgUfIdx: index("idx_crm_sgUf").on(table.sgUf),
}));
export type Crm = typeof crm.$inferSelect;
export type InsertCrm = typeof crm.$inferInsert;

/**
 * Templates de Permissão por Cargo
 * Define as permissões padrão para cada cargo (Promotor, Admin, CEO, etc.)
 * Usado como base ao carregar permissões de agentes sem configuração individual
 */
export const cargoPermissoes = mysqlTable('cargo_permissoes', {
  id: int("id").autoincrement().primaryKey(),
  cargo: varchar("cargo", { length: 100 }).notNull().unique(),
  nivelGeral: varchar("nivelGeral", { length: 50 }).default('sem_acesso'),
  permissoesModulos: text("permissoesModulos"), // JSON com mapa de módulos
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CargoPermissao = typeof cargoPermissoes.$inferSelect;
export type InsertCargoPermissao = typeof cargoPermissoes.$inferInsert;

/**
 * Tabela de Períodos Travados
 * Registra quais meses estão travados para edição em cada módulo de produção.
 * Todo dia 25 do mês corrente, o mês anterior (e todos os anteriores) são travados.
 * Módulos: consignado, consorcio, conta_corrente, ourocap, seguros, bbdental, producao
 */
export const periodosTravados = mysqlTable('periodos_travados', {
  id: int("id").autoincrement().primaryKey(),
  mesAno: varchar("mesAno", { length: 7 }).notNull(),    // MM/AAAA
  modulo: varchar("modulo", { length: 50 }).notNull(),   // consignado | consorcio | conta_corrente | ourocap | seguros | bbdental | producao | todos
  travadoPor: varchar("travadoPor", { length: 100 }),    // ChaveJ ou 'sistema'
  travadoEm: timestamp("travadoEm").defaultNow().notNull(),
  destravadoPor: varchar("destravadoPor", { length: 100 }), // ChaveJ de quem destravou (se desbloqueado manualmente)
  destravadoEm: timestamp("destravadoEm"),
  ativo: tinyint("ativo").default(1).notNull(),          // 1=travado, 0=destravado
}, (table) => ({
  mesAnoModuloIdx: index("idx_periodos_travados_mesAno_modulo").on(table.mesAno, table.modulo),
  ativoIdx: index("idx_periodos_travados_ativo").on(table.ativo),
}));
export type PeriodoTravado = typeof periodosTravados.$inferSelect;
export type InsertPeriodoTravado = typeof periodosTravados.$inferInsert;

/**
 * Caixa de Recados
 * Mensagens enviadas por agentes para CEO, Admin, Supervisor ou Suporte.
 * CEO pode ler todos os recados independente do destinatário.
 */
export const recados = mysqlTable('recados', {
  id: int("id").autoincrement().primaryKey(),
  remetenteId: int("remetenteId").notNull(),
  remetenteNome: varchar("remetenteNome", { length: 255 }).notNull(),
  remetenteChaveJ: varchar("remetenteChaveJ", { length: 50 }),
  destinatario: varchar("destinatario", { length: 50 }).notNull(), // ceo | admin | supervisor | suporte | promotor
  destinatarioId: int("destinatarioId"), // ID do agente quando destinatario = 'promotor'
  destinatarioNome: varchar("destinatarioNome", { length: 255 }), // Nome do agente quando destinatario = 'promotor'
  assunto: varchar("assunto", { length: 255 }),
  mensagem: text("mensagem").notNull(),
  lido: tinyint("lido").default(0).notNull(),
  lidoEm: timestamp("lidoEm"),
  lidoPor: varchar("lidoPor", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  destinatarioIdx: index("idx_recados_destinatario").on(table.destinatario),
  remetenteIdx: index("idx_recados_remetenteId").on(table.remetenteId),
  lidoIdx: index("idx_recados_lido").on(table.lido),
}));
export type Recado = typeof recados.$inferSelect;
export type InsertRecado = typeof recados.$inferInsert;

/**
 * Controle de exibição da tela de boas-vindas comemorativa
 * Garante que cada agente veja apenas uma vez
 */
export const boasVindasVisto = mysqlTable('boas_vindas_visto', {
  id: int("id").autoincrement().primaryKey(),
  agenteId: int("agenteId").notNull().unique(),
  chaveJ: varchar("chaveJ", { length: 50 }),
  vistoEm: timestamp("vistoEm").defaultNow().notNull(),
}, (table) => ({
  agenteIdIdx: index("idx_boas_vindas_agenteId").on(table.agenteId),
}));
export type BoasVindasVisto = typeof boasVindasVisto.$inferSelect;

// ============================================================================
// COMUNICADOS COM ARQUIVO (prints, fotos, documentos)
// ============================================================================
export const comunicados = mysqlTable("comunicados", {
  id: int("id").autoincrement().primaryKey(),
  remetenteId: int("remetenteId").notNull(),
  remetenteNome: varchar("remetenteNome", { length: 255 }),
  remetenteChaveJ: varchar("remetenteChaveJ", { length: 50 }),
  tipoDestinatario: mysqlEnum("tipoDestinatario", ["todos", "promotores", "especifico"]).notNull().default("todos"),
  destinatarioId: int("destinatarioId"),
  destinatarioNome: varchar("destinatarioNome", { length: 255 }),
  titulo: varchar("titulo", { length: 255 }),
  descricao: text("descricao"),
  arquivoUrl: text("arquivoUrl"),
  arquivoKey: text("arquivoKey"),
  arquivoTipo: varchar("arquivoTipo", { length: 100 }),
  arquivoNome: varchar("arquivoNome", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const comunicadosLidos = mysqlTable("comunicados_lidos", {
  id: int("id").autoincrement().primaryKey(),
  comunicadoId: int("comunicadoId").notNull(),
  agenteId: int("agenteId").notNull(),
  lidoEm: timestamp("lidoEm").defaultNow().notNull(),
});


// ── Extratos Bancários ────────────────────────────────────────────────────────
/**
 * Contas Bancárias
 * Cadastro das contas bancárias das empresas (BMF e FLEX)
 */
export const contasBancarias = mysqlTable("contasBancarias", {
  id: int("id").autoincrement().primaryKey(),
  empresa: varchar("empresa", { length: 10 }).notNull(),           // BMF ou FLEX
  banco: varchar("banco", { length: 100 }).notNull(),              // Nome do banco
  agencia: varchar("agencia", { length: 20 }),
  conta: varchar("conta", { length: 30 }),
  tipoConta: varchar("tipoConta", { length: 50 }),                 // Corrente, Poupança, etc.
  descricao: varchar("descricao", { length: 255 }),
  ativa: tinyint("ativa").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ContaBancaria = typeof contasBancarias.$inferSelect;
export type InsertContaBancaria = typeof contasBancarias.$inferInsert;

/**
 * Lançamentos de Extratos Bancários
 * Importados via OFX ou lançados manualmente
 */
export const extratosBancarios = mysqlTable("extratosBancarios", {
  id: int("id").autoincrement().primaryKey(),
  contaId: int("contaId").notNull(),                               // FK para contasBancarias
  empresa: varchar("empresa", { length: 10 }).notNull(),           // BMF ou FLEX (redundante para filtros rápidos)
  data: varchar("data", { length: 10 }).notNull(),                 // DD/MM/AAAA
  descricao: varchar("descricao", { length: 500 }).notNull(),
  valor: decimal("valor", { precision: 15, scale: 2 }).notNull(),  // Positivo = crédito, Negativo = débito
  tipo: varchar("tipo", { length: 10 }).notNull(),                 // CRÉDITO ou DÉBITO
  categoria: varchar("categoria", { length: 100 }),                // Classificação manual
  numeroDocumento: varchar("numeroDocumento", { length: 100 }),    // Número do documento/transação
  saldo: decimal("saldo", { precision: 15, scale: 2 }),            // Saldo após lançamento
  origem: varchar("origem", { length: 20 }).default("MANUAL"),     // MANUAL, OFX, OPENFINANCE
  mesRef: varchar("mesRef", { length: 7 }),                        // MM/AAAA para filtro
  observacoes: text("observacoes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ExtratoBancario = typeof extratosBancarios.$inferSelect;
export type InsertExtratoBancario = typeof extratosBancarios.$inferInsert;

// ── Contratos PDF ─────────────────────────────────────────────────────────────
/**
 * Contratos
 * Armazena contratos PDF enviados pelos agentes/admin com dados extraídos via IA
 */
export const contratos = mysqlTable("contratos", {
  id: int("id").autoincrement().primaryKey(),
  // Arquivo
  fileKey: varchar("fileKey", { length: 500 }).notNull(),       // Chave S3 do PDF
  fileUrl: varchar("fileUrl", { length: 500 }).notNull(),       // URL de acesso ao PDF
  nomeArquivo: varchar("nomeArquivo", { length: 255 }),         // Nome original do arquivo
  // Dados extraídos via IA
  numeroProposta: varchar("numeroProposta", { length: 50 }),    // Número da proposta
  linhaCredito: varchar("linhaCredito", { length: 100 }),       // Linha de crédito
  taxaMensalJuros: decimal("taxaMensalJuros", { precision: 10, scale: 4 }), // Taxa mensal %
  prazoMeses: int("prazoMeses"),                                // Prazo em meses
  valorSolicitado: decimal("valorSolicitado", { precision: 15, scale: 2 }),
  valorTotalEmprestimo: decimal("valorTotalEmprestimo", { precision: 15, scale: 2 }),
  valorParcela: decimal("valorParcela", { precision: 15, scale: 2 }),
  valorTotalParcelas: decimal("valorTotalParcelas", { precision: 15, scale: 2 }),
  nomeCliente: varchar("nomeCliente", { length: 255 }),
  cpfCliente: varchar("cpfCliente", { length: 20 }),
  nrConvenio: varchar("nrConvenio", { length: 50 }),
  nomeConvenio: varchar("nomeConvenio", { length: 150 }),
  dataPrimeiraParcela: varchar("dataPrimeiraParcela", { length: 20 }),
  dataUltimaParcela: varchar("dataUltimaParcela", { length: 20 }),
  telefoneManuais: text("telefoneManuais"),                     // Telefones adicionados manualmente (separados por vírgula)
  agencia: varchar("agencia", { length: 20 }),                   // Agência bancária do cliente
  conta: varchar("conta", { length: 30 }),                       // Conta bancária do cliente
  // Rastreabilidade
  chaveJOperador: varchar("chaveJOperador", { length: 50 }),    // ChaveJ do operador
  nomeOperador: varchar("nomeOperador", { length: 255 }),
  empresa: varchar("empresa", { length: 100 }),
    statusExtracao: varchar("statusExtracao", { length: 20 }).default("pendente"), // pendente | ok | erro
  erroExtracao: text("erroExtracao"),
  uploadPorId: int("uploadPorId"),                              // FK users.id
  // CRM Refinanciamento
  anotacaoCrm: text("anotacaoCrm"),                            // Anotação do contato de refinanciamento
  dataContatoCrm: varchar("dataContatoCrm", { length: 20 }),   // Data do contato
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  propostaIdx: index("idx_contratos_proposta").on(table.numeroProposta),
  chaveJIdx: index("idx_contratos_chaveJ").on(table.chaveJOperador),
}));
export type Contrato = typeof contratos.$inferSelect;
export type InsertContrato = typeof contratos.$inferInsert;

// ─── Lista Não Perturbe ───────────────────────────────────────────────────────
export const listaNaoPerturbe = mysqlTable("lista_nao_perturbe", {
  id: int("id").autoincrement().primaryKey(),
  telefone: varchar("telefone", { length: 20 }).notNull(),
  telefoneFormatado: varchar("telefoneFormatado", { length: 25 }),
  motivo: varchar("motivo", { length: 255 }),
  origem: varchar("origem", { length: 50 }).default("manual"),
  adicionadoPorId: int("adicionadoPorId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  telefoneIdx: index("idx_nao_perturbe_telefone").on(table.telefone),
}));
export type ListaNaoPerturbe = typeof listaNaoPerturbe.$inferSelect;
export type InsertListaNaoPerturbe = typeof listaNaoPerturbe.$inferInsert;


// ─── Agências Banco do Brasil ─────────────────────────────────────────────────
export const agenciasBb = mysqlTable("agencias_bb", {
  id: int("id").autoincrement().primaryKey(),
  prefixo: int("prefixo").notNull(),
  nome: varchar("nome", { length: 200 }).notNull(),
  createdAt: bigint("createdAt", { mode: "number" }).notNull().default(sql`(UNIX_TIMESTAMP() * 1000)`),
}, (table) => ({
  prefixoIdx: index("idx_agencias_prefixo").on(table.prefixo),
  nomeIdx: index("idx_agencias_nome").on(table.nome),
}));
export type AgenciaBb = typeof agenciasBb.$inferSelect;
export type InsertAgenciaBb = typeof agenciasBb.$inferInsert;
