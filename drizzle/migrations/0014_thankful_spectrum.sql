CREATE TABLE `customerPortalLinks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobCardId` int NOT NULL,
	`quoteId` int,
	`token` varchar(64) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customerPortalLinks_id` PRIMARY KEY(`id`),
	CONSTRAINT `customerPortalLinks_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `portalLinkHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`portalLinkId` int NOT NULL,
	`action` enum('view','view_invoice','initiate_payment','payment_success','payment_failed') NOT NULL,
	`ipAddress` varchar(45),
	`userAgent` text,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `portalLinkHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `customerPortalLinks` ADD CONSTRAINT `customerPortalLinks_jobCardId_jobCards_id_fk` FOREIGN KEY (`jobCardId`) REFERENCES `jobCards`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customerPortalLinks` ADD CONSTRAINT `customerPortalLinks_quoteId_quotes_id_fk` FOREIGN KEY (`quoteId`) REFERENCES `quotes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `portalLinkHistory` ADD CONSTRAINT `portalLinkHistory_portalLinkId_customerPortalLinks_id_fk` FOREIGN KEY (`portalLinkId`) REFERENCES `customerPortalLinks`(`id`) ON DELETE cascade ON UPDATE no action;