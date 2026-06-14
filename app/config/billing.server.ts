import { BillingInterval } from "@shopify/shopify-app-react-router/server";
import {
  GROWTH_PLAN,
  PLAN_DETAILS,
  PRO_PLAN,
  STARTER_PLAN,
} from "./billing";

export * from "./billing";

export const shopifyBillingConfig = {
  [STARTER_PLAN]: {
    trialDays: PLAN_DETAILS.STARTER.trialDays,
    lineItems: [
      {
        amount: PLAN_DETAILS.STARTER.price,
        currencyCode: "USD",
        interval: BillingInterval.Every30Days as BillingInterval.Every30Days,
      },
    ],
  },
  [GROWTH_PLAN]: {
    trialDays: PLAN_DETAILS.GROWTH.trialDays,
    lineItems: [
      {
        amount: PLAN_DETAILS.GROWTH.price,
        currencyCode: "USD",
        interval: BillingInterval.Every30Days as BillingInterval.Every30Days,
      },
    ],
  },
  [PRO_PLAN]: {
    trialDays: PLAN_DETAILS.PRO.trialDays,
    lineItems: [
      {
        amount: PLAN_DETAILS.PRO.price,
        currencyCode: "USD",
        interval: BillingInterval.Every30Days as BillingInterval.Every30Days,
      },
    ],
  },
};
