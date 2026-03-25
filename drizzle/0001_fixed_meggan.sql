CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`firstName` varchar(100) NOT NULL,
	`lastName` varchar(100) NOT NULL,
	`email` varchar(320),
	`phone` varchar(30) NOT NULL,
	`alternatePhone` varchar(30),
	`address` text,
	`city` varchar(100),
	`postalCode` varchar(20),
	`notes` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `departments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `departments_id` PRIMARY KEY(`id`),
	CONSTRAINT `departments_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `employeeAvailability` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`availableDate` varchar(10) NOT NULL,
	`startTime` varchar(5) NOT NULL,
	`endTime` varchar(5) NOT NULL,
	`isAvailable` boolean NOT NULL DEFAULT true,
	`reason` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employeeAvailability_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `enquiries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`departmentId` int,
	`subject` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`status` enum('new','in_review','converted','closed') NOT NULL DEFAULT 'new',
	`priority` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
	`source` enum('phone','email','walk_in','online','referral') NOT NULL DEFAULT 'phone',
	`assignedToId` int,
	`convertedToJobCardId` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `enquiries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `jobCards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobNumber` varchar(30) NOT NULL,
	`clientId` int NOT NULL,
	`enquiryId` int,
	`departmentId` int NOT NULL,
	`assignedTechnicianId` int,
	`assignedManagerId` int,
	`title` varchar(255) NOT NULL,
	`description` text,
	`status` enum('pending','assigned','in_progress','on_hold','completed','awaiting_pricing','priced','cancelled') NOT NULL DEFAULT 'pending',
	`priority` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
	`scheduledDate` timestamp,
	`scheduledTimeSlotId` int,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`technicianNotes` text,
	`managerNotes` text,
	`requiresSignature` boolean NOT NULL DEFAULT true,
	`isSigned` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `jobCards_id` PRIMARY KEY(`id`),
	CONSTRAINT `jobCards_jobNumber_unique` UNIQUE(`jobNumber`)
);
--> statement-breakpoint
CREATE TABLE `jobDocuments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobCardId` int NOT NULL,
	`category` enum('photo','document','before_image','after_image','signature','other') NOT NULL DEFAULT 'photo',
	`fileName` varchar(255) NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`fileSize` int,
	`fileUrl` text NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`description` text,
	`uploadedById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `jobDocuments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `jobItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobCardId` int NOT NULL,
	`type` enum('part','service','labour','other') NOT NULL DEFAULT 'part',
	`name` varchar(255) NOT NULL,
	`description` text,
	`quantity` decimal(10,2) NOT NULL DEFAULT '1',
	`unitPrice` decimal(10,2) NOT NULL,
	`discountPct` decimal(5,2) DEFAULT '0',
	`lineTotal` decimal(10,2) NOT NULL,
	`addedById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `jobItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `jobPricing` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobCardId` int NOT NULL,
	`labourCost` decimal(10,2) NOT NULL DEFAULT '0',
	`partsCost` decimal(10,2) NOT NULL DEFAULT '0',
	`additionalFees` decimal(10,2) NOT NULL DEFAULT '0',
	`discountAmount` decimal(10,2) NOT NULL DEFAULT '0',
	`subtotal` decimal(10,2) NOT NULL,
	`vatPct` decimal(5,2) NOT NULL DEFAULT '15.00',
	`vatAmount` decimal(10,2) NOT NULL,
	`total` decimal(10,2) NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'ZAR',
	`status` enum('draft','pending_approval','approved','invoiced') NOT NULL DEFAULT 'draft',
	`notes` text,
	`createdById` int,
	`approvedById` int,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `jobPricing_id` PRIMARY KEY(`id`),
	CONSTRAINT `jobPricing_jobCardId_unique` UNIQUE(`jobCardId`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`type` enum('new_enquiry','enquiry_assigned','job_created','job_assigned','job_urgent','job_started','job_completed','job_awaiting_pricing','pricing_approved','signature_captured','general') NOT NULL DEFAULT 'general',
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`entityType` varchar(50),
	`entityId` int,
	`isRead` boolean NOT NULL DEFAULT false,
	`ownerNotified` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `signatures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobCardId` int NOT NULL,
	`signatureUrl` text NOT NULL,
	`signatureKey` varchar(512) NOT NULL,
	`signerName` varchar(200) NOT NULL,
	`signerRole` varchar(100),
	`ipAddress` varchar(45),
	`signedAt` timestamp NOT NULL DEFAULT (now()),
	`capturedById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `signatures_id` PRIMARY KEY(`id`),
	CONSTRAINT `signatures_jobCardId_unique` UNIQUE(`jobCardId`)
);
--> statement-breakpoint
CREATE TABLE `timeSlots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slotDate` varchar(10) NOT NULL,
	`startTime` varchar(5) NOT NULL,
	`endTime` varchar(5) NOT NULL,
	`technicianId` int NOT NULL,
	`isBooked` boolean NOT NULL DEFAULT false,
	`jobCardId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `timeSlots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','manager','technician') NOT NULL DEFAULT 'technician';--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(30);--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `departmentId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `isActive` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `employeeAvailability` ADD CONSTRAINT `employeeAvailability_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `enquiries` ADD CONSTRAINT `enquiries_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `enquiries` ADD CONSTRAINT `enquiries_departmentId_departments_id_fk` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `enquiries` ADD CONSTRAINT `enquiries_assignedToId_users_id_fk` FOREIGN KEY (`assignedToId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `jobCards` ADD CONSTRAINT `jobCards_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `jobCards` ADD CONSTRAINT `jobCards_enquiryId_enquiries_id_fk` FOREIGN KEY (`enquiryId`) REFERENCES `enquiries`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `jobCards` ADD CONSTRAINT `jobCards_departmentId_departments_id_fk` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `jobCards` ADD CONSTRAINT `jobCards_assignedTechnicianId_users_id_fk` FOREIGN KEY (`assignedTechnicianId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `jobCards` ADD CONSTRAINT `jobCards_assignedManagerId_users_id_fk` FOREIGN KEY (`assignedManagerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `jobDocuments` ADD CONSTRAINT `jobDocuments_jobCardId_jobCards_id_fk` FOREIGN KEY (`jobCardId`) REFERENCES `jobCards`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `jobDocuments` ADD CONSTRAINT `jobDocuments_uploadedById_users_id_fk` FOREIGN KEY (`uploadedById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `jobItems` ADD CONSTRAINT `jobItems_jobCardId_jobCards_id_fk` FOREIGN KEY (`jobCardId`) REFERENCES `jobCards`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `jobItems` ADD CONSTRAINT `jobItems_addedById_users_id_fk` FOREIGN KEY (`addedById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `jobPricing` ADD CONSTRAINT `jobPricing_jobCardId_jobCards_id_fk` FOREIGN KEY (`jobCardId`) REFERENCES `jobCards`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `jobPricing` ADD CONSTRAINT `jobPricing_createdById_users_id_fk` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `jobPricing` ADD CONSTRAINT `jobPricing_approvedById_users_id_fk` FOREIGN KEY (`approvedById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `signatures` ADD CONSTRAINT `signatures_jobCardId_jobCards_id_fk` FOREIGN KEY (`jobCardId`) REFERENCES `jobCards`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `signatures` ADD CONSTRAINT `signatures_capturedById_users_id_fk` FOREIGN KEY (`capturedById`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `timeSlots` ADD CONSTRAINT `timeSlots_technicianId_users_id_fk` FOREIGN KEY (`technicianId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `timeSlots` ADD CONSTRAINT `timeSlots_jobCardId_jobCards_id_fk` FOREIGN KEY (`jobCardId`) REFERENCES `jobCards`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_departmentId_departments_id_fk` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE no action ON UPDATE no action;