CREATE TABLE `departmentServiceTypeConfig` (
	`id` int AUTO_INCREMENT NOT NULL,
	`departmentId` int NOT NULL,
	`serviceTypes` text NOT NULL DEFAULT ('locksmithing,security,diagnostics,workshop,other'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `departmentServiceTypeConfig_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `departmentServiceTypeConfig` ADD CONSTRAINT `departmentServiceTypeConfig_departmentId_departments_id_fk` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE no action ON UPDATE no action;