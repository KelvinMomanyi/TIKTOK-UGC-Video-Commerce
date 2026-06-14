import type { Merchant, Prisma } from "@prisma/client";
import { PLAN_LIMITS } from "../config/billing";
import {
  addProductTag,
  countVideos,
  createVideo,
  deleteProductTag,
  getVideo,
  listReadyVideos,
  listVideos,
  softDeleteVideo,
  updateProductTag,
  updateVideo,
  videosByStatus,
} from "../repositories/video.repository.server";
import { clampPercent, isTikTokUrl } from "../utils/validation";
import { videoProviderClient, type DirectUploadRequest } from "./video/providers.server";

export async function getVideosPage(merchant: Merchant) {
  const [videos, statusGroups] = await Promise.all([
    listVideos(merchant.id),
    videosByStatus(merchant.id),
  ]);

  return {
    videos,
    statusCounts: statusGroups.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = item.count;
      return acc;
    }, {}),
  };
}

export async function getVideoForMerchant(merchant: Merchant, id: string) {
  const video = await getVideo(merchant.id, id);
  if (!video) throw new Response("Video not found", { status: 404 });
  return video;
}

export async function createTikTokImport(merchant: Merchant, url: string) {
  if (!isTikTokUrl(url)) {
    throw new Response("Enter a valid TikTok URL.", { status: 400 });
  }

  await assertVideoLimit(merchant);
  const oEmbed = await fetchTikTokOEmbed(url).catch(() => undefined);

  return createVideo({
    merchantId: merchant.id,
    source: "TIKTOK",
    provider: "EXTERNAL",
    status: "READY",
    title: oEmbed?.title?.slice(0, 180) || "Imported TikTok video",
    caption: oEmbed?.author_name ? `By ${oEmbed.author_name}` : undefined,
    originalUrl: url,
    importUrl: url,
    playbackUrl: url,
    thumbnailUrl: oEmbed?.thumbnail_url,
    metadata: {
      provider: "tiktok_oembed",
      authorName: oEmbed?.author_name,
      authorUrl: oEmbed?.author_url,
      html: oEmbed?.html,
    },
    publishedAt: new Date(),
  });
}

export async function createDirectUpload(merchant: Merchant, input: DirectUploadRequest & { title: string }) {
  await assertVideoLimit(merchant);
  const provider = videoProviderClient();
  const upload = await provider.createDirectUpload(input);

  const video = await createVideo({
    merchantId: merchant.id,
    source: "UPLOAD",
    provider: upload.provider,
    status: "UPLOADING",
    title: input.title || input.fileName,
    uploadUrl: upload.uploadUrl,
    providerAssetId: upload.uploadId,
    metadata: {
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      uploadMethod: upload.method,
      uploadHeaders: upload.headers ?? {},
    },
  });

  return { video, upload };
}

export function markVideoArchived(merchant: Merchant, videoId: string) {
  return softDeleteVideo(merchant.id, videoId);
}

export function updateVideoDetails(merchant: Merchant, videoId: string, data: { title: string; caption?: string; thumbnailUrl?: string }) {
  return updateVideo(merchant.id, videoId, data);
}

export function createVideoTag(
  merchant: Merchant,
  input: {
    videoId: string;
    shopifyProductId: string;
    shopifyVariantId?: string;
    productHandle?: string;
    title: string;
    imageUrl?: string;
    priceAmount?: string;
    currencyCode?: string;
    x: number;
    y: number;
    startTimeSeconds: number;
    endTimeSeconds?: number;
    ctaLabel: string;
    clickUrl?: string;
  },
) {
  return addProductTag({
    merchantId: merchant.id,
    videoId: input.videoId,
    shopifyProductId: input.shopifyProductId,
    shopifyVariantId: input.shopifyVariantId,
    productHandle: input.productHandle,
    title: input.title,
    imageUrl: input.imageUrl,
    priceAmount: input.priceAmount ? Number(input.priceAmount) : undefined,
    currencyCode: input.currencyCode,
    x: clampPercent(input.x),
    y: clampPercent(input.y),
    startTimeSeconds: Math.max(0, input.startTimeSeconds),
    endTimeSeconds: input.endTimeSeconds,
    ctaLabel: input.ctaLabel || "Shop now",
    clickUrl: input.clickUrl,
  });
}

export function editVideoTag(
  merchant: Merchant,
  tagId: string,
  data: Pick<Prisma.ProductTagUpdateInput, "x" | "y" | "startTimeSeconds" | "endTimeSeconds" | "ctaLabel" | "clickUrl">,
) {
  return updateProductTag(merchant.id, tagId, data);
}

export function removeVideoTag(merchant: Merchant, tagId: string) {
  return deleteProductTag(merchant.id, tagId);
}

export function readyVideosForPicker(merchant: Merchant) {
  return listReadyVideos(merchant.id);
}

async function assertVideoLimit(merchant: Merchant) {
  const limit = PLAN_LIMITS[merchant.plan].videos;
  const used = await countVideos(merchant.id);

  if (used >= limit) {
    throw new Response(`Your current plan supports ${limit} videos. Upgrade to add more.`, {
      status: 402,
    });
  }
}

async function fetchTikTokOEmbed(url: string) {
  const response = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, {
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`TikTok oEmbed failed: ${response.status}`);
  }

  return (await response.json()) as {
    title?: string;
    author_name?: string;
    author_url?: string;
    thumbnail_url?: string;
    html?: string;
  };
}
