import type { AnalyticsEventType, Prisma } from "@prisma/client";
import prisma from "../db.server";
import { startOfUtcDay } from "../utils/date.server";

export function createAnalyticsEvent(data: Prisma.AnalyticsEventUncheckedCreateInput) {
  return prisma.analyticsEvent.create({ data });
}

export function createManyAnalyticsEvents(data: Prisma.AnalyticsEventUncheckedCreateInput[]) {
  if (data.length === 0) return Promise.resolve({ count: 0 });
  return prisma.analyticsEvent.createMany({ data });
}

export async function incrementDailyRollup(input: {
  merchantId: string;
  widgetId: string;
  occurredAt: Date;
  type: AnalyticsEventType;
  watchTimeMs?: number;
  revenueAmount?: number;
  currencyCode?: string;
}) {
  const day = startOfUtcDay(input.occurredAt);
  const data = metricIncrement(input.type, input.watchTimeMs, input.revenueAmount);

  return prisma.analyticsDailyRollup.upsert({
    where: {
      merchantId_widgetId_day: {
        merchantId: input.merchantId,
        widgetId: input.widgetId,
        day,
      },
    },
    create: {
      merchantId: input.merchantId,
      widgetId: input.widgetId,
      day,
      currencyCode: input.currencyCode ?? "USD",
      ...data.create,
    },
    update: {
      currencyCode: input.currencyCode ?? "USD",
      ...data.update,
    },
  });
}

function metricIncrement(type: AnalyticsEventType, watchTimeMs = 0, revenueAmount = 0) {
  const create = {
    impressions: type === "IMPRESSION" ? 1 : 0,
    views: type === "VIEW" ? 1 : 0,
    watchTimeMs: type === "WATCH_TIME" ? watchTimeMs : 0,
    clicks: type === "CLICK" ? 1 : 0,
    addToCarts: type === "ADD_TO_CART" ? 1 : 0,
    purchases: type === "PURCHASE" ? 1 : 0,
    revenueAmount: type === "PURCHASE" ? revenueAmount : 0,
  };

  return {
    create,
    update: {
      impressions: { increment: create.impressions },
      views: { increment: create.views },
      watchTimeMs: { increment: create.watchTimeMs },
      clicks: { increment: create.clicks },
      addToCarts: { increment: create.addToCarts },
      purchases: { increment: create.purchases },
      revenueAmount: { increment: create.revenueAmount },
    },
  };
}

export function listRollups(merchantId: string, since: Date) {
  return prisma.analyticsDailyRollup.findMany({
    where: { merchantId, day: { gte: since } },
    orderBy: { day: "asc" },
  });
}

export function aggregateEvents(merchantId: string, since: Date) {
  return prisma.analyticsEvent.groupBy({
    by: ["type"],
    where: {
      merchantId,
      occurredAt: { gte: since },
    },
    _count: true,
    _sum: {
      watchTimeMs: true,
      revenueAmount: true,
    },
  });
}

export function topVideosByViews(merchantId: string, since: Date) {
  return prisma.analyticsEvent.groupBy({
    by: ["videoId"],
    where: {
      merchantId,
      type: "VIEW",
      videoId: { not: null },
      occurredAt: { gte: since },
    },
    _count: true,
    orderBy: {
      _count: {
        videoId: "desc",
      },
    },
    take: 5,
  });
}
