-- Token opaco para acceder a la confirmación del pedido (anti-IDOR).
ALTER TABLE `venta` ADD COLUMN `access_token` VARCHAR(64) NULL;

UPDATE `venta`
SET `access_token` = LOWER(REPLACE(UUID(), '-', ''))
WHERE `access_token` IS NULL;

ALTER TABLE `venta` MODIFY `access_token` VARCHAR(64) NOT NULL;

CREATE UNIQUE INDEX `venta_access_token_key` ON `venta`(`access_token`);
