-- CreateTable
CREATE TABLE `etiquetas_web` (
    `id_etiqueta_web` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(255) NOT NULL,
    `imagen` VARCHAR(500) NULL,
    `prioridad` INTEGER NOT NULL DEFAULT 0,
    `activo` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id_etiqueta_web`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `etiquetas_web_productos` (
    `id_etiqueta_web` INTEGER NOT NULL,
    `id_producto` INTEGER NOT NULL,

    PRIMARY KEY (`id_etiqueta_web`, `id_producto`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `etiquetas_web_productos` ADD CONSTRAINT `etiquetas_web_productos_id_etiqueta_web_fkey` FOREIGN KEY (`id_etiqueta_web`) REFERENCES `etiquetas_web`(`id_etiqueta_web`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `etiquetas_web_productos` ADD CONSTRAINT `etiquetas_web_productos_id_producto_fkey` FOREIGN KEY (`id_producto`) REFERENCES `producto`(`id_producto`) ON DELETE CASCADE ON UPDATE CASCADE;
