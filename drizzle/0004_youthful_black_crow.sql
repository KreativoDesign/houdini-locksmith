CREATE TABLE `pricingCatalogue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`type` enum('part','service','labour','other') NOT NULL DEFAULT 'service',
	`defaultPrice` varchar(20) NOT NULL DEFAULT '0.00',
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pricingCatalogue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `pricingCatalogue` ADD CONSTRAINT `pricingCatalogue_createdById_users_id_fk` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;