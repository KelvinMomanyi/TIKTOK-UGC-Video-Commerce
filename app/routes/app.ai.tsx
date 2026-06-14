import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, Link, redirect, useLoaderData, useNavigation } from "react-router";
import { authenticate } from "../shopify.server";
import { PageHeader } from "../components/ui/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import { generateVideoInsights, insightsForMerchant } from "../services/ai.server";
import { ensureMerchant } from "../services/merchant.server";
import { getVideosPage, getVideoForMerchant } from "../services/video.server";
import { badRequest } from "../utils/http.server";
import { stringValue } from "../utils/validation";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const merchant = await ensureMerchant(session, admin);
  const [insights, videosPage] = await Promise.all([
    insightsForMerchant(merchant),
    getVideosPage(merchant),
  ]);

  return {
    insights: insights.map((insight) => ({
      id: insight.id,
      type: insight.type,
      status: insight.status,
      title: insight.title,
      body: insight.body,
      score: insight.score,
      videoId: insight.video?.id,
      videoTitle: insight.video?.title,
      createdAt: insight.createdAt.toISOString(),
    })),
    videos: videosPage.videos.map((video) => ({
      id: video.id,
      title: video.title,
      status: video.status,
    })),
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const merchant = await ensureMerchant(session, admin);
  const formData = await request.formData();

  if (stringValue(formData, "intent") === "generate_insights") {
    const video = await getVideoForMerchant(merchant, stringValue(formData, "videoId"));
    await generateVideoInsights(merchant, video);
    return redirect("/app/ai");
  }

  return badRequest("Unsupported AI action.");
};

export default function AiPage() {
  const { insights, videos } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";

  return (
    <s-page>
      <div className="tvc-page">
        <PageHeader
          eyebrow="AI optimization"
          title="Generate creative and conversion insights"
          subtitle="Provider-agnostic AI services are isolated from routes so captioning, scoring, thumbnails, and future multimodal analysis can evolve independently."
        />

        <section className="tvc-card">
          <div className="tvc-card__body tvc-stack">
            <h2 style={{ margin: 0 }}>Run analysis</h2>
            <Form method="post" className="tvc-form-grid">
              <input type="hidden" name="intent" value="generate_insights" />
              <label className="tvc-label">
                Video
                <select className="tvc-select" name="videoId">
                  {videos.map((video) => (
                    <option key={video.id} value={video.id}>{video.title}</option>
                  ))}
                </select>
              </label>
              <div style={{ alignSelf: "end" }}>
                <s-button variant="primary" type="submit" disabled={busy || videos.length === 0}>
                  Generate insights
                </s-button>
              </div>
            </Form>
          </div>
        </section>

        <section className="tvc-card">
          <div className="tvc-card__body tvc-stack">
            <div className="tvc-row">
              <h2 style={{ margin: 0 }}>Latest insights</h2>
              <span className="tvc-badge">{insights.length} generated</span>
            </div>
            <div className="tvc-grid tvc-grid--2">
              {insights.map((insight) => (
                <article className="tvc-card" key={insight.id}>
                  <div className="tvc-card__body tvc-stack">
                    <div className="tvc-row">
                      <span className="tvc-badge">{insight.type.replace(/_/g, " ").toLowerCase()}</span>
                      <StatusBadge status={insight.status} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0 }}>{insight.title}</h3>
                      <p className="tvc-subtitle">{insight.body}</p>
                    </div>
                    {insight.videoTitle && insight.videoId ? (
                      <Link to={`/app/videos/${insight.videoId}`}>
                        {insight.videoTitle}
                      </Link>
                    ) : null}
                    {insight.score !== null && insight.score !== undefined ? (
                      <span className="tvc-badge">Score: {Math.round(insight.score)}</span>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </s-page>
  );
}
