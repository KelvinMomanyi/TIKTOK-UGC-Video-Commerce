import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { recordStorefrontEvent } from "../services/analytics.server";
import { storefrontJson } from "../utils/http.server";
import { assertRateLimit, requestIp } from "../utils/rate-limit.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return storefrontJson({ ok: true });
  }

  return storefrontJson({ ok: false }, { status: 405 });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  assertRateLimit(`analytics-api:${requestIp(request)}`, 600);
  const payload = (await request.json()) as Record<string, unknown>;

  await recordStorefrontEvent(
    {
      widgetToken: String(payload.widgetToken ?? ""),
      videoId: stringOrUndefined(payload.videoId),
      productTagId: stringOrUndefined(payload.productTagId),
      type: String(payload.type ?? ""),
      visitorId: stringOrUndefined(payload.visitorId),
      sessionId: stringOrUndefined(payload.sessionId),
      watchTimeMs: numberOrUndefined(payload.watchTimeMs),
      revenueAmount: numberOrUndefined(payload.revenueAmount),
      currencyCode: stringOrUndefined(payload.currencyCode),
      quantity: numberOrUndefined(payload.quantity),
      orderId: stringOrUndefined(payload.orderId),
      cartToken: stringOrUndefined(payload.cartToken),
      productId: stringOrUndefined(payload.productId),
      variantId: stringOrUndefined(payload.variantId),
      path: stringOrUndefined(payload.path),
      referrer: stringOrUndefined(payload.referrer),
    },
    request,
  );

  return storefrontJson({ ok: true }, { headers: { "cache-control": "no-store" } });
};

function stringOrUndefined(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberOrUndefined(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : undefined;
}
