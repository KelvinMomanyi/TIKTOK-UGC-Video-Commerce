import { useMemo, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, Link, redirect, useLoaderData, useNavigation } from "react-router";
import { authenticate } from "../shopify.server";
import { ProductSearch } from "../components/ProductSearch";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import { ensureMerchant } from "../services/merchant.server";
import {
  createVideoTag,
  editVideoTag,
  getVideoForMerchant,
  markVideoArchived,
  removeVideoTag,
  updateVideoDetails,
} from "../services/video.server";
import type { ShopifyProductSearchResult } from "../services/shopify/products.server";
import { badRequest } from "../utils/http.server";
import {
  clampPercent,
  numberValue,
  optionalStringValue,
  stringValue,
} from "../utils/validation.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const merchant = await ensureMerchant(session, admin);
  const video = await getVideoForMerchant(merchant, params.videoId ?? "");

  return {
    video: {
      id: video.id,
      title: video.title,
      caption: video.caption,
      status: video.status,
      source: video.source,
      playbackUrl: video.playbackUrl,
      thumbnailUrl: video.thumbnailUrl,
      views: video.views,
      clicks: video.clicks,
      conversions: video.conversions,
      productTags: video.productTags.map((tag) => ({
        id: tag.id,
        title: tag.title,
        shopifyProductId: tag.shopifyProductId,
        shopifyVariantId: tag.shopifyVariantId,
        productHandle: tag.productHandle,
        imageUrl: tag.imageUrl,
        priceAmount: tag.priceAmount?.toString(),
        currencyCode: tag.currencyCode,
        x: tag.x,
        y: tag.y,
        startTimeSeconds: tag.startTimeSeconds,
        endTimeSeconds: tag.endTimeSeconds,
        ctaLabel: tag.ctaLabel,
        clickUrl: tag.clickUrl,
      })),
      widgets: video.widgetVideos.map((entry) => ({
        id: entry.widget.id,
        name: entry.widget.name,
        status: entry.widget.status,
      })),
      insights: video.aiInsights.map((insight) => ({
        id: insight.id,
        type: insight.type,
        title: insight.title,
        body: insight.body,
        score: insight.score,
      })),
    },
  };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const merchant = await ensureMerchant(session, admin);
  const videoId = params.videoId ?? "";
  const formData = await request.formData();
  const intent = stringValue(formData, "intent");

  if (intent === "update_video") {
    await updateVideoDetails(merchant, videoId, {
      title: stringValue(formData, "title"),
      caption: optionalStringValue(formData, "caption"),
      thumbnailUrl: optionalStringValue(formData, "thumbnailUrl"),
    });
    return redirect(`/app/videos/${videoId}`);
  }

  if (intent === "add_tag") {
    const productId = stringValue(formData, "shopifyProductId");
    const title = stringValue(formData, "title");
    if (!productId || !title) return badRequest("Select a product before saving the hotspot.");

    await createVideoTag(merchant, {
      videoId,
      shopifyProductId: productId,
      shopifyVariantId: optionalStringValue(formData, "shopifyVariantId"),
      productHandle: optionalStringValue(formData, "productHandle"),
      title,
      imageUrl: optionalStringValue(formData, "imageUrl"),
      priceAmount: optionalStringValue(formData, "priceAmount"),
      currencyCode: optionalStringValue(formData, "currencyCode"),
      x: numberValue(formData, "x", 50),
      y: numberValue(formData, "y", 50),
      startTimeSeconds: numberValue(formData, "startTimeSeconds"),
      endTimeSeconds: optionalNumber(formData, "endTimeSeconds"),
      ctaLabel: stringValue(formData, "ctaLabel", "Shop now"),
      clickUrl: optionalStringValue(formData, "clickUrl"),
    });
    return redirect(`/app/videos/${videoId}`);
  }

  if (intent === "update_tag") {
    await editVideoTag(merchant, stringValue(formData, "tagId"), {
      x: clampPercent(numberValue(formData, "x")),
      y: clampPercent(numberValue(formData, "y")),
      startTimeSeconds: Math.max(0, numberValue(formData, "startTimeSeconds")),
      endTimeSeconds: optionalNumber(formData, "endTimeSeconds"),
      ctaLabel: stringValue(formData, "ctaLabel", "Shop now"),
      clickUrl: optionalStringValue(formData, "clickUrl"),
    });
    return redirect(`/app/videos/${videoId}`);
  }

  if (intent === "delete_tag") {
    await removeVideoTag(merchant, stringValue(formData, "tagId"));
    return redirect(`/app/videos/${videoId}`);
  }

  if (intent === "archive_video") {
    await markVideoArchived(merchant, videoId);
    return redirect("/app/videos");
  }

  return badRequest("Unsupported video action.");
};

export default function VideoDetailPage() {
  const { video } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const [hotspot, setHotspot] = useState({ x: 50, y: 50 });
  const [selectedProduct, setSelectedProduct] = useState<ShopifyProductSearchResult | null>(null);
  const selectedVariant = selectedProduct?.variants[0];
  const busy = navigation.state !== "idle";

  const preview = useMemo(() => {
    if (video.thumbnailUrl) return <img src={video.thumbnailUrl} alt="" />;
    if (video.playbackUrl?.endsWith(".m3u8")) return <div className="tvc-video-thumb__fallback">Streaming preview ready</div>;
    return <div className="tvc-video-thumb__fallback">Preview unavailable</div>;
  }, [video.thumbnailUrl, video.playbackUrl]);

  return (
    <s-page>
      <div className="tvc-page">
        <PageHeader
          eyebrow="Product tagging"
          title={video.title}
          subtitle="Place timed hotspots on the video and attach Shopify product destinations."
          actions={
            <>
              <Link to="/app/videos">
                <s-button>Back</s-button>
              </Link>
              <Form method="post">
                <input type="hidden" name="intent" value="archive_video" />
                <s-button tone="critical" type="submit" disabled={busy}>
                  Archive
                </s-button>
              </Form>
            </>
          }
        />

        <div className="tvc-grid tvc-grid--3">
          <div className="tvc-card"><div className="tvc-card__body"><div className="tvc-row"><span>Status</span><StatusBadge status={video.status} /></div></div></div>
          <div className="tvc-card"><div className="tvc-card__body"><strong>{video.views.toLocaleString()}</strong><div className="tvc-muted">Views</div></div></div>
          <div className="tvc-card"><div className="tvc-card__body"><strong>{video.productTags.length}</strong><div className="tvc-muted">Product hotspots</div></div></div>
        </div>

        <div className="tvc-preview-shell">
          <div className="tvc-card">
            <div className="tvc-card__body tvc-stack">
              <div
                className="tvc-hotspot-stage"
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  setHotspot({
                    x: clampPercent(((event.clientX - rect.left) / rect.width) * 100),
                    y: clampPercent(((event.clientY - rect.top) / rect.height) * 100),
                  });
                }}
              >
                {preview}
                {video.productTags.map((tag) => (
                  <span key={tag.id} className="tvc-hotspot" style={{ left: `${tag.x}%`, top: `${tag.y}%` }} title={tag.title} />
                ))}
                <span className="tvc-hotspot" style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }} />
              </div>
              <p className="tvc-subtitle">Click the preview to set the next hotspot position.</p>
            </div>
          </div>

          <div className="tvc-stack">
            <section className="tvc-card">
              <div className="tvc-card__body tvc-stack">
                <h2 style={{ margin: 0 }}>Video details</h2>
                <Form method="post" className="tvc-stack">
                  <input type="hidden" name="intent" value="update_video" />
                  <label className="tvc-label">
                    Title
                    <input className="tvc-input" name="title" defaultValue={video.title} required />
                  </label>
                  <label className="tvc-label">
                    Caption
                    <textarea className="tvc-textarea" name="caption" defaultValue={video.caption ?? ""} />
                  </label>
                  <label className="tvc-label">
                    Thumbnail URL
                    <input className="tvc-input" name="thumbnailUrl" defaultValue={video.thumbnailUrl ?? ""} />
                  </label>
                  <s-button type="submit" disabled={busy}>Save details</s-button>
                </Form>
              </div>
            </section>

            <section className="tvc-card">
              <div className="tvc-card__body tvc-stack">
                <h2 style={{ margin: 0 }}>Add product hotspot</h2>
                <ProductSearch onSelect={(product) => setSelectedProduct(product)} />
                <Form method="post" className="tvc-stack">
                  <input type="hidden" name="intent" value="add_tag" />
                  <input type="hidden" name="shopifyProductId" value={selectedProduct?.id ?? ""} />
                  <input type="hidden" name="shopifyVariantId" value={selectedVariant?.id ?? ""} />
                  <input type="hidden" name="productHandle" value={selectedProduct?.handle ?? ""} />
                  <input type="hidden" name="title" value={selectedProduct?.title ?? ""} />
                  <input type="hidden" name="imageUrl" value={selectedProduct?.imageUrl ?? ""} />
                  <input type="hidden" name="priceAmount" value={selectedVariant?.price ?? ""} />
                  <input type="hidden" name="x" value={hotspot.x} />
                  <input type="hidden" name="y" value={hotspot.y} />
                  <input type="hidden" name="clickUrl" value={selectedProduct?.handle ? `/products/${selectedProduct.handle}` : ""} />
                  <div className="tvc-form-grid">
                    <label className="tvc-label">
                      Starts at
                      <input className="tvc-input" name="startTimeSeconds" type="number" min="0" step="0.1" defaultValue="0" />
                    </label>
                    <label className="tvc-label">
                      Ends at
                      <input className="tvc-input" name="endTimeSeconds" type="number" min="0" step="0.1" />
                    </label>
                  </div>
                  <label className="tvc-label">
                    CTA label
                    <input className="tvc-input" name="ctaLabel" defaultValue="Shop now" />
                  </label>
                  {selectedProduct ? <span className="tvc-badge">Selected: {selectedProduct.title}</span> : null}
                  <s-button variant="primary" type="submit" disabled={!selectedProduct || busy}>
                    Save hotspot
                  </s-button>
                </Form>
              </div>
            </section>
          </div>
        </div>

        <section className="tvc-card">
          <div className="tvc-card__body tvc-stack">
            <h2 style={{ margin: 0 }}>Hotspots</h2>
            <table className="tvc-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Timing</th>
                  <th>Position</th>
                  <th>CTA</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {video.productTags.map((tag) => (
                  <tr key={tag.id}>
                    <td>
                      <strong>{tag.title}</strong>
                      <div className="tvc-muted">{tag.productHandle}</div>
                    </td>
                    <td>{tag.startTimeSeconds}s{tag.endTimeSeconds ? ` - ${tag.endTimeSeconds}s` : ""}</td>
                    <td>{Math.round(tag.x)}%, {Math.round(tag.y)}%</td>
                    <td>{tag.ctaLabel}</td>
                    <td>
                      <Form method="post">
                        <input type="hidden" name="intent" value="delete_tag" />
                        <input type="hidden" name="tagId" value={tag.id} />
                        <s-button type="submit" disabled={busy}>Remove</s-button>
                      </Form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </s-page>
  );
}

function optionalNumber(formData: FormData, key: string) {
  const value = stringValue(formData, key);
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
