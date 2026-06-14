import type { Prisma } from "@prisma/client";
import prisma from "../db.server";

export function listInsights(merchantId: string) {
  return prisma.aIInsight.findMany({
    where: { merchantId },
    include: { video: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export function createInsight(data: Prisma.AIInsightUncheckedCreateInput) {
  return prisma.aIInsight.create({ data });
}

export function createManyInsights(data: Prisma.AIInsightUncheckedCreateInput[]) {
  if (data.length === 0) return Promise.resolve({ count: 0 });
  return prisma.aIInsight.createMany({ data });
}
