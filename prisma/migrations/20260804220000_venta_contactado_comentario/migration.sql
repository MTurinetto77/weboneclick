-- AlterTable
ALTER TABLE `venta` ADD COLUMN `contactado` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `comentario` TEXT NULL;
