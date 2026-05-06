CREATE TABLE IF NOT EXISTS `relatorioBB` (
  `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `bmf` varchar(50),
  `mes` int,
  `proposta` varchar(100),
  `linha` varchar(100),
  `situacao` varchar(100),
  `operador` varchar(100),
  `solicitacao` date,
  `prazo` varchar(100),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_relatorioBB_proposta` (`proposta`),
  KEY `idx_relatorioBB_situacao` (`situacao`)
);
