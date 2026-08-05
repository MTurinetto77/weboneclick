-- CreateTable
CREATE TABLE `secciones` (
    `id_seccion` INTEGER NOT NULL AUTO_INCREMENT,
    `clave` VARCHAR(50) NOT NULL,
    `nombre` VARCHAR(255) NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `orden` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `secciones_clave_key`(`clave`),
    PRIMARY KEY (`id_seccion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `secciones_productos` (
    `id_seccion` INTEGER NOT NULL,
    `id_producto` INTEGER NOT NULL,
    `pestana` VARCHAR(50) NOT NULL DEFAULT '',
    `orden` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id_seccion`, `id_producto`, `pestana`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `secciones_productos` ADD CONSTRAINT `secciones_productos_id_seccion_fkey` FOREIGN KEY (`id_seccion`) REFERENCES `secciones`(`id_seccion`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `secciones_productos` ADD CONSTRAINT `secciones_productos_id_producto_fkey` FOREIGN KEY (`id_producto`) REFERENCES `producto`(`id_producto`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed: 3 secciones fijas de la home
INSERT INTO `secciones` (`clave`, `nombre`, `activo`, `orden`) VALUES
  ('destacados', 'Destacados', true, 1),
  ('fiesta', '¡Llevá la fiesta a donde quieras!', true, 2),
  ('potencia', 'Potenciá tu iPhone', true, 3);
