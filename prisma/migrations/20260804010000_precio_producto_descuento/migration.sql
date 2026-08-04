-- AlterTable
ALTER TABLE `precio_producto`
  ADD COLUMN `porcentaje_desc` DECIMAL(5, 2) NULL,
  ADD COLUMN `precio_con_desc` DECIMAL(12, 2) NULL;
