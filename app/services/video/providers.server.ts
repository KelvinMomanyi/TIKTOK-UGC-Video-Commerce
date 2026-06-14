import { Buffer } from "node:buffer";
import { env, requireEnv } from "../../config/env.server";

export type DirectUploadRequest = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export type DirectUpload = {
  provider: "MUX" | "CLOUDFLARE_STREAM";
  uploadId: string;
  uploadUrl: string;
  method: "PUT" | "POST";
  headers?: Record<string, string>;
};

export interface VideoProviderClient {
  createDirectUpload(input: DirectUploadRequest): Promise<DirectUpload>;
  playbackUrl(playbackId: string): string;
  thumbnailUrl(playbackId: string): string;
}

export function videoProviderClient(): VideoProviderClient {
  return env.videoProvider === "cloudflare" ? new CloudflareStreamProvider() : new MuxProvider();
}

class MuxProvider implements VideoProviderClient {
  async createDirectUpload() {
    const tokenId = requireEnv("muxTokenId");
    const tokenSecret = requireEnv("muxTokenSecret");

    const response = await fetch("https://api.mux.com/video/v1/uploads", {
      method: "POST",
      headers: {
        authorization: `Basic ${Buffer.from(`${tokenId}:${tokenSecret}`).toString("base64")}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        cors_origin: "*",
        new_asset_settings: {
          playback_policy: ["public"],
          encoding_tier: "baseline",
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Mux direct upload failed: ${response.status}`);
    }

    const json = (await response.json()) as { data: { id: string; url: string } };
    return {
      provider: "MUX" as const,
      uploadId: json.data.id,
      uploadUrl: json.data.url,
      method: "PUT" as const,
    };
  }

  playbackUrl(playbackId: string) {
    return `https://stream.mux.com/${playbackId}.m3u8`;
  }

  thumbnailUrl(playbackId: string) {
    return `https://image.mux.com/${playbackId}/thumbnail.webp?time=1&width=640`;
  }
}

class CloudflareStreamProvider implements VideoProviderClient {
  async createDirectUpload(input: DirectUploadRequest) {
    const accountId = requireEnv("cloudflareAccountId");
    const token = requireEnv("cloudflareStreamToken");

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          maxDurationSeconds: 900,
          meta: {
            name: input.fileName,
            type: input.mimeType,
            sizeBytes: input.sizeBytes,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Cloudflare Stream direct upload failed: ${response.status}`);
    }

    const json = (await response.json()) as {
      result: { uid: string; uploadURL: string };
    };

    return {
      provider: "CLOUDFLARE_STREAM" as const,
      uploadId: json.result.uid,
      uploadUrl: json.result.uploadURL,
      method: "POST" as const,
    };
  }

  playbackUrl(playbackId: string) {
    return `https://customer-${playbackId}.cloudflarestream.com/${playbackId}/manifest/video.m3u8`;
  }

  thumbnailUrl(playbackId: string) {
    return `https://customer-${playbackId}.cloudflarestream.com/${playbackId}/thumbnails/thumbnail.jpg`;
  }
}
