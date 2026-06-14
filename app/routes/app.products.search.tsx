import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { searchProducts } from "../services/shopify/products.server";
import { ok } from "../utils/http.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return ok({ products: [] });
  }

  const products = await searchProducts(admin, query);
  return ok({ products });
};
