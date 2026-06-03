ALTER TABLE `quotes` MODIFY COLUMN `status` enum('draft','sent','accepted','rejected','expired') NOT NULL DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE `quotes` DROP COLUMN `paidAt`;