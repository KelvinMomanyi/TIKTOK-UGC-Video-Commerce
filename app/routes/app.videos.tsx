import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, Link, redirect, useLoaderData, useNavigation } from "react-router";
import { authenticate } from "../shopify.server";
import { UploadPanel } from "../components/UploadPanel";
import { VideoCard } from "../components/VideoCard";
import { EmptyState } from "../components/ui/EmptyState";
import { KpiCard } from "../components/ui/KpiCard";
import { PageHeader } from "../components/ui/PageHeader";
import { ensureMerchant } from "../services/merchant.server";
import {
  createDirectUpload,
  createTikTokImport,
  getVideosPage,
  markVideoArchived,
} from "../services/video.server";
import { badRequest, ok } from "../utils/http.server";
import { numberValue, stringValue } from "../utils/validation";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const merchant = await ensureMerchant(session, admin);
  const videosPage = await getVideosPage(merchant);

  return {
    videos: videosPage.videos,
    statusCounts: videosPage.statusCounts,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const merchant = await ensureMerchant(session, admin);
  const formData = await request.formData();
  const intent = stringValue(formData, "intent");

  try {
    if (intent === "import_tiktok") {
      const url = stringValue(formData, "url");
      const video = await createTikTokImport(merchant, url);
      return redirect(`/app/videos/${video.id}`);
    }

    if (intent === "prepare_upload") {
      const title = stringValue(formData, "title");
      const fileName = stringValue(formData, "fileName");
      const mimeType = stringValue(formData, "mimeType");
      const sizeBytes = numberValue(formData, "sizeBytes");

      if (!fileName || !mimeType || !sizeBytes) {
        return badRequest("Missing file metadata.");
      }

      const result = await createDirectUpload(merchant, {
        title,
        fileName,
        mimeType,
        sizeBytes,
      });

      return ok({
        video: {
          id: result.video.id,
          title: result.video.title,
        },
        upload: {
          uploadUrl: result.upload.uploadUrl,
          method: result.upload.method,
          headers: result.upload.headers,
        },
      });
    }

    if (intent === "archive_video") {
      await markVideoArchived(merchant, stringValue(formData, "videoId"));
      return redirect("/app/videos");
    }

    return badRequest("Unsupported video action.");
  } catch (error) {
    if (error instanceof Response) throw error;
    return badRequest(error instanceof Error ? error.message : "Video action failed.");
  }
};

export default function VideosPage() {
  const { videos, statusCounts } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const importing = navigation.state !== "idle";

  return (
    <s-page>
      <div className="tvc-page">
        <PageHeader
          eyebrow="Video library"
          title="Import, upload, and prepare shoppable UGC"
          subtitle="Keep source videos, processing state, product tags, AI suggestions, and storefront eligibility in one place."
          actions={
            <Link to="/app/widgets">
              <s-button>Create widget</s-button>
            </Link>
          }
        />

        <div className="tvc-grid tvc-grid--4">
          <KpiCard label="Ready" value={statusCounts.READY ?? 0} meta="Available for widgets" tone="success" />
          <KpiCard label="Processing" value={(statusCounts.PROCESSING ?? 0) + (statusCounts.UPLOADING ?? 0)} meta="Provider ingest in progress" />
          <KpiCard label="Failed" value={statusCounts.FAILED ?? 0} meta="Needs retry or replacement" tone={statusCounts.FAILED ? "critical" : undefined} />
          <KpiCard label="Total videos" value={videos.length} meta="Active library items" />
        </div>

        <div className="tvc-grid tvc-grid--2">
          <section className="tvc-card">
            <div className="tvc-card__body tvc-stack">
              <h2 style={{ margin: 0 }}>Manual upload</h2>
              <UploadPanel />
            </div>
          </section>

          <section className="tvc-card">
            <div className="tvc-card__body tvc-stack">
              <h2 style={{ margin: 0 }}>TikTok import</h2>
              <Form method="post" className="tvc-stack">
                <input type="hidden" name="intent" value="import_tiktok" />
                <label className="tvc-label">
                  TikTok video URL
                  <input className="tvc-input" name="url" placeholder="https://www.tiktok.com/@creator/video/..." required />
                </label>
                <div className="tvc-row">
                  <p className="tvc-subtitle">
                    The app stores metadata and uses the original TikTok source while preserving the same tagging workflow.
                  </p>
                  <s-button variant="primary" type="submit" disabled={importing}>
                    Import
                  </s-button>
                </div>
              </Form>
            </div>
          </section>
        </div>

        <section className="tvc-card">
          <div className="tvc-card__body tvc-stack">
            <div className="tvc-row">
              <h2 style={{ margin: 0 }}>Library</h2>
              <span className="tvc-badge">{videos.length} videos</span>
            </div>

            {videos.length ? (
              <div className="tvc-media-grid">
                {videos.map((video) => (
                  <VideoCard key={video.id} video={video} />
                ))}
              </div>
            ) : (
              <EmptyState title="Build your first shoppable video">
                Import a TikTok post or upload a source video, then tag products and add it to a storefront widget.
              </EmptyState>
            )}
          </div>
        </section>
      </div>
    </s-page>
  );
}
