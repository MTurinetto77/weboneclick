-- CreateTable
CREATE TABLE `menu_item` (
    `id_menu_item` INTEGER NOT NULL AUTO_INCREMENT,
    `label` VARCHAR(100) NOT NULL,
    `href` VARCHAR(255) NOT NULL,
    `id_categoria` INTEGER NULL,
    `shop_label` VARCHAR(255) NULL,
    `tipo` VARCHAR(20) NOT NULL,
    `dynamic_children` VARCHAR(50) NULL,
    `badge` VARCHAR(50) NULL,
    `orden` INTEGER NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,

    INDEX `menu_item_activo_orden_idx`(`activo`, `orden`),
    INDEX `menu_item_id_categoria_idx`(`id_categoria`),
    PRIMARY KEY (`id_menu_item`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `menu_item_hijo` (
    `id_menu_hijo` INTEGER NOT NULL AUTO_INCREMENT,
    `id_menu_item` INTEGER NOT NULL,
    `label` VARCHAR(100) NOT NULL,
    `href` VARCHAR(255) NOT NULL,
    `id_categoria` INTEGER NULL,
    `badge` VARCHAR(50) NULL,
    `icon` VARCHAR(255) NULL,
    `variant` VARCHAR(20) NOT NULL DEFAULT 'product',
    `orden` INTEGER NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,

    INDEX `menu_item_hijo_id_menu_item_activo_orden_idx`(`id_menu_item`, `activo`, `orden`),
    INDEX `menu_item_hijo_id_categoria_idx`(`id_categoria`),
    PRIMARY KEY (`id_menu_hijo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `menu_item` ADD CONSTRAINT `menu_item_id_categoria_fkey` FOREIGN KEY (`id_categoria`) REFERENCES `categoria`(`id_categoria`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `menu_item_hijo` ADD CONSTRAINT `menu_item_hijo_id_menu_item_fkey` FOREIGN KEY (`id_menu_item`) REFERENCES `menu_item`(`id_menu_item`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `menu_item_hijo` ADD CONSTRAINT `menu_item_hijo_id_categoria_fkey` FOREIGN KEY (`id_categoria`) REFERENCES `categoria`(`id_categoria`) ON DELETE SET NULL ON UPDATE CASCADE;
