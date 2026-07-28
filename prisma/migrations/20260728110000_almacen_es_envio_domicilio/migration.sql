-- AlterTable almacen: flag de almacén de envío a domicilio
ALTER TABLE `almacen` ADD COLUMN `es_envio_domicilio` BOOLEAN NOT NULL DEFAULT false;

-- WH/Stock (odoo_id 14) es el almacén de envío a domicilio
UPDATE `almacen` SET `es_envio_domicilio` = true WHERE `odoo_id` = 14;
