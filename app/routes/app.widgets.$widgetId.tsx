import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, Link, redirect, useLoaderData, useNavigation } from "react-router";
import { authenticate } from "../shopify.server";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import { ensureMerchant } from "../services/merchant.server";
import { readyVideosForPicker } from "../services/video.server";
import {
  connectVideoToWidget,
  getWidgetForMerchant,
  removeVideoFromWidget,
  saveWidgetPlacements,
  updateMerchantWidget,
} from "../services/widget.server";
import { badRequest } from "../utils/http.server";
import {
  booleanValue,
  numberValue,
  optionalStringValue,
  stringValue,
} from "../utils/validation.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const merchant = await ensureMerchant(session, admin);
  const [widget, readyVideos] = await Promise.all([
    getWidgetForMerchant(merchant, params.widgetId ?? ""),
    readyVideosForPicker(merchant),
  ]);

  return {
    widget: {
      id: widget.id,
      publicToken: widget.publicToken,
      name: widget.name,
      title: widget.title,
      type: widget.type,
      status: widget.status,
      layout: widget.layout,
      settings: widget.settings as Record<string, unknown>,
      placements: widget.placements,
      videos: widget.widgetVideos.map((entry) => ({
        id: entry.video.id,
        title: entry.video.title,
        status: entry.video.status,
        thumbnailUrl: entry.video.thumbnailUrl,
        sortOrder: entry.sortOrder,
        tags: entry.video.productTags.length,
      })),
    },
    readyVideos: readyVideos.map((video) => ({
      id: video.id,
      title: video.title,
      status: video.status,
    })),
  };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const merchant = await ensureMerchant(session, admin);
  const widgetId = params.widgetId ?? "";
  const formData = await request.formData();
  const intent = stringValue(formData, "intent");

  if (intent === "update_widget") {
    const status = stringValue(formData, "status") as "DRAFT" | "PUBLISHED" | "PAUSED";
    if (!["DRAFT", "PUBLISHED", "PAUSED"].includes(status)) {
      return badRequest("Invalid widget status.");
    }

    await updateMerchantWidget(merchant, widgetId, {
      name: stringValue(formData, "name"),
      title: optionalStringValue(formData, "title"),
      status,
      layout: stringValue(formData, "layout", "grid"),
      settings: {
        autoplay: booleanValue(formData, "autoplay", true),
        muted: booleanValue(formData, "muted", true),
        showCaptions: booleanValue(formData, "showCaptions", true),
        theme: stringValue(formData, "theme", "auto"),
        maxVideos: Math.max(1, Math.min(24, numberValue(formData, "maxVideos", 12))),
        cardRadius: Math.max(0, Math.min(16, numberValue(formData, "cardRadius", 8))),
        position: optionalStringValue(formData, "position"),
      },
    });
    return redirect(`/app/widgets/${widgetId}`);
  }

  if (intent === "attach_video") {
    await connectVideoToWidget(
      merchant,
      widgetId,
      stringValue(formData, "videoId"),
      numberValue(formData, "sortOrder", 0),
    );
    return redirect(`/app/widgets/${widgetId}`);
  }

  if (intent === "detach_video") {
    await removeVideoFromWidget(merchant, widgetId, stringValue(formData, "videoId"));
    return redirect(`/app/widgets/${widgetId}`);
  }

  if (intent === "save_placement") {
    await saveWidgetPlacements(merchant, widgetId, [
      {
        target: stringValue(formData, "target", "ALL") as "HOME" | "PRODUCT" | "COLLECTION" | "CUSTOM" | "ALL",
        resourceHandle: optionalStringValue(formData, "resourceHandle"),
        resourceId: optionalStringValue(formData, "resourceId"),
        enabled: booleanValue(formData, "enabled", true),
        position: stringValue(formData, "position", "main"),
      },
    ]);
    return redirect(`/app/widgets/${widgetId}`);
  }

  return badRequest("Unsupported widget action.");
};

export default function WidgetDetailPage() {
  const { widget, readyVideos } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const settings = widget.settings ?? {};

  return (
    <s-page>
      <div className="tvc-page">
        <PageHeader
          eyebrow="Widget editor"
          title={widget.name}
          subtitle="Configure rendering behavior, attach videos, and publish the public token used by the theme extension."
          actions={
            <>
              <Link to="/app/widgets">
                <s-button>Back</s-button>
              </Link>
              <StatusBadge status={widget.status} />
            </>
          }
        />

        <div className="tvc-grid tvc-grid--2">
          <section className="tvc-card">
            <div className="tvc-card__body tvc-stack">
              <h2 style={{ margin: 0 }}>Settings</h2>
              <Form method="post" className="tvc-stack">
                <input type="hidden" name="intent" value="update_widget" />
                <div className="tvc-form-grid">
                  <label className="tvc-label">
                    Internal name
                    <input className="tvc-input" name="name" defaultValue={widget.name} required />
                  </label>
                  <label className="tvc-label">
                    Storefront title
                    <input className="tvc-input" name="title" defaultValue={widget.title ?? ""} />
                  </label>
                  <label className="tvc-label">
                    Status
                    <select className="tvc-select" name="status" defaultValue={widget.status}>
                      <option value="DRAFT">Draft</option>
                      <option value="PUBLISHED">Published</option>
                      <option value="PAUSED">Paused</option>
                    </select>
                  </label>
                  <label className="tvc-label">
                    Layout
                    <select className="tvc-select" name="layout" defaultValue={widget.layout}>
                      <option value="grid">Grid</option>
                      <option value="carousel">Carousel</option>
                      <option value="stories">Stories</option>
                    </select>
                  </label>
                  <label className="tvc-label">
                    Theme
                    <select className="tvc-select" name="theme" defaultValue={String(settings.theme ?? "auto")}>
                      <option value="auto">Auto</option>
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </select>
                  </label>
                  <label className="tvc-label">
                    Max videos
                    <input className="tvc-input" type="number" min="1" max="24" name="maxVideos" defaultValue={Number(settings.maxVideos ?? 12)} />
                  </label>
                  <label className="tvc-label">
                    Corner radius
                    <input className="tvc-input" type="number" min="0" max="16" name="cardRadius" defaultValue={Number(settings.cardRadius ?? 8)} />
                  </label>
                  <label className="tvc-label">
                    Floating position
                    <select className="tvc-select" name="position" defaultValue={String(settings.position ?? "bottom-right")}>
                      <option value="bottom-right">Bottom right</option>
                      <option value="bottom-left">Bottom left</option>
                    </select>
                  </label>
                </div>
                <label className="tvc-row" style={{ justifyContent: "flex-start" }}>
                  <input type="checkbox" name="autoplay" defaultChecked={Boolean(settings.autoplay ?? true)} />
                  Autoplay muted previews
                </label>
                <label className="tvc-row" style={{ justifyContent: "flex-start" }}>
                  <input type="checkbox" name="muted" defaultChecked={Boolean(settings.muted ?? true)} />
                  Mute videos by default
                </label>
                <label className="tvc-row" style={{ justifyContent: "flex-start" }}>
                  <input type="checkbox" name="showCaptions" defaultChecked={Boolean(settings.showCaptions ?? true)} />
                  Show captions
                </label>
                <s-button variant="primary" type="submit" disabled={busy}>Save settings</s-button>
              </Form>
            </div>
          </section>

          <section className="tvc-card">
            <div className="tvc-card__body tvc-stack">
              <h2 style={{ margin: 0 }}>Theme extension</h2>
              <p className="tvc-subtitle">
                Add the TikTok Video Commerce block in the theme editor and paste this widget token.
              </p>
              <pre className="tvc-code">{widget.publicToken}</pre>
              <pre className="tvc-code">{`<div data-tvc-widget="${widget.publicToken}"></div>`}</pre>
              <p className="tvc-subtitle">
                Storefront API path: <code>{`/apps/tvc/widgets/${widget.publicToken}`}</code>
              </p>
            </div>
          </section>
        </div>

        <div className="tvc-grid tvc-grid--2">
          <section className="tvc-card">
            <div className="tvc-card__body tvc-stack">
              <h2 style={{ margin: 0 }}>Attach video</h2>
              <Form method="post" className="tvc-form-grid">
                <input type="hidden" name="intent" value="attach_video" />
                <label className="tvc-label">
                  Ready video
                  <select className="tvc-select" name="videoId">
                    {readyVideos.map((video) => (
                      <option key={video.id} value={video.id}>{video.title}</option>
                    ))}
                  </select>
                </label>
                <label className="tvc-label">
                  Sort order
                  <input className="tvc-input" type="number" name="sortOrder" defaultValue="0" />
                </label>
                <div style={{ alignSelf: "end" }}>
                  <s-button type="submit" disabled={busy || readyVideos.length === 0}>Attach</s-button>
                </div>
              </Form>
              <table className="tvc-table">
                <thead>
                  <tr>
                    <th>Video</th>
                    <th>Status</th>
                    <th>Tags</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {widget.videos.map((video) => (
                    <tr key={video.id}>
                      <td>{video.title}</td>
                      <td><StatusBadge status={video.status} /></td>
                      <td>{video.tags}</td>
                      <td>
                        <Form method="post">
                          <input type="hidden" name="intent" value="detach_video" />
                          <input type="hidden" name="videoId" value={video.id} />
                          <s-button type="submit" disabled={busy}>Remove</s-button>
                        </Form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="tvc-card">
            <div className="tvc-card__body tvc-stack">
              <h2 style={{ margin: 0 }}>Placement rule</h2>
              <Form method="post" className="tvc-stack">
                <input type="hidden" name="intent" value="save_placement" />
                <div className="tvc-form-grid">
                  <label className="tvc-label">
                    Target
                    <select className="tvc-select" name="target" defaultValue={widget.placements[0]?.target ?? "ALL"}>
                      <option value="ALL">All pages</option>
                      <option value="HOME">Home</option>
                      <option value="PRODUCT">Product</option>
                      <option value="COLLECTION">Collection</option>
                      <option value="CUSTOM">Custom</option>
                    </select>
                  </label>
                  <label className="tvc-label">
                    Resource handle
                    <input className="tvc-input" name="resourceHandle" defaultValue={widget.placements[0]?.resourceHandle ?? ""} />
                  </label>
                  <label className="tvc-label">
                    Position
                    <input className="tvc-input" name="position" defaultValue={widget.placements[0]?.position ?? "main"} />
                  </label>
                  <label className="tvc-row" style={{ justifyContent: "flex-start", alignSelf: "end" }}>
                    <input type="checkbox" name="enabled" defaultChecked={widget.placements[0]?.enabled ?? true} />
                    Enabled
                  </label>
                </div>
                <s-button type="submit" disabled={busy}>Save placement</s-button>
              </Form>
            </div>
          </section>
        </div>
      </div>
    </s-page>
  );
}
