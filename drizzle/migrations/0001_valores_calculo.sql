-- Tabela de Valores para Cálculo por Nível
CREATE TABLE IF NOT EXISTS `valoresCalculo` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `ativo01` decimal(10, 2) DEFAULT '0.00',
  `ativo02` decimal(10, 2) DEFAULT '0.00',
  `ativo03` decimal(10, 2) DEFAULT '0.00',
  `ativo04` decimal(10, 2) DEFAULT '0.00',
  `ativo05` decimal(10, 2) DEFAULT '0.00',
  `ativo06` decimal(10, 2) DEFAULT '0.00',
  `ativo07` decimal(10, 2) DEFAULT '0.00',
  `ativo08` decimal(10, 2) DEFAULT '0.00',
  `ativo09` decimal(10, 2) DEFAULT '0.00',
  `ativo10` decimal(10, 2) DEFAULT '0.00',
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inserir registro padrão
INSERT INTO `valoresCalculo` (id) VALUES (1) ON DUPLICATE KEY UPDATE id=id;
