-- AlterTable cliente
ALTER TABLE `cliente` ADD COLUMN `odoo_partner_id` INTEGER NULL;
CREATE UNIQUE INDEX `cliente_odoo_partner_id_key` ON `cliente`(`odoo_partner_id`);

-- AlterTable venta
ALTER TABLE `venta` ADD COLUMN `idempotency_key` VARCHAR(64) NULL,
    ADD COLUMN `id_tienda_retiro` INTEGER NULL,
    ADD COLUMN `odoo_partner_id` INTEGER NULL,
    ADD COLUMN `odoo_order_id` INTEGER NULL,
    ADD COLUMN `odoo_order_name` VARCHAR(50) NULL,
    ADD COLUMN `odoo_payment_id` INTEGER NULL,
    ADD COLUMN `odoo_payment_name` VARCHAR(50) NULL,
    ADD COLUMN `odoo_warehouse_id` INTEGER NULL,
    ADD COLUMN `odoo_sync_estado` VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    ADD COLUMN `odoo_sync_error` TEXT NULL,
    ADD COLUMN `odoo_sync_intentos` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `odoo_sync_at` DATETIME(3) NULL;

CREATE UNIQUE INDEX `venta_idempotency_key_key` ON `venta`(`idempotency_key`);
CREATE UNIQUE INDEX `venta_odoo_order_id_key` ON `venta`(`odoo_order_id`);
CREATE UNIQUE INDEX `venta_odoo_payment_id_key` ON `venta`(`odoo_payment_id`);

ALTER TABLE `venta` ADD CONSTRAINT `venta_id_tienda_retiro_fkey` FOREIGN KEY (`id_tienda_retiro`) REFERENCES `tienda`(`id_tienda`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable venta_detalle
ALTER TABLE `venta_detalle` ADD COLUMN `precio_cobrado` DECIMAL(12, 2) NULL;

-- AlterTable pago: unique on transaction_id (drop duplicates first if any - none expected)
CREATE UNIQUE INDEX `pago_transaction_id_key` ON `pago`(`transaction_id`);
