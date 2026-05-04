-- Migração: Criar esquema completo do sistema de gestão Grupo Firme e Forte

-- Tabela: Agentes
CREATE TABLE IF NOT EXISTS agentes (
    id SERIAL PRIMARY KEY,
    num_cadastro VARCHAR(50) UNIQUE,
    empresa VARCHAR(100),
    chave_j VARCHAR(50) UNIQUE,
    senha VARCHAR(255),
    nome_agente VARCHAR(255) NOT NULL,
    data_admissao DATE,
    cargo VARCHAR(100),
    area VARCHAR(100),
    vinculo VARCHAR(100),
    situacao VARCHAR(50),
    nr_agencia VARCHAR(50),
    cidade VARCHAR(100),
    uf VARCHAR(2),
    supervisor VARCHAR(255),
    email VARCHAR(255),
    favorecido VARCHAR(255),
    banco VARCHAR(100),
    agencia VARCHAR(50),
    conta VARCHAR(50),
    tipo VARCHAR(50),
    cpf_agente VARCHAR(14) UNIQUE,
    pix VARCHAR(255),
    data_nascimento DATE,
    celular VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: Certificações
CREATE TABLE IF NOT EXISTS certificacoes (
    id SERIAL PRIMARY KEY,
    agente_id INTEGER NOT NULL,
    cadastro VARCHAR(50),
    chave_j VARCHAR(50),
    nome_agente VARCHAR(255),
    cpf VARCHAR(14),
    situacao VARCHAR(50),
    data_certif DATE,
    vencto_certif DATE,
    dias_faltando INTEGER,
    situacao_certif VARCHAR(50),
    nr_certificado_consig VARCHAR(100),
    data_certif2 DATE,
    vencto_certif3 DATE,
    dias_faltando2 INTEGER,
    situacao_certif3 VARCHAR(50),
    nr_certificado_pldft VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agente_id) REFERENCES agentes(id) ON DELETE CASCADE
);

-- Tabela: Fornecedores
CREATE TABLE IF NOT EXISTS fornecedores (
    id SERIAL PRIMARY KEY,
    num_cadastro VARCHAR(50) UNIQUE,
    empresa VARCHAR(100),
    nome_fornecedor VARCHAR(255) NOT NULL,
    cpf_cnpj VARCHAR(18) UNIQUE,
    situacao VARCHAR(50),
    contato VARCHAR(255),
    email VARCHAR(255),
    telefone VARCHAR(20),
    celular VARCHAR(20),
    endereco VARCHAR(255),
    cidade VARCHAR(100),
    uf VARCHAR(2),
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: Tabelas de Comissão
CREATE TABLE IF NOT EXISTS tabelas_comissao (
    id SERIAL PRIMARY KEY,
    empresa VARCHAR(100),
    faixa_1 DECIMAL(10, 4),
    faixa_2 DECIMAL(10, 4),
    faixa_3 DECIMAL(10, 4),
    faixa_4 DECIMAL(10, 4),
    faixa_5 DECIMAL(10, 4),
    tabela_calculo VARCHAR(100),
    referencia VARCHAR(255),
    tx_juros DECIMAL(10, 4),
    meses_minimo INTEGER,
    meses_maximo INTEGER,
    valor_minimo DECIMAL(15, 2),
    valor_maximo DECIMAL(15, 2),
    agente_jefinho DECIMAL(10, 4),
    agente_guilherme DECIMAL(10, 4),
    agente_kelly DECIMAL(10, 4),
    agente_amauricio DECIMAL(10, 4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: Consignados (Operações)
CREATE TABLE IF NOT EXISTS consignados (
    id SERIAL PRIMARY KEY,
    mes_ano VARCHAR(10),
    chave_j VARCHAR(50),
    nome_agente VARCHAR(255),
    nr_operacao VARCHAR(100),
    parcelas INTEGER,
    convenio VARCHAR(100),
    juros DECIMAL(10, 4),
    valor_liquido DECIMAL(15, 2),
    percentual DECIMAL(10, 4),
    comissao DECIMAL(15, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: Contas Correntes (Operações)
CREATE TABLE IF NOT EXISTS contas_correntes (
    id SERIAL PRIMARY KEY,
    empresa VARCHAR(100),
    mes_ano VARCHAR(10),
    chave_j VARCHAR(50),
    agente VARCHAR(255),
    agencia VARCHAR(50),
    conta_corrente VARCHAR(50),
    tipo_serv VARCHAR(100),
    data_operacao DATE,
    produto VARCHAR(100),
    modalidade VARCHAR(100),
    ag_relacionamento VARCHAR(255),
    rbm DECIMAL(15, 2),
    perc_comissao DECIMAL(10, 4),
    comissao DECIMAL(15, 2),
    supervisor VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: Consórcios (Operações)
CREATE TABLE IF NOT EXISTS consorcios (
    id SERIAL PRIMARY KEY,
    mes_ano VARCHAR(10),
    chave_j VARCHAR(50),
    nome_agente VARCHAR(255),
    nr_operacao VARCHAR(100),
    parcelas INTEGER,
    segmento VARCHAR(100),
    valor_bem DECIMAL(15, 2),
    comissao DECIMAL(15, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: OuroCap (Operações)
CREATE TABLE IF NOT EXISTS ourocap (
    id SERIAL PRIMARY KEY,
    empresa VARCHAR(100),
    mes_ano VARCHAR(10),
    chave_j VARCHAR(50),
    nome_agente VARCHAR(255),
    proposta VARCHAR(100),
    cpf_cliente VARCHAR(14),
    dt_venda DATE,
    dt_debito DATE,
    cod_produto VARCHAR(50),
    vr_produto DECIMAL(15, 2),
    rbm DECIMAL(15, 2),
    comissao DECIMAL(15, 2),
    supervisor VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: Seguros (Operações)
CREATE TABLE IF NOT EXISTS seguros (
    id SERIAL PRIMARY KEY,
    empresa VARCHAR(100),
    mes_ano VARCHAR(10),
    chave_j VARCHAR(50),
    nome_agente VARCHAR(255),
    dt_operacao DATE,
    prazo INTEGER,
    banco VARCHAR(100),
    nr_contrato VARCHAR(100),
    vr_emprestimo DECIMAL(15, 2),
    refinanciado BOOLEAN,
    dt_pagto DATE,
    digitado_por VARCHAR(255),
    vr_comissao DECIMAL(15, 2),
    perc_comissao DECIMAL(10, 4),
    incremento DECIMAL(10, 4),
    parcela INTEGER,
    comissao_agente DECIMAL(15, 2),
    observacao TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: Pagamentos
CREATE TABLE IF NOT EXISTS pagamentos (
    id SERIAL PRIMARY KEY,
    empresa VARCHAR(100),
    mes_ano VARCHAR(10),
    tipo_pagamento VARCHAR(100),
    total DECIMAL(15, 2),
    menor_maior VARCHAR(50),
    agente_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agente_id) REFERENCES agentes(id) ON DELETE SET NULL
);

-- Tabela: Cálculos Consolidados
CREATE TABLE IF NOT EXISTS calculos (
    id SERIAL PRIMARY KEY,
    mes_ref VARCHAR(10),
    empresa VARCHAR(100),
    chave_j VARCHAR(50),
    nome_agente VARCHAR(255),
    cidade VARCHAR(100),
    situacao VARCHAR(50),
    percentual DECIMAL(10, 4),
    comissao_total DECIMAL(15, 2),
    rbm_total DECIMAL(15, 2),
    comissao_consig DECIMAL(15, 2),
    comissao_consorcio DECIMAL(15, 2),
    comissao_ourocap DECIMAL(15, 2),
    comissao_cc DECIMAL(15, 2),
    ajuda_custo DECIMAL(15, 2),
    creditos_debitos DECIMAL(15, 2),
    adiantamento DECIMAL(15, 2),
    reajuste DECIMAL(15, 2),
    comissao_supervisor DECIMAL(15, 2),
    rbm_credito_c2 DECIMAL(15, 2),
    rbm_conta_corrente DECIMAL(15, 2),
    rbm_consorcio_c2 DECIMAL(15, 2),
    rbm_ourocap DECIMAL(15, 2),
    qtde_contas INTEGER,
    vr_liquido_c2 DECIMAL(15, 2),
    srcc_c2 DECIMAL(15, 2),
    vr_liquido_srcc DECIMAL(15, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: Produção Banco do Brasil
CREATE TABLE IF NOT EXISTS producao_bb (
    id SERIAL PRIMARY KEY,
    mes_data VARCHAR(10),
    empresa VARCHAR(100),
    rec_consignado DECIMAL(15, 2),
    rec_pro_rata DECIMAL(15, 2),
    rec_cc DECIMAL(15, 2),
    rec_consorcio DECIMAL(15, 2),
    rec_ourocap DECIMAL(15, 2),
    rec_seguro DECIMAL(15, 2),
    prt_seguro DECIMAL(15, 2),
    rec_bonus DECIMAL(15, 2),
    rec_creditos DECIMAL(15, 2),
    desc_debitos DECIMAL(15, 2),
    rec_total DECIMAL(15, 2),
    vr_liquido DECIMAL(15, 2),
    qtde_op_credito INTEGER,
    qtde_op_cc INTEGER,
    qtde_op_consorcio INTEGER,
    qtde_op_ourocap INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: Extratos Consignados
CREATE TABLE IF NOT EXISTS extratos_consignados (
    id SERIAL PRIMARY KEY,
    mes_ano VARCHAR(10),
    chave_j VARCHAR(50),
    nome_agente VARCHAR(255),
    nr_operacao VARCHAR(100),
    parcelas INTEGER,
    convenio VARCHAR(100),
    juros DECIMAL(10, 4),
    valor_liquido DECIMAL(15, 2),
    percentual DECIMAL(10, 4),
    comissao DECIMAL(15, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: Extratos Contas Correntes
CREATE TABLE IF NOT EXISTS extratos_contas (
    id SERIAL PRIMARY KEY,
    mes_ano VARCHAR(10),
    agencia VARCHAR(50),
    chave_j VARCHAR(50),
    nome VARCHAR(255),
    comissao DECIMAL(15, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: Extratos Consórcios
CREATE TABLE IF NOT EXISTS extratos_consorcios (
    id SERIAL PRIMARY KEY,
    mes_ano VARCHAR(10),
    chave_j VARCHAR(50),
    nome VARCHAR(255),
    nr_operacao VARCHAR(100),
    parcelas INTEGER,
    segmento VARCHAR(100),
    valor_bem DECIMAL(15, 2),
    comissao DECIMAL(15, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: Extratos OuroCap
CREATE TABLE IF NOT EXISTS extratos_ourocap (
    id SERIAL PRIMARY KEY,
    mes_ano VARCHAR(10),
    chave_j VARCHAR(50),
    nome VARCHAR(255),
    nr_operacao VARCHAR(100),
    valor_liquido DECIMAL(15, 2),
    comissao DECIMAL(15, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: Documentação
CREATE TABLE IF NOT EXISTS documentacao (
    id SERIAL PRIMARY KEY,
    empresa VARCHAR(100),
    situacao VARCHAR(50),
    nome_documento VARCHAR(255),
    finalidade VARCHAR(255),
    na_pasta VARCHAR(255),
    area VARCHAR(100),
    responsavel_documento VARCHAR(255),
    aprovador VARCHAR(255),
    versao VARCHAR(50),
    data_criacao DATE,
    publicacao_atual VARCHAR(50),
    data_atualizacao DATE,
    codigo_documento VARCHAR(100),
    fluxo_aprovacao VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para melhor performance
CREATE INDEX idx_agentes_chave_j ON agentes(chave_j);
CREATE INDEX idx_agentes_cpf ON agentes(cpf_agente);
CREATE INDEX idx_agentes_empresa ON agentes(empresa);
CREATE INDEX idx_certificacoes_agente_id ON certificacoes(agente_id);
CREATE INDEX idx_certificacoes_vencto ON certificacoes(vencto_certif);
CREATE INDEX idx_consignados_mes_ano ON consignados(mes_ano);
CREATE INDEX idx_contas_correntes_mes_ano ON contas_correntes(mes_ano);
CREATE INDEX idx_consorcios_mes_ano ON consorcios(mes_ano);
CREATE INDEX idx_ourocap_mes_ano ON ourocap(mes_ano);
CREATE INDEX idx_seguros_mes_ano ON seguros(mes_ano);
CREATE INDEX idx_pagamentos_mes_ano ON pagamentos(mes_ano);
CREATE INDEX idx_calculos_mes_ref ON calculos(mes_ref);
CREATE INDEX idx_producao_bb_mes_data ON producao_bb(mes_data);
