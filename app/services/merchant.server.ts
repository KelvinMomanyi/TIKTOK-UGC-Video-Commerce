import type { Merchant, Prisma } from "@prisma/client";
import {
  findMerchantByPublicToken,
  findMerchantByShop,
  updateMerchant,
  upsertMerchantByShop,
} from "../repositories/merchant.repository.server";

type AdminContext = {
  graphql: (query: string, options?: Record<string, unknown>) => Promise<Response>;
};

type ShopifySession = {
  shop: string;
};

export async function ensureMerchant(session: ShopifySession, admin?: AdminContext) {
  const identity = admin ? await fetchShopIdentity(admin).catch(() => undefined) : undefined;
  return upsertMerchantByShop(session.shop, identity);
}

export async function requireMerchantByShop(shop: string) {
  const merchant = await findMerchantByShop(shop);
  if (!merchant || merchant.uninstalledAt) {
    throw new Response("Merchant not found", { status: 404 });
  }

  return merchant;
}

export async function requireMerchantByToken(publicApiToken: string) {
  const merchant = await findMerchantByPublicToken(publicApiToken);
  if (!merchant || merchant.uninstalledAt) {
    throw new Response("Merchant not found", { status: 404 });
  }

  return merchant;
}

export function completeOnboarding(merchant: Merchant) {
  return updateMerchant(merchant.id, { onboardedAt: new Date() });
}

export function updateMerchantSettings(merchant: Merchant, settings: Record<string, unknown>) {
  return updateMerchant(merchant.id, {
    settings: {
      ...jsonObject(merchant.settings),
      ...settings,
    } as Prisma.InputJsonObject,
  });
}

async function fetchShopIdentity(admin: AdminContext) {
  const response = await admin.graphql(`#graphql
    query ShopIdentity {
      shop {
        id
        name
        email
        myshopifyDomain
      }
    }
  `);
  const json = (await response.json()) as {
    data?: { shop?: { id?: string; name?: string; email?: string } };
  };

  return {
    shopifyShopId: json.data?.shop?.id,
    name: json.data?.shop?.name,
    email: json.data?.shop?.email,
  };
}

function jsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}
