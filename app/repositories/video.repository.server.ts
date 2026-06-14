import type { Prisma } from "@prisma/client";
import prisma from "../db.server";

export function listVideos(merchantId: string) {
  return prisma.video.findMany({
    where: { merchantId, deletedAt: null },
    include: {
      productTags: {
        where: { deletedAt: null },
        orderBy: [{ startTimeSeconds: "asc" }, { sortOrder: "asc" }],
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export function countVideos(merchantId: string) {
  return prisma.video.count({ where: { merchantId, deletedAt: null } });
}

export function getVideo(merchantId: string, id: string) {
  return prisma.video.findFirst({
    where: { id, merchantId, deletedAt: null },
    include: {
      productTags: {
        where: { deletedAt: null },
        orderBy: [{ startTimeSeconds: "asc" }, { sortOrder: "asc" }],
      },
      widgetVideos: {
        include: { widget: true },
        orderBy: { sortOrder: "asc" },
      },
      aiInsights: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
}

export function createVideo(data: Prisma.VideoUncheckedCreateInput) {
  return prisma.video.create({ data });
}

export function updateVideo(merchantId: string, id: string, data: Prisma.VideoUpdateInput) {
  return prisma.video.updateMany({
    where: { id, merchantId },
    data,
  });
}

export function softDeleteVideo(merchantId: string, id: string) {
  return prisma.video.updateMany({
    where: { id, merchantId },
    data: { deletedAt: new Date(), status: "ARCHIVED" },
  });
}

export function listReadyVideos(merchantId: string) {
  return prisma.video.findMany({
    where: {
      merchantId,
      deletedAt: null,
      status: "READY",
    },
    orderBy: { createdAt: "desc" },
  });
}

export function addProductTag(data: Prisma.ProductTagUncheckedCreateInput) {
  return prisma.productTag.create({ data });
}

export function updateProductTag(merchantId: string, id: string, data: Prisma.ProductTagUpdateInput) {
  return prisma.productTag.updateMany({
    where: { id, merchantId, deletedAt: null },
    data,
  });
}

export function deleteProductTag(merchantId: string, id: string) {
  return prisma.productTag.updateMany({
    where: { id, merchantId },
    data: { deletedAt: new Date() },
  });
}

export function updateVideoCounters(videoId: string, counters: Partial<Record<"impressions" | "views" | "clicks" | "conversions", number>>) {
  const data: Prisma.VideoUpdateInput = {
    ...(counters.impressions ? { impressions: { increment: counters.impressions } } : {}),
    ...(counters.views ? { views: { increment: counters.views } } : {}),
    ...(counters.clicks ? { clicks: { increment: counters.clicks } } : {}),
    ...(counters.conversions ? { conversions: { increment: counters.conversions } } : {}),
  };

  if (Object.keys(data).length === 0) return Promise.resolve(null);
  return prisma.video.update({ where: { id: videoId }, data });
}

export async function videosByStatus(merchantId: string) {
  const rows = await prisma.video.groupBy({
    by: ["status"],
    where: { merchantId, deletedAt: null },
    _count: { _all: true },
  });

  return rows.map((row) => ({ status: row.status, count: row._count._all }));
}
