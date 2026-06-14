import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  // Analytics uses anonymous visitor/session IDs and hashed network metadata.
  // If customer identifiers are added later, export them from here.
  return new Response();
};
