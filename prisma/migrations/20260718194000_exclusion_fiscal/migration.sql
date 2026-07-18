-- CreateTable
CREATE TABLE `exclusion_fiscal` (
    `id_exclusion` INTEGER NOT NULL AUTO_INCREMENT,
    `impuesto` VARCHAR(500) NOT NULL,
    `vigencia_desde` DATE NOT NULL,
    `vigencia_hasta` DATE NULL,
    `orden` INTEGER NOT NULL DEFAULT 0,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `fecha_alta` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_modif` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id_exclusion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
