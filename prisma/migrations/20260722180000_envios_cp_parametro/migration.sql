-- CreateTable
CREATE TABLE `parametro` (
    `id_parametro` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `tipo` VARCHAR(30) NOT NULL,
    `valor` TEXT NOT NULL,
    `fecha_alta` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_modif` DATETIME(3) NOT NULL,

    UNIQUE INDEX `parametro_nombre_key`(`nombre`),
    PRIMARY KEY (`id_parametro`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `codigo_postal_envio` (
    `id_cp_envio` INTEGER NOT NULL AUTO_INCREMENT,
    `proveedor` VARCHAR(50) NOT NULL,
    `codigo_postal` VARCHAR(20) NOT NULL,
    `localidad` VARCHAR(255) NOT NULL,
    `dias_entrega` INTEGER NOT NULL,
    `precio` DECIMAL(12, 2) NOT NULL,
    `fecha_alta` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_modif` DATETIME(3) NOT NULL,

    INDEX `codigo_postal_envio_codigo_postal_idx`(`codigo_postal`),
    INDEX `codigo_postal_envio_proveedor_idx`(`proveedor`),
    UNIQUE INDEX `codigo_postal_envio_proveedor_codigo_postal_key`(`proveedor`, `codigo_postal`),
    PRIMARY KEY (`id_cp_envio`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
