import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, redirect, useLoaderData, useNavigation } from "react-router";
import { authenticate } from "../shopify.server";
import {
  APP_PLAN_BY_BILLING_NAME,
  PLAN_DETAILS,
  SHOPIFY_BILLING_PLANS,
  type ShopifyBillingPlanName,
} from "../config/billing";
import { appUrl, env } from "../config/env.server";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import { subscriptionsForMerchant, syncActiveBilling } from "../services/billing.server";
import { ensureMerchant } from "../services/merchant.server";
import { badRequest } from "../utils/http.server";
import { stringValue } from "../utils/validation";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, billing, session } = await authenticate.admin(request);
  const merchant = await ensureMerchant(session, admin);
  const billingCheck = await (billing.check as unknown as (options: {
    plans: string[];
    isTest: boolean;
  }) => Promise<{
    hasActivePayment: boolean;
    appSubscriptions: Array<{
      id: string;
      name: string;
      test: boolean;
      status: "ACTIVE" | "CANCELLED" | "PENDING" | "DECLINED" | "EXPIRED" | "FROZEN" | "ACCEPTED";
      trialDays: number;
      createdAt: string;
      currentPeriodEnd: string;
      lineItems: unknown[];
    }>;
  }>)({
    plans: [...SHOPIFY_BILLING_PLANS],
    isTest: env.billingTestMode,
  });

  await syncActiveBilling(merchant, billingCheck.appSubscriptions);
  const activePlan = billingCheck.appSubscriptions.find((subscription) =>
    SHOPIFY_BILLING_PLANS.includes(subscription.name as ShopifyBillingPlanName),
  );
  const subscriptions = await subscriptionsForMerchant(merchant);

  return {
    merchant: {
      plan: activePlan ? APP_PLAN_BY_BILLING_NAME[activePlan.name as ShopifyBillingPlanName] : merchant.plan,
    },
    billing: {
      hasActivePayment: billingCheck.hasActivePayment,
      appSubscriptions: billingCheck.appSubscriptions,
      testMode: env.billingTestMode,
    },
    subscriptions: subscriptions.map((subscription) => ({
      id: subscription.id,
      plan: subscription.plan,
      status: subscription.status,
      priceAmount: subscription.priceAmount.toString(),
      currentPeriodEnd: subscription.currentPeriodEnd?.toISOString(),
    })),
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, billing, session } = await authenticate.admin(request);
  await ensureMerchant(session, admin);
  const formData = await request.formData();
  const intent = stringValue(formData, "intent");

  if (intent === "request_plan") {
    const plan = stringValue(formData, "plan") as ShopifyBillingPlanName;
    if (!SHOPIFY_BILLING_PLANS.includes(plan)) {
      return badRequest("Invalid billing plan.");
    }

    await (billing.request as unknown as (options: {
      plan: string;
      isTest: boolean;
      returnUrl: string;
    }) => Promise<never>)({
      plan,
      isTest: env.billingTestMode,
      returnUrl: appUrl("/app/billing"),
    });
  }

  return redirect("/app/billing");
};

export default function BillingPage() {
  const { merchant, billing, subscriptions } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";

  return (
    <s-page>
      <div className="tvc-page">
        <PageHeader
          eyebrow={billing.testMode ? "Billing • test mode" : "Billing"}
          title="Plans that scale with video commerce volume"
          subtitle="Shopify Billing is wired through the app authentication context and synced to local subscription records for feature gating."
        />

        <div className="tvc-grid tvc-grid--3">
          {SHOPIFY_BILLING_PLANS.map((planName) => {
            const appPlan = APP_PLAN_BY_BILLING_NAME[planName];
            const plan = PLAN_DETAILS[appPlan];
            const active = merchant.plan === appPlan && billing.hasActivePayment;

            return (
              <article className="tvc-card" key={planName}>
                <div className="tvc-card__body tvc-stack">
                  <div className="tvc-row">
                    <h2 style={{ margin: 0 }}>{plan.name}</h2>
                    {active ? <StatusBadge status="ACTIVE" /> : null}
                  </div>
                  <strong className="tvc-kpi__value">${plan.price}</strong>
                  <p className="tvc-subtitle">{plan.description}</p>
                  <span className="tvc-badge">{plan.trialDays} day trial</span>
                  <Form method="post">
                    <input type="hidden" name="intent" value="request_plan" />
                    <input type="hidden" name="plan" value={plan.name} />
                    <s-button variant={active ? undefined : "primary"} type="submit" disabled={busy || active}>
                      {active ? "Current plan" : "Choose plan"}
                    </s-button>
                  </Form>
                </div>
              </article>
            );
          })}
        </div>

        <section className="tvc-card">
          <div className="tvc-card__body tvc-stack">
            <h2 style={{ margin: 0 }}>Subscription history</h2>
            <table className="tvc-table">
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Price</th>
                  <th>Current period</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((subscription) => (
                  <tr key={subscription.id}>
                    <td>{subscription.plan}</td>
                    <td><StatusBadge status={subscription.status} /></td>
                    <td>${subscription.priceAmount}</td>
                    <td>{subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : "Trial or pending"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </s-page>
  );
}
