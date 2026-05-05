ALTER TABLE `sessoes` DROP INDEX `sessoes_tokenSessao_unique`;--> statement-breakpoint
ALTER TABLE `sessoes` ADD `motivoDesconexao` varchar(255);--> statement-breakpoint
ALTER TABLE `sessoes` DROP COLUMN `tokenSessao`;