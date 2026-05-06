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
  index
} from "drizzle-orm/mysql-core";

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
export const agentes = mysqlTable("agentes", {
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
  banco: varchar("banco", { length: 100 }),
  agencia: varchar("agencia", { length: 50 }),
  conta: varchar("conta", { length: 50 }),
  tipo: varchar("tipo", { length: 50 }),
  cpfAgente: varchar("cpfAgente", { length: 14 }).unique(),
  pix: varchar("pix", { length: 255 }),
  dataNascimento: varchar("dataNascimento", { length: 10 }), // YYYY-MM-DD format
  celular: varchar("celular", { length: 20 }),
  permissoes: varchar("permissoes", { length: 50 }).default("leitor"), // admin, editor, leitor, sem_acesso
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
  agenteId: int("agenteId").notNull(),
  cadastro: varchar("cadastro", { length: 50 }),
  chaveJ: varchar("chaveJ", { length: 50 }),
  nomeAgente: varchar("nomeAgente", { length: 255 }),
  cpf: varchar("cpf", { length: 14 }),
  situacao: varchar("situacao", { length: 50 }),
  dataCertif: date("dataCertif"),
  ventoCertif: date("ventoCertif"),
  diasFaltando: int("diasFaltando"),
  situacaoCertif: varchar("situacaoCertif", { length: 50 }),
  nrCertificadoConsig: varchar("nrCertificadoConsig", { length: 100 }),
  dataCertif2: date("dataCertif2"),
  ventoCertif3: date("ventoCertif3"),
  diasFaltando2: int("diasFaltando2"),
  situacaoCertif3: varchar("situacaoCertif3", { length: 50 }),
  nrCertificadoPldft: varchar("nrCertificadoPldft", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  agenteIdx: index("idx_certificacoes_agente").on(table.agenteId),
  ventIdx: index("idx_certificacoes_vencto").on(table.ventoCertif),
}));

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
 * Tabela de Tabelas de Comissão
 * Define as faixas e percentuais de comissão
 */
export const tabelasComissao = mysqlTable("tabelasComissao", {
  id: int("id").autoincrement().primaryKey(),
  empresa: varchar("empresa", { length: 100 }),
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
  ativo02: varchar("ativo02", { length: 20 }),
  ativo03: varchar("ativo03", { length: 20 }),
  ativo04: varchar("ativo04", { length: 20 }),
  ativo05: varchar("ativo05", { length: 20 }),
  ativo06: varchar("ativo06", { length: 20 }),
  ativo07: varchar("ativo07", { length: 20 }),
  ativo08: varchar("ativo08", { length: 20 }),
  ativo09: varchar("ativo09", { length: 20 }),
  ativo10: varchar("ativo10", { length: 20 }),
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
  mesAno: varchar("mesAno", { length: 10 }),
  chaveJ: varchar("chaveJ", { length: 50 }),
  nomeAgente: varchar("nomeAgente", { length: 255 }),
  nrOperacao: varchar("nrOperacao", { length: 100 }),
  parcelas: int("parcelas"),
  segmento: varchar("segmento", { length: 100 }),
  valorBem: decimal("valorBem", { precision: 15, scale: 2 }),
  comissao: decimal("comissao", { precision: 15, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  mesAnoIdx: index("idx_consorcios_mesAno").on(table.mesAno),
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
 */
export const pagamentos = mysqlTable("pagamentos", {
  id: int("id").autoincrement().primaryKey(),
  empresa: varchar("empresa", { length: 100 }),
  mesAno: varchar("mesAno", { length: 10 }),
  tipoPagamento: varchar("tipoPagamento", { length: 100 }),
  total: decimal("total", { precision: 15, scale: 2 }),
  menorMaior: varchar("menorMaior", { length: 50 }),
  agenteId: int("agenteId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  mesAnoIdx: index("idx_pagamentos_mesAno").on(table.mesAno),
}));

export type Pagamento = typeof pagamentos.$inferSelect;
export type InsertPagamento = typeof pagamentos.$inferInsert;

/**
 * Tabela de Cálculos Consolidados
 */
export const calculos = mysqlTable("calculos", {
  id: int("id").autoincrement().primaryKey(),
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
  ajudaCusto: decimal("ajudaCusto", { precision: 15, scale: 2 }),
  creditosDebitos: decimal("creditosDebitos", { precision: 15, scale: 2 }),
  adiantamento: decimal("adiantamento", { precision: 15, scale: 2 }),
  reajuste: decimal("reajuste", { precision: 15, scale: 2 }),
  comissaoSupervisor: decimal("comissaoSupervisor", { precision: 15, scale: 2 }),
  rbmCreditoC2: decimal("rbmCreditoC2", { precision: 15, scale: 2 }),
  rbmContaCorrente: decimal("rbmContaCorrente", { precision: 15, scale: 2 }),
  rbmConsorcioC2: decimal("rbmConsorcioC2", { precision: 15, scale: 2 }),
  rbmOurocap: decimal("rbmOurocap", { precision: 15, scale: 2 }),
  qtdeContas: int("qtdeContas"),
  vrLiquidoC2: decimal("vrLiquidoC2", { precision: 15, scale: 2 }),
  srccC2: decimal("srccC2", { precision: 15, scale: 2 }),
  vrLiquidoSrcc: decimal("vrLiquidoSrcc", { precision: 15, scale: 2 }),
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
  ativo02: decimal("ativo02", { precision: 10, scale: 2 }).default("0.00"),
  ativo03: decimal("ativo03", { precision: 10, scale: 2 }).default("0.00"),
  ativo04: decimal("ativo04", { precision: 10, scale: 2 }).default("0.00"),
  ativo05: decimal("ativo05", { precision: 10, scale: 2 }).default("0.00"),
  ativo06: decimal("ativo06", { precision: 10, scale: 2 }).default("0.00"),
  ativo07: decimal("ativo07", { precision: 10, scale: 2 }).default("0.00"),
  ativo08: decimal("ativo08", { precision: 10, scale: 2 }).default("0.00"),
  ativo09: decimal("ativo09", { precision: 10, scale: 2 }).default("0.00"),
  ativo10: decimal("ativo10", { precision: 10, scale: 2 }).default("0.00"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ValoresCalculo = typeof valoresCalculo.$inferSelect;
export type InsertValoresCalculo = typeof valoresCalculo.$inferInsert;


/**
 * Tabela de Relatório de Produção BB (Febraban)
 * Armazena dados do relatório de produção do Banco do Brasil
 */
export const relatorioBB = mysqlTable("relatorioBB", {
  id: int("id").autoincrement().primaryKey(),
  bmf: varchar("bmf", { length: 50 }),
  mes: int("mes"),
  proposta: varchar("proposta", { length: 100 }),
  linha: varchar("linha", { length: 100 }),
  situacao: varchar("situacao", { length: 100 }),
  operador: varchar("operador", { length: 100 }),
  solicitacao: date("solicitacao"),
  prazo: varchar("prazo", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  propostaIdx: index("idx_relatorioBB_proposta").on(table.proposta),
  situacaoIdx: index("idx_relatorioBB_situacao").on(table.situacao),
}));

export type RelatorioBB = typeof relatorioBB.$inferSelect;
export type InsertRelatorioBB = typeof relatorioBB.$inferInsert;
