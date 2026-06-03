ALTER TABLE `quotes` MODIFY COLUMN `status` enum('draft','sent','accepted','rejected','expired','paid') NOT NULL DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE `quotes` ADD `paidAt` timestamp;