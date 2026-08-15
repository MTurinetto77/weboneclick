-- AlterTable
ALTER TABLE `promocion` ADD COLUMN `por_cuotas` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `cuotas` INTEGER NULL;
