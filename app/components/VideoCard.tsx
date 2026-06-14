import { Link } from "react-router";
import { StatusBadge } from "./ui/StatusBadge";

type VideoCardProps = {
  video: {
    id: string;
    title: string;
    status: string;
    thumbnailUrl?: string | null;
    views: number;
    clicks: number;
    productTags?: unknown[];
  };
};

export function VideoCard({ video }: VideoCardProps) {
  return (
    <article className="tvc-video-card">
      <Link to={`/app/videos/${video.id}`} className="tvc-video-thumb" aria-label={`Edit ${video.title}`}>
        {video.thumbnailUrl ? (
          <img src={video.thumbnailUrl} alt="" loading="lazy" />
        ) : (
          <div className="tvc-video-thumb__fallback">Video preview pending</div>
        )}
      </Link>
      <div className="tvc-video-meta">
        <div className="tvc-row">
          <StatusBadge status={video.status} />
          <span className="tvc-muted">{video.productTags?.length ?? 0} tags</span>
        </div>
        <h3 className="tvc-video-title">{video.title}</h3>
        <div className="tvc-row tvc-muted">
          <span>{video.views.toLocaleString()} views</span>
          <span>{video.clicks.toLocaleString()} clicks</span>
        </div>
      </div>
    </article>
  );
}
