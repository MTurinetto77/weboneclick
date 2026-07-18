-- CreateTable
CREATE TABLE `producto` (
    `id_producto` INTEGER NOT NULL AUTO_INCREMENT,
    `titulo` VARCHAR(255) NOT NULL,
    `descripcion` TEXT NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id_producto`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `almacen` (
    `id_almacen` INTEGER NOT NULL AUTO_INCREMENT,
    `descripcion` VARCHAR(255) NOT NULL,

    PRIMARY KEY (`id_almacen`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock` (
    `id_producto` INTEGER NOT NULL,
    `id_almacen` INTEGER NOT NULL,
    `cantidad` DECIMAL(12, 2) NOT NULL,

    PRIMARY KEY (`id_producto`, `id_almacen`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `archivo` (
    `id_archivo` INTEGER NOT NULL AUTO_INCREMENT,
    `link` VARCHAR(500) NOT NULL,
    `tipo` VARCHAR(50) NOT NULL,
    `descripcion` VARCHAR(255) NOT NULL,

    PRIMARY KEY (`id_archivo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `archivo_producto` (
    `id_archivo` INTEGER NOT NULL,
    `id_producto` INTEGER NOT NULL,

    PRIMARY KEY (`id_archivo`, `id_producto`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categoria` (
    `id_categoria` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(255) NOT NULL,
    `nivel` INTEGER NOT NULL,
    `id_cat_superior` INTEGER NULL,

    PRIMARY KEY (`id_categoria`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categoria_producto` (
    `id_categoria` INTEGER NOT NULL,
    `id_producto` INTEGER NOT NULL,

    PRIMARY KEY (`id_categoria`, `id_producto`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `precio_producto` (
    `id_producto` INTEGER NOT NULL,
    `fecha_desde` DATE NOT NULL,
    `precio` DECIMAL(12, 2) NOT NULL,

    PRIMARY KEY (`id_producto`, `fecha_desde`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `caracteristica` (
    `id_caracteristica` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(255) NOT NULL,

    PRIMARY KEY (`id_caracteristica`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `caracteristica_categoria` (
    `id_caracteristica` INTEGER NOT NULL,
    `id_categoria` INTEGER NOT NULL,

    PRIMARY KEY (`id_caracteristica`, `id_categoria`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `producto_caracteristica` (
    `id_producto` INTEGER NOT NULL,
    `id_caracteristica` INTEGER NOT NULL,
    `valor_numerico` BOOLEAN NOT NULL DEFAULT false,
    `valor` VARCHAR(255) NOT NULL,

    PRIMARY KEY (`id_producto`, `id_caracteristica`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuario` (
    `id_usuario` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `apellido` VARCHAR(100) NOT NULL,
    `mail` VARCHAR(255) NOT NULL,
    `tipo_documento` VARCHAR(20) NULL,
    `numero_documento` VARCHAR(50) NULL,
    `calle` VARCHAR(255) NULL,
    `numero` VARCHAR(20) NULL,
    `piso` VARCHAR(20) NULL,
    `provincia` VARCHAR(100) NULL,
    `ciudad` VARCHAR(100) NULL,
    `telefono` VARCHAR(50) NULL,
    `tipo_usuario` VARCHAR(20) NOT NULL,
    `fecha_hora_registro` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `activo` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `usuario_mail_key`(`mail`),
    PRIMARY KEY (`id_usuario`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `stock` ADD CONSTRAINT `stock_id_producto_fkey` FOREIGN KEY (`id_producto`) REFERENCES `producto`(`id_producto`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock` ADD CONSTRAINT `stock_id_almacen_fkey` FOREIGN KEY (`id_almacen`) REFERENCES `almacen`(`id_almacen`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `archivo_producto` ADD CONSTRAINT `archivo_producto_id_archivo_fkey` FOREIGN KEY (`id_archivo`) REFERENCES `archivo`(`id_archivo`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `archivo_producto` ADD CONSTRAINT `archivo_producto_id_producto_fkey` FOREIGN KEY (`id_producto`) REFERENCES `producto`(`id_producto`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `categoria` ADD CONSTRAINT `categoria_id_cat_superior_fkey` FOREIGN KEY (`id_cat_superior`) REFERENCES `categoria`(`id_categoria`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `categoria_producto` ADD CONSTRAINT `categoria_producto_id_categoria_fkey` FOREIGN KEY (`id_categoria`) REFERENCES `categoria`(`id_categoria`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `categoria_producto` ADD CONSTRAINT `categoria_producto_id_producto_fkey` FOREIGN KEY (`id_producto`) REFERENCES `producto`(`id_producto`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `precio_producto` ADD CONSTRAINT `precio_producto_id_producto_fkey` FOREIGN KEY (`id_producto`) REFERENCES `producto`(`id_producto`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `caracteristica_categoria` ADD CONSTRAINT `caracteristica_categoria_id_caracteristica_fkey` FOREIGN KEY (`id_caracteristica`) REFERENCES `caracteristica`(`id_caracteristica`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `caracteristica_categoria` ADD CONSTRAINT `caracteristica_categoria_id_categoria_fkey` FOREIGN KEY (`id_categoria`) REFERENCES `categoria`(`id_categoria`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `producto_caracteristica` ADD CONSTRAINT `producto_caracteristica_id_producto_fkey` FOREIGN KEY (`id_producto`) REFERENCES `producto`(`id_producto`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `producto_caracteristica` ADD CONSTRAINT `producto_caracteristica_id_caracteristica_fkey` FOREIGN KEY (`id_caracteristica`) REFERENCES `caracteristica`(`id_caracteristica`) ON DELETE CASCADE ON UPDATE CASCADE;
