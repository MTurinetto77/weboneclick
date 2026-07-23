-- AlterTable
ALTER TABLE `venta` ADD COLUMN `id_direccion_facturacion` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `venta` ADD CONSTRAINT `venta_id_direccion_facturacion_fkey` FOREIGN KEY (`id_direccion_facturacion`) REFERENCES `direccion`(`id_direccion`) ON DELETE SET NULL ON UPDATE CASCADE;
