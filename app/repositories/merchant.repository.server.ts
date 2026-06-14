import type { Merchant, Prisma } from "@prisma/client";
import prisma from "../db.server";

export async function upsertMerchantByShop(shop: string, data: Partial<Pick<Merchant, "name" | "email" | "shopifyShopId">> = {}) {
  return prisma.merchant.upsert({
    where: { shop },
    create: {
      shop,
      name: data.name,
      email: data.email,
      shopifyShopId: data.shopifyShopId,
    },
    update: {
      ...data,
      uninstalledAt: null,
    },
  });
}

export async function findMerchantByShop(shop: string) {
  return prisma.merchant.findUnique({ where: { shop } });
}

export async function findMerchantByPublicToken(publicApiToken: string) {
  return prisma.merchant.findUnique({ where: { publicApiToken } });
}

export async function updateMerchant(id: string, data: Prisma.MerchantUpdateInput) {
  return prisma.merchant.update({ where: { id }, data });
}

export async function markMerchantUninstalled(shop: string) {
  return prisma.merchant.updateMany({
    where: { shop },
    data: {
      uninstalledAt: new Date(),
    },
  });
}
