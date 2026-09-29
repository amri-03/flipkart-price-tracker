-- DropForeignKey
ALTER TABLE "alerts" DROP CONSTRAINT "fk_alerts_product";

-- DropForeignKey
ALTER TABLE "price_histories" DROP CONSTRAINT "fk_price_histories_product";

-- AlterTable
ALTER TABLE "alerts" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "price_histories" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "alert_snoozed_until" TIMESTAMPTZ,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "price_histories" ADD CONSTRAINT "price_histories_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "idx_alerts_product_active" RENAME TO "alerts_product_id_is_active_idx";

-- RenameIndex
ALTER INDEX "uq_alerts_product_price_channel" RENAME TO "alerts_product_id_target_price_notification_channel_key";

-- RenameIndex
ALTER INDEX "idx_price_histories_product_recorded" RENAME TO "price_histories_product_id_recorded_at_idx";

-- RenameIndex
ALTER INDEX "idx_products_platform_id" RENAME TO "products_platform_id_idx";
