CREATE TABLE `jobSignatures` (
  `id` int AUTO_INCREMENT NOT NULL,
  `jobCardId` int NOT NULL,
  `signedBy` enum('technician','client') NOT NULL,
  `signatureData` text NOT NULL,
  `signerName` varchar(255) NOT NULL,
  `signerEmail` varchar(320),
  `signatureType` enum('digital_pad','digital_upload','manual') NOT NULL DEFAULT 'digital_pad',
  `ipAddress` varchar(45),
  `userAgent` text,
  `signedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`jobCardId`) REFERENCES `jobCards`(`id`) ON DELETE CASCADE
);
