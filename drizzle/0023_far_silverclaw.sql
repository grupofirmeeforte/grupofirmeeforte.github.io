-- Expandir tabela consorcios com todos os campos da planilha
ALTER TABLE `consorcios`
  ADD COLUMN `empresa` varchar(20) AFTER `id`,
  ADD COLUMN `proposta` varchar(50) AFTER `mesAno`,
  ADD COLUMN `data` varchar(12) AFTER `proposta`,
  ADD COLUMN `parcLiberada` varchar(20) AFTER `valorBem`,
  ADD COLUMN `pctComissao1` decimal(10,6) AFTER `parcLiberada`,
  ADD COLUMN `rbm` decimal(15,2) AFTER `pctComissao1`,
  ADD COLUMN `pctComissao2` decimal(10,6) AFTER `rbm`,
  DROP COLUMN `nrOperacao`,
  DROP COLUMN `parcelas`;

-- Adicionar índices
ALTER TABLE `consorcios`
  ADD INDEX `idx_consorcios_empresa` (`empresa`),
  ADD INDEX `idx_consorcios_proposta` (`proposta`);
