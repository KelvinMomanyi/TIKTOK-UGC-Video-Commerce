import type { Merchant, Prisma, Video } from "@prisma/client";
import { env } from "../config/env.server";
import { createManyInsights, listInsights } from "../repositories/ai.repository.server";

type InsightDraft = {
  type: "CAPTION" | "HOOK" | "THUMBNAIL" | "VIRAL_SCORE" | "OPTIMIZATION";
  title: string;
  body: string;
  score?: number;
  payload?: Record<string, unknown>;
};

export function insightsForMerchant(merchant: Merchant) {
  return listInsights(merchant.id);
}

export async function generateVideoInsights(merchant: Merchant, video: Video) {
  const drafts = env.aiProvider === "openai" && env.openAiApiKey
    ? await openAiInsights(video).catch(() => localInsights(video))
    : localInsights(video);

  await createManyInsights(
    drafts.map((draft) => ({
      merchantId: merchant.id,
      videoId: video.id,
      type: draft.type,
      status: "READY",
      title: draft.title,
      body: draft.body,
      score: draft.score,
      payload: (draft.payload ?? {}) as Prisma.InputJsonObject,
      generatedBy: env.aiProvider === "openai" && env.openAiApiKey ? `openai:${env.openAiModel}` : "local-rules-v1",
    })),
  );

  return drafts;
}

function localInsights(video: Video): InsightDraft[] {
  const title = video.title || "this video";
  const hasTags = video.clicks > 0 || video.views > 0;
  const viralScore = Math.min(98, Math.max(35, Math.round((video.views * 0.5 + video.clicks * 4 + video.conversions * 12) / 10 + 42)));

  return [
    {
      type: "HOOK",
      title: "Hook suggestion",
      body: `Open with the product payoff in the first two seconds: "${title}" should show the outcome before the feature explanation.`,
      score: 0.82,
    },
    {
      type: "CAPTION",
      title: "Caption suggestion",
      body: `Make the caption benefit-led and specific. Example: "See why shoppers are adding this to cart after one quick demo."`,
      score: 0.78,
    },
    {
      type: "THUMBNAIL",
      title: "Thumbnail recommendation",
      body: hasTags
        ? "Use a frame where the tagged product is visible and leave clear space for a short text overlay."
        : "Choose a bright product-in-use frame before publishing, then add at least one product hotspot.",
      score: 0.74,
    },
    {
      type: "VIRAL_SCORE",
      title: "Viral score",
      body: `${viralScore}/100 based on current engagement, click intent, and conversion signal.`,
      score: viralScore,
      payload: { viralScore },
    },
  ];
}

async function openAiInsights(video: Video): Promise<InsightDraft[]> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.openAiApiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: env.openAiModel,
      input: [
        {
          role: "system",
          content:
            "You are a video commerce strategist. Return concise JSON with caption, hook, thumbnail, viralScore, and optimization fields.",
        },
        {
          role: "user",
          content: JSON.stringify({
            title: video.title,
            caption: video.caption,
            views: video.views,
            clicks: video.clicks,
            conversions: video.conversions,
          }),
        },
      ],
      text: {
        format: {
          type: "json_object",
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI insight request failed: ${response.status}`);
  }

  const json = (await response.json()) as { output_text?: string };
  const parsed = JSON.parse(json.output_text ?? "{}") as {
    caption?: string;
    hook?: string;
    thumbnail?: string;
    viralScore?: number;
    optimization?: string;
  };

  return [
    { type: "HOOK", title: "Hook suggestion", body: parsed.hook ?? "", score: 0.86 },
    { type: "CAPTION", title: "Caption suggestion", body: parsed.caption ?? "", score: 0.84 },
    { type: "THUMBNAIL", title: "Thumbnail recommendation", body: parsed.thumbnail ?? "", score: 0.8 },
    {
      type: "VIRAL_SCORE",
      title: "Viral score",
      body: `${parsed.viralScore ?? 50}/100 predicted performance score.`,
      score: parsed.viralScore ?? 50,
      payload: { viralScore: parsed.viralScore ?? 50, optimization: parsed.optimization },
    },
  ];
}
