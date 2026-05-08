ALTER TABLE `agentes` DROP INDEX `agentes_cpfAgente_unique`;--> statement-breakpoint
DROP INDEX `idx_certificacoes_agente` ON `certificacoes`;--> statement-breakpoint
DROP INDEX `idx_certificacoes_vencto` ON `certificacoes`;--> statement-breakpoint
ALTER TABLE `certificacoes` MODIFY COLUMN `agenteId` int;--> statement-breakpoint
ALTER TABLE `certificacoes` MODIFY COLUMN `cpf` varchar(20);--> statement-breakpoint
ALTER TABLE `certificacoes` MODIFY COLUMN `situacao` varchar(100);--> statement-breakpoint
ALTER TABLE `certificacoes` MODIFY COLUMN `dataCertif` varchar(10);--> statement-breakpoint
ALTER TABLE `certificacoes` MODIFY COLUMN `ventoCertif` varchar(10);--> statement-breakpoint
ALTER TABLE `certificacoes` MODIFY COLUMN `dataCertif2` varchar(10);--> statement-breakpoint
ALTER TABLE `certificacoes` MODIFY COLUMN `ventoCertif3` varchar(10);--> statement-breakpoint
ALTER TABLE `certificacoes` ADD `empresa` varchar(100);