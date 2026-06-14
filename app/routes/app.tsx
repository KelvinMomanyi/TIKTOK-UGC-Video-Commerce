import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";

import { authenticate } from "../shopify.server";
import { ensureMerchant } from "../services/merchant.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const merchant = await ensureMerchant(session, admin);

  // eslint-disable-next-line no-undef
  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
    merchant: {
      shop: merchant.shop,
      plan: merchant.plan,
      onboarded: Boolean(merchant.onboardedAt),
    },
  };
};

export default function App() {
  const { apiKey, merchant } = useLoaderData<typeof loader>();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app">Dashboard</s-link>
        <s-link href="/app/videos">Videos</s-link>
        <s-link href="/app/widgets">Widgets</s-link>
        <s-link href="/app/analytics">Analytics</s-link>
        <s-link href="/app/ai">AI insights</s-link>
        <s-link href="/app/billing">Billing</s-link>
        <s-link href="/app/settings">Settings</s-link>
      </s-app-nav>
      <div style={{ display: "none" }} data-shop={merchant.shop} data-plan={merchant.plan} />
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
