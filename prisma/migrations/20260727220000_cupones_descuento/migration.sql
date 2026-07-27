-- CreateTable
CREATE TABLE `cupones_descuento` (
    `id_cupon` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(60) NOT NULL,
    `monto` DECIMAL(12, 2) NOT NULL,
    `fecha_vigencia` DATETIME(3) NOT NULL,
    `estado` VARCHAR(20) NOT NULL,
    `grupo` VARCHAR(100) NULL,
    `fecha_creacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `id_usuario_creacion` INTEGER NOT NULL,
    `fecha_consumido` DATETIME(3) NULL,
    `id_venta` INTEGER NULL,

    UNIQUE INDEX `cupones_descuento_codigo_key`(`codigo`),
    INDEX `cupones_descuento_grupo_idx`(`grupo`),
    INDEX `cupones_descuento_estado_idx`(`estado`),
    INDEX `cupones_descuento_id_venta_idx`(`id_venta`),
    PRIMARY KEY (`id_cupon`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `venta` ADD COLUMN `id_cupon` INTEGER NULL;

-- CreateIndex
CREATE UNIQUE INDEX `venta_id_cupon_key` ON `venta`(`id_cupon`);

-- AddForeignKey
ALTER TABLE `cupones_descuento` ADD CONSTRAINT `cupones_descuento_id_usuario_creacion_fkey` FOREIGN KEY (`id_usuario_creacion`) REFERENCES `usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `venta` ADD CONSTRAINT `venta_id_cupon_fkey` FOREIGN KEY (`id_cupon`) REFERENCES `cupones_descuento`(`id_cupon`) ON DELETE SET NULL ON UPDATE CASCADE;
