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
CREATE INDEX `idx_mensagens_remetenteId` ON `mensagens` (`remetenteId`);--> statement-breakpoint
CREATE INDEX `idx_mensagens_destinatarioId` ON `mensagens` (`destinatarioId`);--> statement-breakpoint
CREATE INDEX `idx_mensagens_grupoChat` ON `mensagens` (`grupoChat`);--> statement-breakpoint
CREATE INDEX `idx_mensagens_lida` ON `mensagens` (`lida`);