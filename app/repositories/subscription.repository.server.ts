import type { Prisma } from "@prisma/client";
import prisma from "../db.server";

export function listSubscriptions(merchantId: string) {
  return prisma.subscription.findMany({
    where: { merchantId },
    orderBy: { createdAt: "desc" },
  });
}

export function upsertSubscriptionByShopifyId(data: Prisma.SubscriptionUncheckedCreateInput & { shopifySubscriptionId: string }) {
  return prisma.subscription.upsert({
    where: { shopifySubscriptionId: data.shopifySubscriptionId },
    create: data,
    update: {
      plan: data.plan,
      status: data.status,
      priceAmount: data.priceAmount,
      currencyCode: data.currencyCode,
      currentPeriodEnd: data.currentPeriodEnd,
      trialEndsAt: data.trialEndsAt,
      activatedAt: data.activatedAt,
      metadata: data.metadata,
    },
  });
}
