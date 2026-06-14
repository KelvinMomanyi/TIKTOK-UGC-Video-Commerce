import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { markMerchantUninstalled } from "../repositories/merchant.repository.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // If this webhook already ran, the session may have been deleted previously.
  if (session) {
    await Promise.all([
      db.session.deleteMany({ where: { shop } }),
      markMerchantUninstalled(shop),
    ]);
  } else {
    await markMerchantUninstalled(shop);
  }

  return new Response();
};
