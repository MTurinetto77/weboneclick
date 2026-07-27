-- AlterTable
ALTER TABLE `parametro` ADD COLUMN `grupo_parametros` VARCHAR(50) NULL;

-- CreateIndex
CREATE INDEX `parametro_grupo_parametros_idx` ON `parametro`(`grupo_parametros`);

-- AlterTable
ALTER TABLE `codigo_postal_envio` ADD COLUMN `zona` INTEGER NULL;

-- CreateIndex
CREATE INDEX `codigo_postal_envio_proveedor_zona_idx` ON `codigo_postal_envio`(`proveedor`, `zona`);
