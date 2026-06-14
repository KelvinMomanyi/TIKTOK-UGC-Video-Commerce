import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { publicWidgetPayload } from "../services/widget.server";
import { storefrontJson } from "../utils/http.server";
import { assertRateLimit, requestIp } from "../utils/rate-limit.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  assertRateLimit(`widget-api:${requestIp(request)}:${params.publicToken}`, 240);
  const payload = await publicWidgetPayload(params.publicToken ?? "");

  return storefrontJson(payload, {
    headers: {
      "cache-control": "public, max-age=30, stale-while-revalidate=300",
    },
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return storefrontJson({ ok: true });
  }

  return storefrontJson({ ok: false }, { status: 405 });
};
