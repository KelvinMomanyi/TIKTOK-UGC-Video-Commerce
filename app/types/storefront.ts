export type StorefrontProductTag = {
  id: string;
  productId: string;
  variantId?: string;
  handle?: string;
  title: string;
  imageUrl?: string;
  price?: string;
  currencyCode?: string;
  x: number;
  y: number;
  startTimeSeconds: number;
  endTimeSeconds?: number;
  ctaLabel: string;
  clickUrl?: string;
};

export type StorefrontVideo = {
  id: string;
  title: string;
  caption?: string;
  playbackUrl?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  aspectRatio?: string;
  tags: StorefrontProductTag[];
};

export type StorefrontWidgetPayload = {
  widget: {
    id: string;
    token: string;
    name: string;
    title?: string;
    type: string;
    layout: string;
    settings: Record<string, unknown>;
  };
  videos: StorefrontVideo[];
  diagnostics?: {
    attachedVideos: number;
    readyVideos: number;
  };
};
