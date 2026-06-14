export const STARTER_PLAN = "Starter";
export const GROWTH_PLAN = "Growth";
export const PRO_PLAN = "Pro";

export const SHOPIFY_BILLING_PLANS = [STARTER_PLAN, GROWTH_PLAN, PRO_PLAN] as const;

export type ShopifyBillingPlanName = (typeof SHOPIFY_BILLING_PLANS)[number];
export type AppPlanKey = "STARTER" | "GROWTH" | "PRO";

export const APP_PLAN_BY_BILLING_NAME: Record<ShopifyBillingPlanName, AppPlanKey> = {
  [STARTER_PLAN]: "STARTER",
  [GROWTH_PLAN]: "GROWTH",
  [PRO_PLAN]: "PRO",
};

export const PLAN_LIMITS: Record<
  AppPlanKey,
  {
    videos: number;
    widgets: number;
    monthlyViews: number;
    aiInsights: number;
    seats: number;
  }
> = {
  STARTER: {
    videos: 25,
    widgets: 2,
    monthlyViews: 10000,
    aiInsights: 25,
    seats: 1,
  },
  GROWTH: {
    videos: 250,
    widgets: 10,
    monthlyViews: 100000,
    aiInsights: 250,
    seats: 5,
  },
  PRO: {
    videos: 2500,
    widgets: 50,
    monthlyViews: 1000000,
    aiInsights: 2500,
    seats: 15,
  },
};

export const PLAN_DETAILS: Record<
  AppPlanKey,
  {
    name: ShopifyBillingPlanName;
    price: number;
    trialDays: number;
    description: string;
  }
> = {
  STARTER: {
    name: STARTER_PLAN,
    price: 19,
    trialDays: 14,
    description: "Launch shoppable video feeds with core analytics.",
  },
  GROWTH: {
    name: GROWTH_PLAN,
    price: 79,
    trialDays: 14,
    description: "Scale multiple widgets, AI optimization, and deeper reporting.",
  },
  PRO: {
    name: PRO_PLAN,
    price: 199,
    trialDays: 14,
    description: "High-volume video commerce with advanced limits and support.",
  },
};
