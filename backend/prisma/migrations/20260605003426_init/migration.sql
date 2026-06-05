-- Create Enum Types for structured settings
CREATE TYPE "NotificationChannel" AS ENUM ('TELEGRAM', 'DISCORD', 'EMAIL');

-- 1. Products Table (Flipkart Only)
CREATE TABLE "products" (
                            "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                            "url" TEXT NOT NULL,
                            "platform_id" VARCHAR(100) NOT NULL UNIQUE, -- Stores unique Flipkart FSN / product ID
                            "title" VARCHAR(512) NOT NULL,
                            "image_url" TEXT,
                            "current_price" DECIMAL(12, 2) NOT NULL,
                            "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Price Histories Table
CREATE TABLE "price_histories" (
                                   "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                   "product_id" UUID NOT NULL,
                                   "price" DECIMAL(12, 2) NOT NULL,
                                   "recorded_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                   CONSTRAINT "fk_price_histories_product" FOREIGN KEY ("product_id")
                                       REFERENCES "products" ("id") ON DELETE CASCADE
);

-- 3. Alerts Table (With Cooldown Support and Duplicate Prevention)
CREATE TABLE "alerts" (
                          "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                          "product_id" UUID NOT NULL,
                          "target_price" DECIMAL(12, 2) NOT NULL,
                          "notification_channel" "NotificationChannel" NOT NULL DEFAULT 'TELEGRAM',
                          "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
                          "last_triggered_at" TIMESTAMP WITH TIME ZONE, -- Keeps track of last sent notification timestamp
                          "cooldown_hours" INTEGER NOT NULL DEFAULT 24,  -- Sets the quiet window duration (default 24h)
                          "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                          CONSTRAINT "fk_alerts_product" FOREIGN KEY ("product_id")
                              REFERENCES "products" ("id") ON DELETE CASCADE,
    -- Prevent duplicate user-configured alert criteria
                          CONSTRAINT "uq_alerts_product_price_channel" UNIQUE ("product_id", "target_price", "notification_channel")
);

-- Optimizing Performance Indexes
CREATE INDEX "idx_products_platform_id" ON "products" ("platform_id");
CREATE INDEX "idx_price_histories_product_recorded" ON "price_histories" ("product_id", "recorded_at" DESC);
CREATE INDEX "idx_alerts_product_active" ON "alerts" ("product_id", "is_active");