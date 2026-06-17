CREATE TABLE `febraban` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresa` varchar(100),
	`mesano` int,
	`proposta` varchar(20) NOT NULL,
	`linha` int,
	`situacao` varchar(100),
	`operador` varchar(50),
	`solicitacao` varchar(20),
	`prazo` varchar(20),
	`troco` decimal(15,2),
	`financiado` decimal(15,2),
	`situacao2` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `febraban_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_febraban_proposta` ON `febraban` (`proposta`);--> statement-breakpoint
CREATE INDEX `idx_febraban_mesano` ON `febraban` (`mesano`);--> statement-breakpoint
CREATE INDEX `idx_febraban_empresa` ON `febraban` (`empresa`);--> statement-breakpoint
CREATE INDEX `idx_febraban_operador` ON `febraban` (`operador`);