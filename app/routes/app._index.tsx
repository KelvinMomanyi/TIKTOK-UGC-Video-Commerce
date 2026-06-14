import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Form, Link, redirect, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { PLAN_LIMITS } from "../config/billing";
import { EmptyState } from "../components/ui/EmptyState";
import { KpiCard } from "../components/ui/KpiCard";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import { VideoCard } from "../components/VideoCard";
import { analyticsDashboard } from "../services/analytics.server";
import { completeOnboarding, ensureMerchant } from "../services/merchant.server";
import { getVideosPage } from "../services/video.server";
import { getWidgetsPage } from "../services/widget.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const merchant = await ensureMerchant(session, admin);
  const [videosPage, widgets, analytics] = await Promise.all([
    getVideosPage(merchant),
    getWidgetsPage(merchant),
    analyticsDashboard(merchant, 14),
  ]);

  return {
    merchant: {
      shop: merchant.shop,
      plan: merchant.plan,
      onboarded: Boolean(merchant.onboardedAt),
    },
    limits: PLAN_LIMITS[merchant.plan],
    videos: videosPage.videos.slice(0, 6),
    statusCounts: videosPage.statusCounts,
    widgets: widgets.slice(0, 4),
    analytics,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const merchant = await ensureMerchant(session, admin);
  const formData = await request.formData();

  if (formData.get("intent") === "complete_onboarding") {
    await completeOnboarding(merchant);
  }

  return redirect("/app");
};

export default function Dashboard() {
  const { merchant, limits, videos, widgets, analytics } = useLoaderData<typeof loader>();
  const publishedWidgets = widgets.filter((widget) => widget.status === "PUBLISHED").length;

  return (
    <s-page>
      <div className="tvc-page">
        <PageHeader
          eyebrow={`${merchant.shop} • ${merchant.plan.toLowerCase()} plan`}
          title="Video commerce command center"
          subtitle="Manage UGC videos, publish shoppable storefront widgets, and track the conversion path from view to order."
          actions={
            <>
              <Link to="/app/videos">
                <s-button>Import video</s-button>
              </Link>
              <Link to="/app/widgets">
                <s-button variant="primary">Create widget</s-button>
              </Link>
            </>
          }
        />

        {!merchant.onboarded ? (
          <div className="tvc-card">
            <div className="tvc-card__body tvc-row">
              <div>
                <strong>Production setup checklist</strong>
                <p className="tvc-subtitle">
                  Connect a video provider, import your first TikTok or upload, tag products, then publish a theme app block.
                </p>
              </div>
              <Form method="post">
                <input type="hidden" name="intent" value="complete_onboarding" />
                <s-button variant="primary" type="submit">
                  Mark complete
                </s-button>
              </Form>
            </div>
          </div>
        ) : null}

        <div className="tvc-grid tvc-grid--4">
          <KpiCard label="Views" value={analytics.totals.views.toLocaleString()} meta={`${formatPercent(analytics.totals.viewRate)} view rate`} />
          <KpiCard label="Clicks" value={analytics.totals.clicks.toLocaleString()} meta={`${formatPercent(analytics.totals.clickThroughRate)} CTR`} />
          <KpiCard label="Revenue" value={formatMoney(analytics.totals.revenue)} meta="Attributed to video events" tone="success" />
          <KpiCard label="Widgets live" value={`${publishedWidgets}/${limits.widgets}`} meta={`${limits.monthlyViews.toLocaleString()} monthly views included`} />
        </div>

        <div className="tvc-grid tvc-grid--2">
          <section className="tvc-card">
            <div className="tvc-card__body tvc-stack">
              <div className="tvc-row">
                <div>
                  <h2 style={{ margin: 0 }}>Recent videos</h2>
                  <p className="tvc-subtitle">Upload status, product tagging, and performance at a glance.</p>
                </div>
                <Link to="/app/videos">
                  <s-button>View all</s-button>
                </Link>
              </div>
              {videos.length ? (
                <div className="tvc-media-grid">
                  {videos.map((video) => (
                    <VideoCard key={video.id} video={video} />
                  ))}
                </div>
              ) : (
                <EmptyState title="No videos yet">
                  Import a TikTok URL or upload a video to start building a shoppable feed.
                </EmptyState>
              )}
            </div>
          </section>

          <section className="tvc-card">
            <div className="tvc-card__body tvc-stack">
              <div className="tvc-row">
                <div>
                  <h2 style={{ margin: 0 }}>Widget health</h2>
                  <p className="tvc-subtitle">Published widgets are exposed through lightweight storefront blocks.</p>
                </div>
                <Link to="/app/widgets">
                  <s-button>Manage</s-button>
                </Link>
              </div>
              {widgets.length ? (
                <table className="tvc-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Status</th>
                      <th>Videos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {widgets.map((widget) => (
                      <tr key={widget.id}>
                        <td>
                          <Link to={`/app/widgets/${widget.id}`}>{widget.name}</Link>
                          <div className="tvc-muted">{widget.type.replace(/_/g, " ").toLowerCase()}</div>
                        </td>
                        <td><StatusBadge status={widget.status} /></td>
                        <td>{widget.widgetVideos.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <EmptyState title="No widgets configured">
                  Create a homepage feed, product carousel, floating stories widget, or collection feed.
                </EmptyState>
              )}
            </div>
          </section>
        </div>
      </div>
    </s-page>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 }).format(value);
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
