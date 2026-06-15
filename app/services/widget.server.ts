import type { Merchant, Prisma, WidgetType } from "@prisma/client";
import { PLAN_LIMITS } from "../config/billing";
import {
  attachVideoToWidget,
  countWidgets,
  createWidget,
  detachVideoFromWidget,
  findPublishedWidgetByToken,
  getWidget,
  listWidgets,
  replaceWidgetPlacements,
  softDeleteWidget,
  updateWidget,
} from "../repositories/widget.repository.server";
import { getVideo } from "../repositories/video.repository.server";
import type { StorefrontWidgetPayload } from "../types/storefront";

export async function getWidgetsPage(merchant: Merchant) {
  return listWidgets(merchant.id);
}

export async function createMerchantWidget(merchant: Merchant, input: { name: string; type: WidgetType; title?: string }) {
  await assertWidgetLimit(merchant);

  return createWidget({
    merchantId: merchant.id,
    name: input.name,
    title: input.title,
    type: input.type,
    status: "PUBLISHED",
    settings: defaultWidgetSettings(input.type),
    publishedAt: new Date(),
  });
}

export async function getWidgetForMerchant(merchant: Merchant, id: string) {
  const widget = await getWidget(merchant.id, id);
  if (!widget) throw new Response("Widget not found", { status: 404 });
  return widget;
}

export function updateMerchantWidget(
  merchant: Merchant,
  widgetId: string,
  input: {
    name: string;
    title?: string;
    status: "DRAFT" | "PUBLISHED" | "PAUSED";
    layout: string;
    settings: Record<string, unknown>;
  },
) {
  return updateWidget(merchant.id, widgetId, {
    name: input.name,
    title: input.title,
    status: input.status,
    layout: input.layout,
    settings: input.settings as Prisma.InputJsonObject,
    publishedAt: input.status === "PUBLISHED" ? new Date() : undefined,
  });
}

export function archiveMerchantWidget(merchant: Merchant, widgetId: string) {
  return softDeleteWidget(merchant.id, widgetId);
}

export function updateMerchantWidgetStatus(
  merchant: Merchant,
  widgetId: string,
  status: "DRAFT" | "PUBLISHED" | "PAUSED",
) {
  return updateWidget(merchant.id, widgetId, {
    status,
    publishedAt: status === "PUBLISHED" ? new Date() : undefined,
  });
}

export async function connectVideoToWidget(merchant: Merchant, widgetId: string, videoId: string, sortOrder: number) {
  await getWidgetForMerchant(merchant, widgetId);
  const video = await getVideo(merchant.id, videoId);
  if (!video) throw new Response("Video not found", { status: 404 });
  await attachVideoToWidget(widgetId, videoId, sortOrder);
}

export async function removeVideoFromWidget(merchant: Merchant, widgetId: string, videoId: string) {
  await getWidgetForMerchant(merchant, widgetId);
  return detachVideoFromWidget(widgetId, videoId);
}

export function saveWidgetPlacements(
  merchant: Merchant,
  widgetId: string,
  placements: Array<{
    target: "HOME" | "PRODUCT" | "COLLECTION" | "CUSTOM" | "ALL";
    resourceHandle?: string;
    resourceId?: string;
    enabled: boolean;
    position: string;
  }>,
) {
  return replaceWidgetPlacements(
    merchant.id,
    widgetId,
    placements.map((placement) => ({
      merchantId: merchant.id,
      widgetId,
      target: placement.target,
      resourceHandle: placement.resourceHandle,
      resourceId: placement.resourceId,
      enabled: placement.enabled,
      position: placement.position,
    })),
  );
}

export async function publicWidgetPayload(publicToken: string): Promise<StorefrontWidgetPayload> {
  const widget = await findPublishedWidgetByToken(publicToken);

  if (!widget || widget.status !== "PUBLISHED" || widget.deletedAt || widget.merchant.uninstalledAt) {
    throw new Response("Widget not found", { status: 404 });
  }

  const readyVideos = widget.widgetVideos.filter(({ video }) => (
    !video.deletedAt && video.status === "READY"
  ));

  return {
    widget: {
      id: widget.id,
      token: widget.publicToken,
      name: widget.name,
      title: widget.title ?? undefined,
      type: widget.type,
      layout: widget.layout,
      settings: jsonObject(widget.settings),
    },
    videos: readyVideos.map(({ video }) => ({
      id: video.id,
      title: video.title,
      caption: video.caption ?? undefined,
      playbackUrl: video.playbackUrl ?? undefined,
      thumbnailUrl: video.thumbnailUrl ?? undefined,
      durationSeconds: video.durationSeconds ?? undefined,
      aspectRatio: video.aspectRatio ?? undefined,
      tags: video.productTags.map((tag) => ({
        id: tag.id,
        productId: tag.shopifyProductId,
        variantId: tag.shopifyVariantId ?? undefined,
        handle: tag.productHandle ?? undefined,
        title: tag.title,
        imageUrl: tag.imageUrl ?? undefined,
        price: tag.priceAmount?.toString(),
        currencyCode: tag.currencyCode ?? undefined,
        x: tag.x,
        y: tag.y,
        startTimeSeconds: tag.startTimeSeconds,
        endTimeSeconds: tag.endTimeSeconds ?? undefined,
        ctaLabel: tag.ctaLabel,
        clickUrl: tag.clickUrl ?? undefined,
      })),
    })),
    diagnostics: {
      attachedVideos: widget.widgetVideos.length,
      readyVideos: readyVideos.length,
    },
  };
}

function defaultWidgetSettings(type: WidgetType) {
  const base = {
    autoplay: true,
    muted: true,
    showCaptions: true,
    theme: "auto",
    cardRadius: 8,
  };

  if (type === "FLOATING_STORIES") {
    return { ...base, position: "bottom-right", maxVideos: 6 };
  }

  if (type === "PRODUCT_CAROUSEL") {
    return { ...base, maxVideos: 8, contextAware: true };
  }

  return { ...base, maxVideos: 12 };
}

async function assertWidgetLimit(merchant: Merchant) {
  const limit = PLAN_LIMITS[merchant.plan].widgets;
  const used = await countWidgets(merchant.id);
  if (used >= limit) {
    throw new Response(`Your current plan supports ${limit} widgets. Upgrade to add more.`, {
      status: 402,
    });
  }
}

function jsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}
