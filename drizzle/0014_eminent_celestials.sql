CREATE TABLE `agentes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`numCadastro` varchar(50),
	`empresa` varchar(100),
	`chaveJ` varchar(50),
	`senha` varchar(255),
	`nomeAgente` varchar(255) NOT NULL,
	`dataAdmissao` varchar(10),
	`cargo` varchar(100),
	`area` varchar(100),
	`vinculo` varchar(100),
	`situacao` varchar(50),
	`nivel` varchar(10),
	`nrAgencia` varchar(50),
	`cidade` varchar(100),
	`uf` varchar(2),
	`supervisor` varchar(255),
	`email` varchar(255),
	`favorecido` varchar(255),
	`banco` varchar(100),
	`agencia` varchar(50),
	`conta` varchar(50),
	`tipo` varchar(50),
	`cpfAgente` varchar(14),
	`pix` varchar(255),
	`dataNascimento` varchar(10),
	`celular` varchar(20),
	`permissoes` varchar(50) DEFAULT 'leitor',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agentes_id` PRIMARY KEY(`id`),
	CONSTRAINT `agentes_numCadastro_unique` UNIQUE(`numCadastro`),
	CONSTRAINT `agentes_chaveJ_unique` UNIQUE(`chaveJ`),
	CONSTRAINT `agentes_cpfAgente_unique` UNIQUE(`cpfAgente`)
);
--> statement-breakpoint
CREATE TABLE `auditoria` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agenteId` int NOT NULL,
	`chaveJ` varchar(50) NOT NULL,
	`nomeAgente` varchar(255) NOT NULL,
	`numeroEntrada` varchar(50) NOT NULL,
	`horarioEntrada` timestamp NOT NULL DEFAULT (now()),
	`horarioSaida` timestamp,
	`modulo` varchar(100),
	`acao` varchar(100),
	`descricao` text,
	`tabela` varchar(100),
	`registroId` int,
	`valorAnterior` text,
	`valorNovo` text,
	`ipAddress` varchar(50),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `auditoria_id` PRIMARY KEY(`id`),
	CONSTRAINT `auditoria_numeroEntrada_unique` UNIQUE(`numeroEntrada`)
);
--> statement-breakpoint
CREATE TABLE `calculos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mesRef` varchar(10),
	`empresa` varchar(100),
	`chaveJ` varchar(50),
	`nomeAgente` varchar(255),
	`cidade` varchar(100),
	`situacao` varchar(50),
	`percentual` decimal(10,4),
	`comissaoTotal` decimal(15,2),
	`rbmTotal` decimal(15,2),
	`comissaoConsig` decimal(15,2),
	`comissaoConsorcio` decimal(15,2),
	`comissaoOurocap` decimal(15,2),
	`comissaoCc` decimal(15,2),
	`ajudaCusto` decimal(15,2),
	`creditosDebitos` decimal(15,2),
	`adiantamento` decimal(15,2),
	`reajuste` decimal(15,2),
	`comissaoSupervisor` decimal(15,2),
	`rbmCreditoC2` decimal(15,2),
	`rbmContaCorrente` decimal(15,2),
	`rbmConsorcioC2` decimal(15,2),
	`rbmOurocap` decimal(15,2),
	`qtdeContas` int,
	`vrLiquidoC2` decimal(15,2),
	`srccC2` decimal(15,2),
	`vrLiquidoSrcc` decimal(15,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `calculos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `certificacoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agenteId` int NOT NULL,
	`cadastro` varchar(50),
	`chaveJ` varchar(50),
	`nomeAgente` varchar(255),
	`cpf` varchar(14),
	`situacao` varchar(50),
	`dataCertif` date,
	`ventoCertif` date,
	`diasFaltando` int,
	`situacaoCertif` varchar(50),
	`nrCertificadoConsig` varchar(100),
	`dataCertif2` date,
	`ventoCertif3` date,
	`diasFaltando2` int,
	`situacaoCertif3` varchar(50),
	`nrCertificadoPldft` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `certificacoes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `consignados` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresa` varchar(100),
	`mes` varchar(10),
	`chaveJ` varchar(50),
	`nomeAgente` varchar(255),
	`convenio` varchar(100),
	`nrOperacao` varchar(100),
	`valorBruto` decimal(15,2),
	`valorLiquido` decimal(15,2),
	`rbm` decimal(15,2),
	`parcela` int,
	`prefixoBB` varchar(20),
	`dtContratacao` date,
	`produto` varchar(100),
	`descricaoProduto` varchar(255),
	`juros` decimal(10,4),
	`tabelaMes` varchar(50),
	`percAVista` decimal(10,4),
	`restricaoSRCC` varchar(100),
	`mesAno` varchar(10),
	`percPago` decimal(10,4),
	`totalComissao` decimal(15,2),
	`difEmpresa` decimal(15,2),
	`tabela` varchar(100),
	`supervisor` varchar(255),
	`isDuplicate` boolean NOT NULL DEFAULT false,
	`parcelas` int,
	`percentual` decimal(10,4),
	`comissao` decimal(15,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `consignados_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `consorcios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mesAno` varchar(10),
	`chaveJ` varchar(50),
	`nomeAgente` varchar(255),
	`nrOperacao` varchar(100),
	`parcelas` int,
	`segmento` varchar(100),
	`valorBem` decimal(15,2),
	`comissao` decimal(15,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `consorcios_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contasCorrentes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresa` varchar(100),
	`mesAno` varchar(10),
	`chaveJ` varchar(50),
	`agente` varchar(255),
	`agencia` varchar(50),
	`contaCorrente` varchar(50),
	`tipoServ` varchar(100),
	`dataOperacao` date,
	`produto` varchar(100),
	`modalidade` varchar(100),
	`agRelacionamento` varchar(255),
	`rbm` decimal(15,2),
	`percComissao` decimal(10,4),
	`comissao` decimal(15,2),
	`supervisor` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contasCorrentes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documentacao` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresa` varchar(100),
	`situacao` varchar(50),
	`nomeDocumento` varchar(255),
	`finalidade` varchar(255),
	`naPasta` varchar(255),
	`area` varchar(100),
	`responsavelDocumento` varchar(255),
	`aprovador` varchar(255),
	`versao` varchar(50),
	`dataCriacao` date,
	`publicacaoAtual` varchar(50),
	`dataAtualizacao` date,
	`codigoDocumento` varchar(100),
	`fluxoAprovacao` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `documentacao_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `extratoConsignados` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mesAno` varchar(10),
	`chaveJ` varchar(50),
	`nomeAgente` varchar(255),
	`nrOperacao` varchar(100),
	`parcelas` int,
	`convenio` varchar(100),
	`juros` decimal(10,4),
	`valorLiquido` decimal(15,2),
	`percentual` decimal(10,4),
	`comissao` decimal(15,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `extratoConsignados_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `extratoConsorcios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mesAno` varchar(10),
	`chaveJ` varchar(50),
	`nome` varchar(255),
	`nrOperacao` varchar(100),
	`parcelas` int,
	`segmento` varchar(100),
	`valorBem` decimal(15,2),
	`comissao` decimal(15,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `extratoConsorcios_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `extratoContas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mesAno` varchar(10),
	`agencia` varchar(50),
	`chaveJ` varchar(50),
	`nome` varchar(255),
	`comissao` decimal(15,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `extratoContas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `extratoOurocap` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mesAno` varchar(10),
	`chaveJ` varchar(50),
	`nome` varchar(255),
	`nrOperacao` varchar(100),
	`valorLiquido` decimal(15,2),
	`comissao` decimal(15,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `extratoOurocap_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fornecedores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`numCadastro` varchar(50),
	`empresa` varchar(100),
	`nomeFornecedor` varchar(255) NOT NULL,
	`cpfCnpj` varchar(18),
	`situacao` varchar(50),
	`contato` varchar(255),
	`email` varchar(255),
	`telefone` varchar(20),
	`celular` varchar(20),
	`endereco` varchar(255),
	`cidade` varchar(100),
	`uf` varchar(2),
	`observacoes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fornecedores_id` PRIMARY KEY(`id`),
	CONSTRAINT `fornecedores_numCadastro_unique` UNIQUE(`numCadastro`),
	CONSTRAINT `fornecedores_cpfCnpj_unique` UNIQUE(`cpfCnpj`)
);
--> statement-breakpoint
CREATE TABLE `loginAttempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chaveJ` varchar(50) NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`isBlocked` boolean NOT NULL DEFAULT false,
	`blockedUntil` timestamp,
	`lastAttempt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `loginAttempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mensagens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`remetenteId` int NOT NULL,
	`remetenteNome` varchar(255) NOT NULL,
	`destinatarioId` int,
	`destinatarioNome` varchar(255),
	`conteudo` text NOT NULL,
	`tipo` varchar(50) DEFAULT 'texto',
	`lida` boolean NOT NULL DEFAULT false,
	`grupoChat` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mensagens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ourocap` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresa` varchar(100),
	`mesAno` varchar(10),
	`chaveJ` varchar(50),
	`nomeAgente` varchar(255),
	`proposta` varchar(100),
	`cpfCliente` varchar(14),
	`dtVenda` date,
	`dtDebito` date,
	`codProduto` varchar(50),
	`vrProduto` decimal(15,2),
	`rbm` decimal(15,2),
	`comissao` decimal(15,2),
	`supervisor` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ourocap_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pagamentos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresa` varchar(100),
	`mesAno` varchar(10),
	`tipoPagamento` varchar(100),
	`total` decimal(15,2),
	`menorMaior` varchar(50),
	`agenteId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pagamentos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `producaoBb` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mesData` varchar(10),
	`empresa` varchar(100),
	`recConsignado` decimal(15,2),
	`recProRata` decimal(15,2),
	`recCc` decimal(15,2),
	`recConsorcio` decimal(15,2),
	`recOurocap` decimal(15,2),
	`recSeguro` decimal(15,2),
	`prtSeguro` decimal(15,2),
	`recBonus` decimal(15,2),
	`recCreditos` decimal(15,2),
	`descDebitos` decimal(15,2),
	`recTotal` decimal(15,2),
	`vrLiquido` decimal(15,2),
	`qtdeOpCredito` int,
	`qtdeOpCc` int,
	`qtdeOpConsorcio` int,
	`qtdeOpOurocap` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `producaoBb_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `relatorioBB` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bmf` varchar(50),
	`mes` int,
	`proposta` varchar(100),
	`linha` varchar(100),
	`situacao` varchar(100),
	`operador` varchar(100),
	`solicitacao` date,
	`prazo` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `relatorioBB_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `seguros` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresa` varchar(100),
	`mesAno` varchar(10),
	`chaveJ` varchar(50),
	`nomeAgente` varchar(255),
	`dtOperacao` date,
	`prazo` int,
	`banco` varchar(100),
	`nrContrato` varchar(100),
	`vrEmprestimo` decimal(15,2),
	`refinanciado` boolean,
	`dtPagto` date,
	`digitadoPor` varchar(255),
	`vrComissao` decimal(15,2),
	`percComissao` decimal(10,4),
	`incremento` decimal(10,4),
	`parcela` int,
	`comissaoAgente` decimal(15,2),
	`observacao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `seguros_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agenteId` int NOT NULL,
	`chaveJ` varchar(50) NOT NULL,
	`nomeAgente` varchar(255),
	`horarioConexao` timestamp NOT NULL DEFAULT (now()),
	`ultimoAcesso` timestamp NOT NULL DEFAULT (now()),
	`modulo` varchar(100) DEFAULT 'dashboard',
	`ipAddress` varchar(50),
	`userAgent` text,
	`ativo` tinyint NOT NULL DEFAULT 1,
	`motivoDesconexao` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sessoes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tabelasComissao` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresa` varchar(100),
	`faixa1` varchar(20),
	`faixa2` varchar(20),
	`faixa3` varchar(20),
	`faixa4` varchar(20),
	`faixa5` varchar(20),
	`tabelaCalculo` varchar(20),
	`referencia` varchar(20),
	`convenio` varchar(150),
	`txJurosDe` varchar(20),
	`txJurosAte` varchar(20),
	`valorMinimo` varchar(50),
	`mesesDe` varchar(10),
	`mesesAte` varchar(10),
	`ativo01` varchar(20),
	`ativo02` varchar(20),
	`ativo03` varchar(20),
	`ativo04` varchar(20),
	`ativo05` varchar(20),
	`ativo06` varchar(20),
	`ativo07` varchar(20),
	`ativo08` varchar(20),
	`ativo09` varchar(20),
	`ativo10` varchar(20),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tabelasComissao_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `valoresCalculo` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ativo01` decimal(10,2) DEFAULT '0.00',
	`ativo02` decimal(10,2) DEFAULT '0.00',
	`ativo03` decimal(10,2) DEFAULT '0.00',
	`ativo04` decimal(10,2) DEFAULT '0.00',
	`ativo05` decimal(10,2) DEFAULT '0.00',
	`ativo06` decimal(10,2) DEFAULT '0.00',
	`ativo07` decimal(10,2) DEFAULT '0.00',
	`ativo08` decimal(10,2) DEFAULT '0.00',
	`ativo09` decimal(10,2) DEFAULT '0.00',
	`ativo10` decimal(10,2) DEFAULT '0.00',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `valoresCalculo_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `lgpdAceito` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `lgpdAceitoEm` timestamp;--> statement-breakpoint
CREATE INDEX `idx_agentes_chaveJ` ON `agentes` (`chaveJ`);--> statement-breakpoint
CREATE INDEX `idx_agentes_cpf` ON `agentes` (`cpfAgente`);--> statement-breakpoint
CREATE INDEX `idx_agentes_empresa` ON `agentes` (`empresa`);--> statement-breakpoint
CREATE INDEX `idx_auditoria_agenteId` ON `auditoria` (`agenteId`);--> statement-breakpoint
CREATE INDEX `idx_auditoria_chaveJ` ON `auditoria` (`chaveJ`);--> statement-breakpoint
CREATE INDEX `idx_auditoria_numeroEntrada` ON `auditoria` (`numeroEntrada`);--> statement-breakpoint
CREATE INDEX `idx_auditoria_modulo` ON `auditoria` (`modulo`);--> statement-breakpoint
CREATE INDEX `idx_auditoria_acao` ON `auditoria` (`acao`);--> statement-breakpoint
CREATE INDEX `idx_calculos_mesRef` ON `calculos` (`mesRef`);--> statement-breakpoint
CREATE INDEX `idx_certificacoes_agente` ON `certificacoes` (`agenteId`);--> statement-breakpoint
CREATE INDEX `idx_certificacoes_vencto` ON `certificacoes` (`ventoCertif`);--> statement-breakpoint
CREATE INDEX `idx_consignados_mesAno` ON `consignados` (`mes`);--> statement-breakpoint
CREATE INDEX `idx_consorcios_mesAno` ON `consorcios` (`mesAno`);--> statement-breakpoint
CREATE INDEX `idx_contasCorrentes_mesAno` ON `contasCorrentes` (`mesAno`);--> statement-breakpoint
CREATE INDEX `idx_loginAttempts_chaveJ` ON `loginAttempts` (`chaveJ`);--> statement-breakpoint
CREATE INDEX `idx_mensagens_remetenteId` ON `mensagens` (`remetenteId`);--> statement-breakpoint
CREATE INDEX `idx_mensagens_destinatarioId` ON `mensagens` (`destinatarioId`);--> statement-breakpoint
CREATE INDEX `idx_mensagens_grupoChat` ON `mensagens` (`grupoChat`);--> statement-breakpoint
CREATE INDEX `idx_mensagens_lida` ON `mensagens` (`lida`);--> statement-breakpoint
CREATE INDEX `idx_ourocap_mesAno` ON `ourocap` (`mesAno`);--> statement-breakpoint
CREATE INDEX `idx_pagamentos_mesAno` ON `pagamentos` (`mesAno`);--> statement-breakpoint
CREATE INDEX `idx_producaoBb_mesData` ON `producaoBb` (`mesData`);--> statement-breakpoint
CREATE INDEX `idx_relatorioBB_proposta` ON `relatorioBB` (`proposta`);--> statement-breakpoint
CREATE INDEX `idx_relatorioBB_situacao` ON `relatorioBB` (`situacao`);--> statement-breakpoint
CREATE INDEX `idx_seguros_mesAno` ON `seguros` (`mesAno`);--> statement-breakpoint
CREATE INDEX `idx_sessoes_agenteId` ON `sessoes` (`agenteId`);--> statement-breakpoint
CREATE INDEX `idx_sessoes_chaveJ` ON `sessoes` (`chaveJ`);--> statement-breakpoint
CREATE INDEX `idx_sessoes_ativo` ON `sessoes` (`ativo`);