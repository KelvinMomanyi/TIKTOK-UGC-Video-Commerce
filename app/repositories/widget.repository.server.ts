import type { Prisma } from "@prisma/client";
import prisma from "../db.server";

export function listWidgets(merchantId: string) {
  return prisma.widget.findMany({
    where: { merchantId, deletedAt: null },
    include: {
      widgetVideos: {
        include: { video: true },
        orderBy: { sortOrder: "asc" },
      },
      placements: true,
    },
    orderBy: { updatedAt: "desc" },
  });
}

export function countWidgets(merchantId: string) {
  return prisma.widget.count({ where: { merchantId, deletedAt: null } });
}

export function getWidget(merchantId: string, id: string) {
  return prisma.widget.findFirst({
    where: { id, merchantId, deletedAt: null },
    include: {
      widgetVideos: {
        include: {
          video: {
            include: {
              productTags: {
                where: { deletedAt: null },
                orderBy: [{ startTimeSeconds: "asc" }, { sortOrder: "asc" }],
              },
            },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
      placements: true,
    },
  });
}

export function findPublishedWidgetByToken(publicToken: string) {
  return prisma.widget.findUnique({
    where: { publicToken },
    include: {
      merchant: true,
      widgetVideos: {
        include: {
          video: {
            include: {
              productTags: {
                where: { deletedAt: null },
                orderBy: [{ startTimeSeconds: "asc" }, { sortOrder: "asc" }],
              },
            },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

export function createWidget(data: Prisma.WidgetUncheckedCreateInput) {
  return prisma.widget.create({ data });
}

export function updateWidget(merchantId: string, id: string, data: Prisma.WidgetUpdateInput) {
  return prisma.widget.updateMany({
    where: { id, merchantId, deletedAt: null },
    data,
  });
}

export function softDeleteWidget(merchantId: string, id: string) {
  return prisma.widget.updateMany({
    where: { id, merchantId },
    data: { deletedAt: new Date(), status: "PAUSED" },
  });
}

export function attachVideoToWidget(widgetId: string, videoId: string, sortOrder: number) {
  return prisma.widgetVideo.upsert({
    where: { widgetId_videoId: { widgetId, videoId } },
    create: { widgetId, videoId, sortOrder },
    update: { sortOrder },
  });
}

export function detachVideoFromWidget(widgetId: string, videoId: string) {
  return prisma.widgetVideo.deleteMany({
    where: { widgetId, videoId },
  });
}

export function replaceWidgetPlacements(
  merchantId: string,
  widgetId: string,
  placements: Prisma.WidgetPlacementUncheckedCreateInput[],
) {
  return prisma.$transaction([
    prisma.widgetPlacement.deleteMany({ where: { merchantId, widgetId } }),
    ...placements.map((data) => prisma.widgetPlacement.create({ data })),
  ]);
}
