-- CreateTable
CREATE TABLE `constancia_fiscal` (
    `id_constancia` INTEGER NOT NULL AUTO_INCREMENT,
    `titulo` VARCHAR(255) NOT NULL,
    `categoria` VARCHAR(50) NOT NULL,
    `archivo` VARCHAR(500) NULL,
    `url_externa` VARCHAR(500) NULL,
    `orden` INTEGER NOT NULL DEFAULT 0,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `fecha_alta` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_modif` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id_constancia`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
