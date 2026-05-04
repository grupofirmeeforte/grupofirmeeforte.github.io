CREATE TABLE `sessoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agenteId` int NOT NULL,
	`chaveJ` varchar(50) NOT NULL,
	`nomeAgente` varchar(255) NOT NULL,
	`horarioConexao` timestamp NOT NULL DEFAULT (now()),
	`ultimoAcesso` timestamp NOT NULL DEFAULT (now()),
	`modulo` varchar(100) DEFAULT 'dashboard',
	`ipAddress` varchar(50),
	`userAgent` text,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sessoes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_sessoes_agenteId` ON `sessoes` (`agenteId`);--> statement-breakpoint
CREATE INDEX `idx_sessoes_chaveJ` ON `sessoes` (`chaveJ`);--> statement-breakpoint
CREATE INDEX `idx_sessoes_ativo` ON `sessoes` (`ativo`);