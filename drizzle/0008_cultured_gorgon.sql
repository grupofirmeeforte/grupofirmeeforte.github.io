ALTER TABLE `sessoes` ADD `tokenSessao` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `sessoes` ADD CONSTRAINT `sessoes_tokenSessao_unique` UNIQUE(`tokenSessao`);