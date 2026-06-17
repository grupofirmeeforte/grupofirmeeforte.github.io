ALTER TABLE `consignados` ADD COLUMN `isDuplicate` boolean NOT NULL DEFAULT false;
CREATE INDEX `idx_consignados_nrOperacao` ON `consignados` (`nrOperacao`);
