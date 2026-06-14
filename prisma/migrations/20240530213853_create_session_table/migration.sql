-- Initial production schema for the TikTok UGC Video Commerce app.
-- The app is Postgres-first; use DATABASE_URL for local and production databases.

CREATE TYPE "VideoSource" AS ENUM ('TIKTOK', 'UPLOAD', 'EXTERNAL');
CREATE TYPE "VideoProvider" AS ENUM ('MUX', 'CLOUDFLARE_STREAM', 'EXTERNAL');
CREATE TYPE "VideoStatus" AS ENUM ('UPLOADING', 'IMPORTING', 'PROCESSING', 'READY', 'FAILED', 'ARCHIVED');
CREATE TYPE "WidgetType" AS ENUM ('HOME_FEED', 'PRODUCT_CAROUSEL', 'FLOATING_STORIES', 'COLLECTION_FEED');
CREATE TYPE "WidgetStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'PAUSED');
CREATE TYPE "PlacementTarget" AS ENUM ('HOME', 'PRODUCT', 'COLLECTION', 'CUSTOM', 'ALL');
CREATE TYPE "AnalyticsEventType" AS ENUM ('IMPRESSION', 'VIEW', 'WATCH_TIME', 'CLICK', 'ADD_TO_CART', 'CHECKOUT_STARTED', 'PURCHASE');
CREATE TYPE "SubscriptionPlan" AS ENUM ('STARTER', 'GROWTH', 'PRO');
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'FROZEN', 'EXPIRED');
CREATE TYPE "AIInsightType" AS ENUM ('CAPTION', 'HOOK', 'THUMBNAIL', 'VIRAL_SCORE', 'OPTIMIZATION');
CREATE TYPE "AIInsightStatus" AS ENUM ('QUEUED', 'READY', 'FAILED');

CREATE TABLE "Merchant" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "shopifyShopId" TEXT,
    "name" TEXT,
    "email" TEXT,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'STARTER',
    "publicApiToken" TEXT NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "onboardedAt" TIMESTAMP(3),
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uninstalledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,
    "refreshToken" TEXT,
    "refreshTokenExpires" TIMESTAMP(3),
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Video" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "source" "VideoSource" NOT NULL,
    "provider" "VideoProvider" NOT NULL DEFAULT 'EXTERNAL',
    "status" "VideoStatus" NOT NULL DEFAULT 'PROCESSING',
    "title" TEXT NOT NULL,
    "caption" TEXT,
    "originalUrl" TEXT,
    "importUrl" TEXT,
    "uploadUrl" TEXT,
    "providerAssetId" TEXT,
    "providerPlaybackId" TEXT,
    "playbackUrl" TEXT,
    "thumbnailUrl" TEXT,
    "durationSeconds" DOUBLE PRECISION,
    "width" INTEGER,
    "height" INTEGER,
    "aspectRatio" TEXT,
    "failureReason" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductTag" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "shopifyProductId" TEXT NOT NULL,
    "shopifyVariantId" TEXT,
    "productHandle" TEXT,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT,
    "priceAmount" DECIMAL(12,2),
    "currencyCode" TEXT,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "startTimeSeconds" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "endTimeSeconds" DOUBLE PRECISION,
    "ctaLabel" TEXT NOT NULL DEFAULT 'Shop now',
    "clickUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProductTag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Widget" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "publicToken" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "type" "WidgetType" NOT NULL,
    "status" "WidgetStatus" NOT NULL DEFAULT 'DRAFT',
    "layout" TEXT NOT NULL DEFAULT 'grid',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "productId" TEXT,
    "productHandle" TEXT,
    "collectionId" TEXT,
    "collectionHandle" TEXT,
    "publishedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Widget_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WidgetVideo" (
    "id" TEXT NOT NULL,
    "widgetId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WidgetVideo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WidgetPlacement" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "widgetId" TEXT NOT NULL,
    "target" "PlacementTarget" NOT NULL,
    "resourceId" TEXT,
    "resourceHandle" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "position" TEXT NOT NULL DEFAULT 'main',
    "conditions" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WidgetPlacement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "widgetId" TEXT,
    "videoId" TEXT,
    "productTagId" TEXT,
    "type" "AnalyticsEventType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visitorId" TEXT,
    "sessionId" TEXT,
    "watchTimeMs" INTEGER,
    "revenueAmount" DECIMAL(12,2),
    "currencyCode" TEXT,
    "quantity" INTEGER,
    "orderId" TEXT,
    "cartToken" TEXT,
    "productId" TEXT,
    "variantId" TEXT,
    "path" TEXT,
    "referrer" TEXT,
    "userAgentHash" TEXT,
    "ipHash" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AnalyticsDailyRollup" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "widgetId" TEXT,
    "day" TIMESTAMP(3) NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "watchTimeMs" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "addToCarts" INTEGER NOT NULL DEFAULT 0,
    "purchases" INTEGER NOT NULL DEFAULT 0,
    "revenueAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AnalyticsDailyRollup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "shopifySubscriptionId" TEXT,
    "plan" "SubscriptionPlan" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "priceAmount" DECIMAL(12,2) NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AIInsight" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "videoId" TEXT,
    "type" "AIInsightType" NOT NULL,
    "status" "AIInsightStatus" NOT NULL DEFAULT 'QUEUED',
    "title" TEXT NOT NULL,
    "body" TEXT,
    "score" DOUBLE PRECISION,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "generatedBy" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AIInsight_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Merchant_shop_key" ON "Merchant"("shop");
CREATE UNIQUE INDEX "Merchant_publicApiToken_key" ON "Merchant"("publicApiToken");
CREATE INDEX "Merchant_plan_idx" ON "Merchant"("plan");
CREATE INDEX "Merchant_uninstalledAt_idx" ON "Merchant"("uninstalledAt");

CREATE INDEX "Session_shop_idx" ON "Session"("shop");
CREATE INDEX "Session_isOnline_idx" ON "Session"("isOnline");

CREATE INDEX "Video_merchantId_status_createdAt_idx" ON "Video"("merchantId", "status", "createdAt");
CREATE INDEX "Video_merchantId_deletedAt_idx" ON "Video"("merchantId", "deletedAt");
CREATE INDEX "Video_provider_providerAssetId_idx" ON "Video"("provider", "providerAssetId");

CREATE INDEX "ProductTag_merchantId_videoId_deletedAt_idx" ON "ProductTag"("merchantId", "videoId", "deletedAt");
CREATE INDEX "ProductTag_shopifyProductId_idx" ON "ProductTag"("shopifyProductId");
CREATE INDEX "ProductTag_shopifyVariantId_idx" ON "ProductTag"("shopifyVariantId");

CREATE UNIQUE INDEX "Widget_publicToken_key" ON "Widget"("publicToken");
CREATE INDEX "Widget_merchantId_status_type_idx" ON "Widget"("merchantId", "status", "type");
CREATE INDEX "Widget_merchantId_deletedAt_idx" ON "Widget"("merchantId", "deletedAt");
CREATE INDEX "Widget_productHandle_idx" ON "Widget"("productHandle");
CREATE INDEX "Widget_collectionHandle_idx" ON "Widget"("collectionHandle");

CREATE UNIQUE INDEX "WidgetVideo_widgetId_videoId_key" ON "WidgetVideo"("widgetId", "videoId");
CREATE INDEX "WidgetVideo_widgetId_sortOrder_idx" ON "WidgetVideo"("widgetId", "sortOrder");
CREATE INDEX "WidgetVideo_videoId_idx" ON "WidgetVideo"("videoId");

CREATE INDEX "WidgetPlacement_merchantId_target_enabled_idx" ON "WidgetPlacement"("merchantId", "target", "enabled");
CREATE INDEX "WidgetPlacement_widgetId_idx" ON "WidgetPlacement"("widgetId");
CREATE INDEX "WidgetPlacement_resourceHandle_idx" ON "WidgetPlacement"("resourceHandle");

CREATE INDEX "AnalyticsEvent_merchantId_type_occurredAt_idx" ON "AnalyticsEvent"("merchantId", "type", "occurredAt");
CREATE INDEX "AnalyticsEvent_merchantId_occurredAt_idx" ON "AnalyticsEvent"("merchantId", "occurredAt");
CREATE INDEX "AnalyticsEvent_widgetId_type_occurredAt_idx" ON "AnalyticsEvent"("widgetId", "type", "occurredAt");
CREATE INDEX "AnalyticsEvent_videoId_type_occurredAt_idx" ON "AnalyticsEvent"("videoId", "type", "occurredAt");
CREATE INDEX "AnalyticsEvent_visitorId_occurredAt_idx" ON "AnalyticsEvent"("visitorId", "occurredAt");
CREATE INDEX "AnalyticsEvent_orderId_idx" ON "AnalyticsEvent"("orderId");

CREATE UNIQUE INDEX "AnalyticsDailyRollup_merchantId_widgetId_day_key" ON "AnalyticsDailyRollup"("merchantId", "widgetId", "day");
CREATE INDEX "AnalyticsDailyRollup_merchantId_day_idx" ON "AnalyticsDailyRollup"("merchantId", "day");
CREATE INDEX "AnalyticsDailyRollup_widgetId_day_idx" ON "AnalyticsDailyRollup"("widgetId", "day");

CREATE UNIQUE INDEX "Subscription_shopifySubscriptionId_key" ON "Subscription"("shopifySubscriptionId");
CREATE INDEX "Subscription_merchantId_status_idx" ON "Subscription"("merchantId", "status");
CREATE INDEX "Subscription_plan_idx" ON "Subscription"("plan");

CREATE INDEX "AIInsight_merchantId_type_createdAt_idx" ON "AIInsight"("merchantId", "type", "createdAt");
CREATE INDEX "AIInsight_videoId_type_idx" ON "AIInsight"("videoId", "type");

ALTER TABLE "Video" ADD CONSTRAINT "Video_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductTag" ADD CONSTRAINT "ProductTag_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductTag" ADD CONSTRAINT "ProductTag_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Widget" ADD CONSTRAINT "Widget_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WidgetVideo" ADD CONSTRAINT "WidgetVideo_widgetId_fkey" FOREIGN KEY ("widgetId") REFERENCES "Widget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WidgetVideo" ADD CONSTRAINT "WidgetVideo_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WidgetPlacement" ADD CONSTRAINT "WidgetPlacement_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WidgetPlacement" ADD CONSTRAINT "WidgetPlacement_widgetId_fkey" FOREIGN KEY ("widgetId") REFERENCES "Widget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_widgetId_fkey" FOREIGN KEY ("widgetId") REFERENCES "Widget"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_productTagId_fkey" FOREIGN KEY ("productTagId") REFERENCES "ProductTag"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnalyticsDailyRollup" ADD CONSTRAINT "AnalyticsDailyRollup_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalyticsDailyRollup" ADD CONSTRAINT "AnalyticsDailyRollup_widgetId_fkey" FOREIGN KEY ("widgetId") REFERENCES "Widget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AIInsight" ADD CONSTRAINT "AIInsight_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AIInsight" ADD CONSTRAINT "AIInsight_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE SET NULL ON UPDATE CASCADE;
