CREATE TABLE `clientPortalTokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobCardId` int NOT NULL,
	`token` varchar(64) NOT NULL,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `clientPortalTokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `clientPortalTokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
ALTER TABLE `clientPortalTokens` ADD CONSTRAINT `clientPortalTokens_jobCardId_jobCards_id_fk` FOREIGN KEY (`jobCardId`) REFERENCES `jobCards`(`id`) ON DELETE no action ON UPDATE no action;