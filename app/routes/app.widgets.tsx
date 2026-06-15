import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, Link, redirect, useLoaderData, useNavigation } from "react-router";
import type { WidgetType } from "@prisma/client";
import { CopyField } from "../components/CopyField";
import { authenticate } from "../shopify.server";
import { PLAN_LIMITS } from "../config/billing";
import { EmptyState } from "../components/ui/EmptyState";
import { KpiCard } from "../components/ui/KpiCard";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import { ensureMerchant } from "../services/merchant.server";
import { readyVideosForPicker } from "../services/video.server";
import {
  archiveMerchantWidget,
  createMerchantWidget,
  getWidgetsPage,
  updateMerchantWidgetStatus,
} from "../services/widget.server";
import { badRequest } from "../utils/http.server";
import { optionalStringValue, stringValue } from "../utils/validation";

const WIDGET_TYPES: Array<{ value: WidgetType; label: string }> = [
  { value: "HOME_FEED", label: "Homepage video feed" },
  { value: "PRODUCT_CAROUSEL", label: "Product page carousel" },
  { value: "FLOATING_STORIES", label: "Floating video stories" },
  { value: "COLLECTION_FEED", label: "Collection page feed" },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const merchant = await ensureMerchant(session, admin);
  const [widgets, readyVideos] = await Promise.all([
    getWidgetsPage(merchant),
    readyVideosForPicker(merchant),
  ]);

  return {
    widgets,
    readyVideoCount: readyVideos.length,
    limits: PLAN_LIMITS[merchant.plan],
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const merchant = await ensureMerchant(session, admin);
  const formData = await request.formData();
  const intent = stringValue(formData, "intent");

  if (intent === "create_widget") {
    const name = stringValue(formData, "name");
    const type = stringValue(formData, "type") as WidgetType;
    if (!name || !WIDGET_TYPES.some((item) => item.value === type)) {
      return badRequest("Enter a widget name and type.");
    }

    const widget = await createMerchantWidget(merchant, {
      name,
      type,
      title: optionalStringValue(formData, "title"),
    });
    return redirect(`/app/widgets/${widget.id}`);
  }

  if (intent === "archive_widget") {
    await archiveMerchantWidget(merchant, stringValue(formData, "widgetId"));
    return redirect("/app/widgets");
  }

  if (intent === "set_widget_status") {
    const status = stringValue(formData, "status") as "DRAFT" | "PUBLISHED" | "PAUSED";
    if (!["DRAFT", "PUBLISHED", "PAUSED"].includes(status)) {
      return badRequest("Invalid widget status.");
    }

    await updateMerchantWidgetStatus(merchant, stringValue(formData, "widgetId"), status);
    return redirect("/app/widgets");
  }

  return badRequest("Unsupported widget action.");
};

export default function WidgetsPage() {
  const { widgets, readyVideoCount, limits } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const published = widgets.filter((widget) => widget.status === "PUBLISHED").length;

  return (
    <s-page>
      <div className="tvc-page">
        <PageHeader
          eyebrow="Storefront widgets"
          title="Publish lightweight shoppable video experiences"
          subtitle="Widgets are rendered by theme app extension blocks and hydrated only when they enter the viewport."
          actions={
            <Link to="/app/videos">
              <s-button>Manage videos</s-button>
            </Link>
          }
        />

        <div className="tvc-grid tvc-grid--3">
          <KpiCard label="Widgets used" value={`${widgets.length}/${limits.widgets}`} meta="Based on your current plan" />
          <KpiCard label="Published" value={published} meta="Live storefront experiences" tone={published ? "success" : undefined} />
          <KpiCard label="Ready videos" value={readyVideoCount} meta="Eligible for widget feeds" />
        </div>

        <section className="tvc-card">
          <div className="tvc-card__body tvc-stack">
            <h2 style={{ margin: 0 }}>Create widget</h2>
            <Form method="post" className="tvc-form-grid">
              <input type="hidden" name="intent" value="create_widget" />
              <label className="tvc-label">
                Name
                <input className="tvc-input" name="name" placeholder="Homepage UGC feed" required />
              </label>
              <label className="tvc-label">
                Public title
                <input className="tvc-input" name="title" placeholder="Shop the videos" />
              </label>
              <label className="tvc-label">
                Type
                <select className="tvc-select" name="type" defaultValue="HOME_FEED">
                  {WIDGET_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </label>
              <div style={{ alignSelf: "end" }}>
                <s-button variant="primary" type="submit" disabled={busy}>Create</s-button>
              </div>
            </Form>
          </div>
        </section>

        <section className="tvc-card">
          <div className="tvc-card__body tvc-stack">
            <div className="tvc-row">
              <h2 style={{ margin: 0 }}>Widgets</h2>
              <span className="tvc-badge">{widgets.length} configured</span>
            </div>
            {widgets.length ? (
              <table className="tvc-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Videos</th>
                    <th>Token</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {widgets.map((widget) => {
                    const readyWidgetVideos = widget.widgetVideos.filter((entry) => entry.video.status === "READY" && !entry.video.deletedAt);

                    return (
                      <tr key={widget.id}>
                          <td>
                            <Link to={`/app/widgets/${widget.id}`}>{widget.name}</Link>
                            {widget.title ? <div className="tvc-muted">{widget.title}</div> : null}
                          </td>
                          <td>{widget.type.replace(/_/g, " ").toLowerCase()}</td>
                          <td><StatusBadge status={widget.status} /></td>
                          <td>
                            <strong>{readyWidgetVideos.length}</strong>
                            <span className="tvc-muted"> / {widget.widgetVideos.length} ready</span>
                            {readyWidgetVideos.length === 0 ? (
                              <div className="tvc-muted">Attach a READY video before using this token.</div>
                            ) : null}
                          </td>
                          <td>
                            <div className="tvc-token-cell">
                              <CopyField label="Token" value={widget.publicToken} />
                              <CopyField label="Theme snippet" value={`<div data-tvc-widget="${widget.publicToken}"></div>`} multiline />
                            </div>
                          </td>
                          <td>
                            <div className="tvc-actions">
                              {widget.status === "PUBLISHED" ? (
                                <Form method="post">
                                  <input type="hidden" name="intent" value="set_widget_status" />
                                  <input type="hidden" name="widgetId" value={widget.id} />
                                  <input type="hidden" name="status" value="PAUSED" />
                                  <s-button type="submit" disabled={busy}>Pause</s-button>
                                </Form>
                              ) : (
                                <Form method="post">
                                  <input type="hidden" name="intent" value="set_widget_status" />
                                  <input type="hidden" name="widgetId" value={widget.id} />
                                  <input type="hidden" name="status" value="PUBLISHED" />
                                  <s-button variant="primary" type="submit" disabled={busy}>Publish</s-button>
                                </Form>
                              )}
                              <Form method="post">
                                <input type="hidden" name="intent" value="archive_widget" />
                                <input type="hidden" name="widgetId" value={widget.id} />
                                <s-button type="submit" disabled={busy}>Archive</s-button>
                              </Form>
                            </div>
                          </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <EmptyState title="No widgets yet">
                Create a widget, attach ready videos, then add the matching app block in the theme editor.
              </EmptyState>
            )}
          </div>
        </section>
      </div>
    </s-page>
  );
}
