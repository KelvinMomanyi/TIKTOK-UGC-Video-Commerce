import type { AnalyticsEventType, Merchant } from "@prisma/client";
import {
  aggregateEvents,
  createAnalyticsEvent,
  incrementDailyRollup,
  listRollups,
  topVideosByViews,
} from "../repositories/analytics.repository.server";
import { updateVideoCounters } from "../repositories/video.repository.server";
import { findPublishedWidgetByToken } from "../repositories/widget.repository.server";
import { anonymousHash } from "../utils/crypto.server";
import { daysAgo } from "../utils/date.server";

const VALID_EVENT_TYPES = new Set<AnalyticsEventType>([
  "IMPRESSION",
  "VIEW",
  "WATCH_TIME",
  "CLICK",
  "ADD_TO_CART",
  "CHECKOUT_STARTED",
  "PURCHASE",
]);

export type StorefrontAnalyticsInput = {
  widgetToken: string;
  videoId?: string;
  productTagId?: string;
  type: string;
  visitorId?: string;
  sessionId?: string;
  watchTimeMs?: number;
  revenueAmount?: number;
  currencyCode?: string;
  quantity?: number;
  orderId?: string;
  cartToken?: string;
  productId?: string;
  variantId?: string;
  path?: string;
  referrer?: string;
};

export async function recordStorefrontEvent(input: StorefrontAnalyticsInput, request: Request) {
  if (!VALID_EVENT_TYPES.has(input.type as AnalyticsEventType)) {
    throw new Response("Invalid analytics event type", { status: 400 });
  }

  const widget = await findPublishedWidgetByToken(input.widgetToken);
  if (!widget || widget.status !== "PUBLISHED" || widget.deletedAt || widget.merchant.uninstalledAt) {
    throw new Response("Widget not found", { status: 404 });
  }

  const type = input.type as AnalyticsEventType;
  const event = await createAnalyticsEvent({
    merchantId: widget.merchantId,
    widgetId: widget.id,
    videoId: input.videoId,
    productTagId: input.productTagId,
    type,
    watchTimeMs: input.watchTimeMs,
    revenueAmount: input.revenueAmount,
    currencyCode: input.currencyCode,
    quantity: input.quantity,
    orderId: input.orderId,
    cartToken: input.cartToken,
    productId: input.productId,
    variantId: input.variantId,
    path: input.path,
    referrer: input.referrer,
    visitorId: input.visitorId,
    sessionId: input.sessionId,
    userAgentHash: anonymousHash(request.headers.get("user-agent")),
    ipHash: anonymousHash(
      request.headers.get("cf-connecting-ip") ??
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    ),
  });

  await incrementDailyRollup({
    merchantId: widget.merchantId,
    widgetId: widget.id,
    occurredAt: event.occurredAt,
    type,
    watchTimeMs: input.watchTimeMs,
    revenueAmount: input.revenueAmount,
    currencyCode: input.currencyCode,
  });

  if (input.videoId) {
    await updateVideoCounters(input.videoId, countersForType(type));
  }

  return event;
}

export async function analyticsDashboard(merchant: Merchant, rangeDays: number) {
  const since = daysAgo(rangeDays);
  const [rollups, grouped, topVideos] = await Promise.all([
    listRollups(merchant.id, since),
    aggregateEvents(merchant.id, since),
    topVideosByViews(merchant.id, since),
  ]);

  const totals = grouped.reduce(
    (acc, item) => {
      const count = item._count;
      if (item.type === "IMPRESSION") acc.impressions += count;
      if (item.type === "VIEW") acc.views += count;
      if (item.type === "CLICK") acc.clicks += count;
      if (item.type === "ADD_TO_CART") acc.addToCarts += count;
      if (item.type === "PURCHASE") {
        acc.purchases += count;
        acc.revenue += Number(item._sum.revenueAmount ?? 0);
      }
      if (item.type === "WATCH_TIME") acc.watchTimeMs += Number(item._sum.watchTimeMs ?? 0);
      return acc;
    },
    {
      impressions: 0,
      views: 0,
      clicks: 0,
      addToCarts: 0,
      purchases: 0,
      revenue: 0,
      watchTimeMs: 0,
    },
  );

  return {
    totals: {
      ...totals,
      viewRate: totals.impressions ? totals.views / totals.impressions : 0,
      clickThroughRate: totals.views ? totals.clicks / totals.views : 0,
      conversionRate: totals.clicks ? totals.purchases / totals.clicks : 0,
    },
    rollups: rollups.map((rollup) => ({
      day: rollup.day.toISOString().slice(0, 10),
      impressions: rollup.impressions,
      views: rollup.views,
      clicks: rollup.clicks,
      addToCarts: rollup.addToCarts,
      purchases: rollup.purchases,
      revenue: Number(rollup.revenueAmount),
    })),
    topVideos,
  };
}

function countersForType(type: AnalyticsEventType) {
  if (type === "IMPRESSION") return { impressions: 1 };
  if (type === "VIEW") return { views: 1 };
  if (type === "CLICK") return { clicks: 1 };
  if (type === "PURCHASE") return { conversions: 1 };
  return {};
}
