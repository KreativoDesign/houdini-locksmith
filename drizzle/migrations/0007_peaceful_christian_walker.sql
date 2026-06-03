CREATE TABLE `quoteItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quoteId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('part','service','labour','other') NOT NULL DEFAULT 'service',
	`quantity` int NOT NULL DEFAULT 1,
	`unitPrice` varchar(20) NOT NULL DEFAULT '0.00',
	`discountPercent` int NOT NULL DEFAULT 0,
	`lineTotal` varchar(20) NOT NULL DEFAULT '0.00',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quoteItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quoteTokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quoteId` int NOT NULL,
	`token` varchar(64) NOT NULL,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quoteTokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `quoteTokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `quotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quoteNumber` varchar(20) NOT NULL,
	`clientId` int NOT NULL,
	`createdById` int NOT NULL,
	`status` enum('draft','sent','accepted','rejected','expired') NOT NULL DEFAULT 'draft',
	`description` text,
	`total` varchar(20) NOT NULL DEFAULT '0.00',
	`vat` varchar(20) NOT NULL DEFAULT '0.00',
	`grandTotal` varchar(20) NOT NULL DEFAULT '0.00',
	`discount` varchar(20) NOT NULL DEFAULT '0.00',
	`discountPercent` int NOT NULL DEFAULT 0,
	`expiresAt` timestamp,
	`sentAt` timestamp,
	`acceptedAt` timestamp,
	`rejectedAt` timestamp,
	`rejectionReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quotes_id` PRIMARY KEY(`id`),
	CONSTRAINT `quotes_quoteNumber_unique` UNIQUE(`quoteNumber`)
);
--> statement-breakpoint
ALTER TABLE `quoteItems` ADD CONSTRAINT `quoteItems_quoteId_quotes_id_fk` FOREIGN KEY (`quoteId`) REFERENCES `quotes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quoteTokens` ADD CONSTRAINT `quoteTokens_quoteId_quotes_id_fk` FOREIGN KEY (`quoteId`) REFERENCES `quotes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotes` ADD CONSTRAINT `quotes_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotes` ADD CONSTRAINT `quotes_createdById_users_id_fk` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;