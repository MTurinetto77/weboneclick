-- CreateTable
CREATE TABLE `cliente` (
    `id_cliente` INTEGER NOT NULL AUTO_INCREMENT,
    `id_usuario` INTEGER NULL,
    `id_direccion_principal` INTEGER NULL,
    `nombre` VARCHAR(100) NOT NULL,
    `apellido` VARCHAR(100) NOT NULL,
    `mail` VARCHAR(255) NOT NULL,
    `tipo_documento` VARCHAR(20) NULL,
    `numero_documento` VARCHAR(50) NULL,
    `telefono` VARCHAR(50) NULL,
    `fecha_hora_registro` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `cliente_id_usuario_key`(`id_usuario`),
    UNIQUE INDEX `cliente_id_direccion_principal_key`(`id_direccion_principal`),
    UNIQUE INDEX `cliente_mail_key`(`mail`),
    PRIMARY KEY (`id_cliente`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `direccion` (
    `id_direccion` INTEGER NOT NULL AUTO_INCREMENT,
    `id_cliente` INTEGER NOT NULL,
    `calle` VARCHAR(255) NOT NULL,
    `numero` VARCHAR(20) NOT NULL,
    `piso` VARCHAR(20) NULL,
    `departamento` VARCHAR(20) NULL,
    `barrio` VARCHAR(100) NULL,
    `localidad` VARCHAR(100) NOT NULL,
    `provincia` VARCHAR(100) NOT NULL,
    `pais` VARCHAR(100) NOT NULL DEFAULT 'Argentina',
    `codigo_postal` VARCHAR(20) NULL,
    `latitud` DECIMAL(10, 7) NULL,
    `longitud` DECIMAL(10, 7) NULL,
    `referencias` VARCHAR(500) NULL,

    PRIMARY KEY (`id_direccion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `venta` (
    `id_venta` INTEGER NOT NULL AUTO_INCREMENT,
    `id_cliente` INTEGER NOT NULL,
    `fecha_hora` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `estado` VARCHAR(30) NOT NULL,
    `tipo_entrega` VARCHAR(20) NOT NULL,
    `subtotal` DECIMAL(12, 2) NOT NULL,
    `descuento` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `costo_envio` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(12, 2) NOT NULL,

    PRIMARY KEY (`id_venta`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `venta_detalle` (
    `id_venta` INTEGER NOT NULL,
    `item` INTEGER NOT NULL,
    `id_producto` INTEGER NOT NULL,
    `nombre_producto` VARCHAR(255) NOT NULL,
    `cantidad` DECIMAL(12, 2) NOT NULL,
    `precio_unitario` DECIMAL(12, 2) NOT NULL,
    `subtotal` DECIMAL(12, 2) NOT NULL,

    PRIMARY KEY (`id_venta`, `item`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pago` (
    `id_pago` INTEGER NOT NULL AUTO_INCREMENT,
    `id_venta` INTEGER NOT NULL,
    `tipo_pago` VARCHAR(20) NOT NULL,
    `estado` VARCHAR(30) NOT NULL,
    `monto` DECIMAL(12, 2) NOT NULL,
    `referencia` VARCHAR(255) NULL,
    `transaction_id` VARCHAR(255) NULL,

    PRIMARY KEY (`id_pago`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `envio` (
    `id_envio` INTEGER NOT NULL AUTO_INCREMENT,
    `id_venta` INTEGER NOT NULL,
    `tipo` VARCHAR(30) NOT NULL,
    `estado` VARCHAR(30) NOT NULL,
    `id_direccion` INTEGER NOT NULL,
    `tracking` VARCHAR(255) NULL,

    PRIMARY KEY (`id_envio`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Migrate cliente rows from usuario (tipo cliente)
INSERT INTO `cliente` (`id_usuario`, `nombre`, `apellido`, `mail`, `tipo_documento`, `numero_documento`, `telefono`, `fecha_hora_registro`)
SELECT `id_usuario`, `nombre`, `apellido`, `mail`, `tipo_documento`, `numero_documento`, `telefono`, `fecha_hora_registro`
FROM `usuario`
WHERE `tipo_usuario` = 'cliente';

-- Migrate addresses where calle is present
INSERT INTO `direccion` (`id_cliente`, `calle`, `numero`, `piso`, `localidad`, `provincia`, `pais`)
SELECT c.`id_cliente`,
       COALESCE(u.`calle`, 'Sin calle'),
       COALESCE(u.`numero`, 'S/N'),
       u.`piso`,
       COALESCE(u.`ciudad`, 'Sin localidad'),
       COALESCE(u.`provincia`, 'Sin provincia'),
       'Argentina'
FROM `cliente` c
INNER JOIN `usuario` u ON u.`id_usuario` = c.`id_usuario`
WHERE u.`calle` IS NOT NULL AND TRIM(u.`calle`) <> '';

-- Set principal address
UPDATE `cliente` c
INNER JOIN `direccion` d ON d.`id_cliente` = c.`id_cliente`
SET c.`id_direccion_principal` = d.`id_direccion`;

-- Drop personal columns from usuario
ALTER TABLE `usuario` DROP COLUMN `nombre`,
    DROP COLUMN `apellido`,
    DROP COLUMN `tipo_documento`,
    DROP COLUMN `numero_documento`,
    DROP COLUMN `calle`,
    DROP COLUMN `numero`,
    DROP COLUMN `piso`,
    DROP COLUMN `provincia`,
    DROP COLUMN `ciudad`,
    DROP COLUMN `telefono`;

-- AddForeignKey
ALTER TABLE `cliente` ADD CONSTRAINT `cliente_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuario`(`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cliente` ADD CONSTRAINT `cliente_id_direccion_principal_fkey` FOREIGN KEY (`id_direccion_principal`) REFERENCES `direccion`(`id_direccion`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `direccion` ADD CONSTRAINT `direccion_id_cliente_fkey` FOREIGN KEY (`id_cliente`) REFERENCES `cliente`(`id_cliente`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `venta` ADD CONSTRAINT `venta_id_cliente_fkey` FOREIGN KEY (`id_cliente`) REFERENCES `cliente`(`id_cliente`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `venta_detalle` ADD CONSTRAINT `venta_detalle_id_venta_fkey` FOREIGN KEY (`id_venta`) REFERENCES `venta`(`id_venta`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `venta_detalle` ADD CONSTRAINT `venta_detalle_id_producto_fkey` FOREIGN KEY (`id_producto`) REFERENCES `producto`(`id_producto`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pago` ADD CONSTRAINT `pago_id_venta_fkey` FOREIGN KEY (`id_venta`) REFERENCES `venta`(`id_venta`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `envio` ADD CONSTRAINT `envio_id_venta_fkey` FOREIGN KEY (`id_venta`) REFERENCES `venta`(`id_venta`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `envio` ADD CONSTRAINT `envio_id_direccion_fkey` FOREIGN KEY (`id_direccion`) REFERENCES `direccion`(`id_direccion`) ON DELETE RESTRICT ON UPDATE CASCADE;
