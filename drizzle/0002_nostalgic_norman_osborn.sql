CREATE TABLE `auditoria` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agenteId` int NOT NULL,
	`chaveJ` varchar(50) NOT NULL,
	`nomeAgente` varchar(255) NOT NULL,
	`numeroEntrada` varchar(50) NOT NULL,
	`horarioEntrada` timestamp NOT NULL DEFAULT (now()),
	`horarioSaida` timestamp,
	`modulo` varchar(100),
	`acao` varchar(100),
	`descricao` text,
	`tabela` varchar(100),
	`registroId` int,
	`valorAnterior` text,
	`valorNovo` text,
	`ipAddress` varchar(50),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `auditoria_id` PRIMARY KEY(`id`),
	CONSTRAINT `auditoria_numeroEntrada_unique` UNIQUE(`numeroEntrada`)
);
--> statement-breakpoint
CREATE TABLE `loginAttempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chaveJ` varchar(50) NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`isBlocked` boolean NOT NULL DEFAULT false,
	`blockedUntil` timestamp,
	`lastAttempt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `loginAttempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_auditoria_agenteId` ON `auditoria` (`agenteId`);--> statement-breakpoint
CREATE INDEX `idx_auditoria_chaveJ` ON `auditoria` (`chaveJ`);--> statement-breakpoint
CREATE INDEX `idx_auditoria_numeroEntrada` ON `auditoria` (`numeroEntrada`);--> statement-breakpoint
CREATE INDEX `idx_auditoria_modulo` ON `auditoria` (`modulo`);--> statement-breakpoint
CREATE INDEX `idx_auditoria_acao` ON `auditoria` (`acao`);--> statement-breakpoint
CREATE INDEX `idx_loginAttempts_chaveJ` ON `loginAttempts` (`chaveJ`);