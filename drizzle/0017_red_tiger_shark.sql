ALTER TABLE `consignados` ADD `mesAno` varchar(10);--> statement-breakpoint
ALTER TABLE `consignados` ADD `percPago` decimal(10,4);--> statement-breakpoint
ALTER TABLE `consignados` ADD `totalComissao` decimal(15,2);--> statement-breakpoint
ALTER TABLE `consignados` ADD `difEmpresa` decimal(15,2);--> statement-breakpoint
ALTER TABLE `consignados` ADD `tabela` varchar(100);--> statement-breakpoint
ALTER TABLE `consignados` ADD `supervisor` varchar(255);--> statement-breakpoint
ALTER TABLE `consignados` ADD `parcelas` int;--> statement-breakpoint
ALTER TABLE `consignados` ADD `percentual` decimal(10,4);--> statement-breakpoint
ALTER TABLE `consignados` ADD `comissao` decimal(15,2);