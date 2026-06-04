CREATE TABLE `jobStatusHistory` (
  `id` int AUTO_INCREMENT NOT NULL,
  `jobCardId` int NOT NULL,
  `previousStatus` enum('pending','assigned','in_progress','completed','cancelled'),
  `newStatus` enum('pending','assigned','in_progress','completed','cancelled') NOT NULL,
  `changedBy` int,
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`jobCardId`) REFERENCES `jobCards`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`changedBy`) REFERENCES `users`(`id`)
);
