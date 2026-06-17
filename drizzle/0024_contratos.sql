CREATE TABLE `contratos` (
  `id` int AUTO_INCREMENT NOT NULL,
  `fileKey` varchar(500) NOT NULL,
  `fileUrl` varchar(500) NOT NULL,
  `nomeArquivo` varchar(255),
  `numeroProposta` varchar(50),
  `linhaCredito` varchar(100),
  `taxaMensalJuros` decimal(10,4),
  `prazoMeses` int,
  `valorSolicitado` decimal(15,2),
  `valorTotalEmprestimo` decimal(15,2),
  `valorParcela` decimal(15,2),
  `valorTotalParcelas` decimal(15,2),
  `nomeCliente` varchar(255),
  `cpfCliente` varchar(20),
  `nrConvenio` varchar(50),
  `nomeConvenio` varchar(150),
  `dataPrimeiraParcela` varchar(20),
  `dataUltimaParcela` varchar(20),
  `chaveJOperador` varchar(50),
  `nomeOperador` varchar(255),
  `empresa` varchar(100),
  `statusExtracao` varchar(20) DEFAULT 'pendente',
  `erroExtracao` text,
  `uploadPorId` int,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `contratos_id` PRIMARY KEY(`id`)
);

CREATE INDEX `idx_contratos_proposta` ON `contratos` (`numeroProposta`);
CREATE INDEX `idx_contratos_chaveJ` ON `contratos` (`chaveJOperador`);
