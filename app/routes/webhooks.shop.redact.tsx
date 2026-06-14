import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { markMerchantUninstalled } from "../repositories/merchant.repository.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  await markMerchantUninstalled(shop);
  return new Response();
};
