import type { LoaderFunctionArgs } from "react-router";
import { Form, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { KpiCard } from "../components/ui/KpiCard";
import { PageHeader } from "../components/ui/PageHeader";
import { analyticsDashboard } from "../services/analytics.server";
import { ensureMerchant } from "../services/merchant.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const merchant = await ensureMerchant(session, admin);
  const url = new URL(request.url);
  const range = Number(url.searchParams.get("range") ?? 30);
  const rangeDays = [7, 14, 30, 90].includes(range) ? range : 30;
  const dashboard = await analyticsDashboard(merchant, rangeDays);

  return { dashboard, rangeDays };
};

export default function AnalyticsPage() {
  const { dashboard, rangeDays } = useLoaderData<typeof loader>();
  const maxViews = Math.max(...dashboard.rollups.map((rollup) => rollup.views), 1);

  return (
    <s-page>
      <div className="tvc-page">
        <PageHeader
          eyebrow="Analytics"
          title="Measure video impact from impression to purchase"
          subtitle="Events are stored as raw immutable rows and rolled up by day for fast dashboard queries."
          actions={
            <Form method="get" className="tvc-actions">
              <select className="tvc-select" name="range" defaultValue={rangeDays} style={{ width: 140 }}>
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
              </select>
              <s-button type="submit">Apply</s-button>
            </Form>
          }
        />

        <div className="tvc-grid tvc-grid--4">
          <KpiCard label="Impressions" value={dashboard.totals.impressions.toLocaleString()} meta="Widget loads" />
          <KpiCard label="Views" value={dashboard.totals.views.toLocaleString()} meta={`${formatPercent(dashboard.totals.viewRate)} view rate`} />
          <KpiCard label="Clicks" value={dashboard.totals.clicks.toLocaleString()} meta={`${formatPercent(dashboard.totals.clickThroughRate)} click-through`} />
          <KpiCard label="Revenue" value={formatMoney(dashboard.totals.revenue)} meta={`${formatPercent(dashboard.totals.conversionRate)} click conversion`} tone="success" />
        </div>

        <section className="tvc-card">
          <div className="tvc-card__body tvc-stack">
            <div className="tvc-row">
              <h2 style={{ margin: 0 }}>Daily views</h2>
              <span className="tvc-badge">{rangeDays} day window</span>
            </div>
            <div className="tvc-chart" aria-label="Daily views chart">
              {dashboard.rollups.slice(-14).map((rollup) => (
                <div
                  key={rollup.day}
                  className="tvc-chart__bar"
                  title={`${rollup.day}: ${rollup.views} views`}
                  style={{ height: `${Math.max(4, (rollup.views / maxViews) * 100)}%` }}
                />
              ))}
            </div>
          </div>
        </section>

        <div className="tvc-grid tvc-grid--2">
          <section className="tvc-card">
            <div className="tvc-card__body tvc-stack">
              <h2 style={{ margin: 0 }}>Funnel</h2>
              <table className="tvc-table">
                <tbody>
                  <tr><td>Impressions</td><td>{dashboard.totals.impressions.toLocaleString()}</td></tr>
                  <tr><td>Views</td><td>{dashboard.totals.views.toLocaleString()}</td></tr>
                  <tr><td>Product clicks</td><td>{dashboard.totals.clicks.toLocaleString()}</td></tr>
                  <tr><td>Add to cart</td><td>{dashboard.totals.addToCarts.toLocaleString()}</td></tr>
                  <tr><td>Purchases</td><td>{dashboard.totals.purchases.toLocaleString()}</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="tvc-card">
            <div className="tvc-card__body tvc-stack">
              <h2 style={{ margin: 0 }}>Top video IDs</h2>
              <table className="tvc-table">
                <thead>
                  <tr>
                    <th>Video</th>
                    <th>Views</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.topVideos.map((video) => (
                    <tr key={video.videoId ?? "unknown"}>
                      <td><code>{video.videoId ?? "unknown"}</code></td>
                      <td>{video._count.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
