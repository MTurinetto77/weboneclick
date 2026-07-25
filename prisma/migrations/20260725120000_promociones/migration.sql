-- CreateTable
CREATE TABLE `promocion` (
    `id_promocion` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(255) NOT NULL,
    `subtitulo` VARCHAR(255) NULL,
    `icono` VARCHAR(500) NULL,
    `etiqueta_imagen` VARCHAR(500) NULL,
    `prioridad` INTEGER NOT NULL DEFAULT 0,
    `slug` VARCHAR(255) NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `promocion_slug_key`(`slug`),
    PRIMARY KEY (`id_promocion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `promocion_categoria` (
    `id_promocion` INTEGER NOT NULL,
    `id_categoria` INTEGER NOT NULL,

    PRIMARY KEY (`id_promocion`, `id_categoria`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `promocion_producto` (
    `id_promocion` INTEGER NOT NULL,
    `id_producto` INTEGER NOT NULL,

    PRIMARY KEY (`id_promocion`, `id_producto`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `promocion_categoria` ADD CONSTRAINT `promocion_categoria_id_promocion_fkey` FOREIGN KEY (`id_promocion`) REFERENCES `promocion`(`id_promocion`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `promocion_categoria` ADD CONSTRAINT `promocion_categoria_id_categoria_fkey` FOREIGN KEY (`id_categoria`) REFERENCES `categoria`(`id_categoria`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `promocion_producto` ADD CONSTRAINT `promocion_producto_id_promocion_fkey` FOREIGN KEY (`id_promocion`) REFERENCES `promocion`(`id_promocion`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `promocion_producto` ADD CONSTRAINT `promocion_producto_id_producto_fkey` FOREIGN KEY (`id_producto`) REFERENCES `producto`(`id_producto`) ON DELETE CASCADE ON UPDATE CASCADE;
