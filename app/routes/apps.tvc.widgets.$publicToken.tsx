import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { publicWidgetPayload } from "../services/widget.server";
import { storefrontJson } from "../utils/http.server";
import { assertRateLimit, requestIp } from "../utils/rate-limit.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  assertRateLimit(`widget:${requestIp(request)}:${params.publicToken}`, 240);
  await authenticate.public.appProxy(request);
  const payload = await publicWidgetPayload(params.publicToken ?? "");

  return storefrontJson(payload, {
    headers: {
      "cache-control": "public, max-age=30, stale-while-revalidate=300",
    },
  });
};
