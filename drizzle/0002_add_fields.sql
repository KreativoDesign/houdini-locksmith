CREATE TABLE `authAuditLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`action` enum('login_success','login_failed','logout','register','password_changed','password_reset_requested','role_changed','account_locked','account_unlocked','invite_created','invite_accepted') NOT NULL,
	`email` varchar(320),
	`ipAddress` varchar(45),
	`userAgent` varchar(512),
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `authAuditLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inviteTokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(128) NOT NULL,
	`email` varchar(320) NOT NULL,
	`role` enum('admin','manager','technician') NOT NULL,
	`departmentId` int,
	`createdById` int NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`acceptedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inviteTokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `inviteTokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `localCredentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`mustChangePassword` boolean NOT NULL DEFAULT false,
	`failedAttempts` int NOT NULL DEFAULT 0,
	`lockedUntil` timestamp,
	`lastPasswordChangedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `localCredentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `localCredentials_userId_unique` UNIQUE(`userId`),
	CONSTRAINT `localCredentials_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `authAuditLog` ADD CONSTRAINT `authAuditLog_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inviteTokens` ADD CONSTRAINT `inviteTokens_departmentId_departments_id_fk` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inviteTokens` ADD CONSTRAINT `inviteTokens_createdById_users_id_fk` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inviteTokens` ADD CONSTRAINT `inviteTokens_acceptedByUserId_users_id_fk` FOREIGN KEY (`acceptedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `localCredentials` ADD CONSTRAINT `localCredentials_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;