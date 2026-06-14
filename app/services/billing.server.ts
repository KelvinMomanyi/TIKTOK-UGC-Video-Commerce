import type { Merchant, Prisma } from "@prisma/client";
import {
  APP_PLAN_BY_BILLING_NAME,
  type ShopifyBillingPlanName,
  PLAN_DETAILS,
  SHOPIFY_BILLING_PLANS,
} from "../config/billing";
import { listSubscriptions, upsertSubscriptionByShopifyId } from "../repositories/subscription.repository.server";
import { updateMerchant } from "../repositories/merchant.repository.server";

type AppSubscriptionLike = {
  id: string;
  name: string;
  test: boolean;
  status: "ACTIVE" | "CANCELLED" | "PENDING" | "DECLINED" | "EXPIRED" | "FROZEN" | "ACCEPTED";
  trialDays: number;
  createdAt: string;
  currentPeriodEnd: string;
  lineItems: unknown[];
};

export function subscriptionsForMerchant(merchant: Merchant) {
  return listSubscriptions(merchant.id);
}

export async function syncActiveBilling(merchant: Merchant, subscriptions: AppSubscriptionLike[]) {
  const active = subscriptions.find((subscription) =>
    SHOPIFY_BILLING_PLANS.includes(subscription.name as ShopifyBillingPlanName),
  );

  if (!active) return null;

  const appPlan = APP_PLAN_BY_BILLING_NAME[active.name as ShopifyBillingPlanName];
  const details = PLAN_DETAILS[appPlan];
  const status = active.status === "ACTIVE" ? "ACTIVE" : active.status === "FROZEN" ? "FROZEN" : "TRIALING";

  await updateMerchant(merchant.id, { plan: appPlan });

  return upsertSubscriptionByShopifyId({
    merchantId: merchant.id,
    shopifySubscriptionId: active.id,
    plan: appPlan,
    status,
    priceAmount: details.price,
    currencyCode: "USD",
    currentPeriodEnd: active.currentPeriodEnd ? new Date(active.currentPeriodEnd) : undefined,
    trialEndsAt: active.trialDays ? trialEndFrom(active.createdAt, active.trialDays) : undefined,
    activatedAt: active.createdAt ? new Date(active.createdAt) : new Date(),
    metadata: {
      shopifyStatus: active.status,
      lineItems: active.lineItems as Prisma.InputJsonArray,
      test: active.test,
    } as Prisma.InputJsonObject,
  });
}

function trialEndFrom(createdAt: string, trialDays: number) {
  const date = new Date(createdAt);
  date.setUTCDate(date.getUTCDate() + trialDays);
  return date;
}
