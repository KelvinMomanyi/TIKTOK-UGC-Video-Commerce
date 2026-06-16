import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useFetcher } from "react-router";

type UploadActionResponse = {
  ok?: boolean;
  upload?: {
    uploadUrl: string;
    method: "PUT" | "POST";
    headers?: Record<string, string>;
  };
  video?: { id: string };
  message?: string;
};

export function UploadPanel() {
  const fetcher = useFetcher<UploadActionResponse>();
  const fileRef = useRef<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const busy = fetcher.state !== "idle" || (progress > 0 && progress < 100);
  const selectedFile = fileRef.current;
  const fileLabel = useMemo(() => {
    if (!selectedFile) return "MP4, MOV, or WebM up to your provider limit";
    return `${selectedFile.name} • ${(selectedFile.size / 1024 / 1024).toFixed(1)} MB`;
  }, [selectedFile]);

  useEffect(() => {
    if (!fetcher.data?.upload || !fileRef.current) return;

    const upload = fetcher.data.upload;
    const xhr = new XMLHttpRequest();
    xhr.open(upload.method, upload.uploadUrl);
    for (const [key, value] of Object.entries(upload.headers ?? {})) {
      xhr.setRequestHeader(key, value);
    }
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        setProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setProgress(100);
      } else {
        setError(`Upload failed with ${xhr.status}`);
      }
    };
    xhr.onerror = () => setError("Upload failed. Check the provider credentials and retry.");
    xhr.send(fileRef.current);
  }, [fetcher.data]);

  function submitFile(file: File) {
    setError(null);
    setProgress(0);
    fileRef.current = file;

    const formData = new FormData();
    formData.set("intent", "prepare_upload");
    formData.set("title", file.name.replace(/\.[^.]+$/, ""));
    formData.set("fileName", file.name);
    formData.set("mimeType", file.type || "application/octet-stream");
    formData.set("sizeBytes", String(file.size));
    fetcher.submit(formData, { method: "POST" });
  }

  return (
    <div
      className={`tvc-uploader${dragActive ? " tvc-uploader--active" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragActive(false);
        const file = event.dataTransfer.files[0];
        if (file) submitFile(file);
      }}
    >
      <div className="tvc-row">
        <div>
          <strong>Upload a video</strong>
          <div className="tvc-muted">{fileLabel}</div>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm"
            hidden
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) submitFile(file);
            }}
          />
          <s-button disabled={busy} onClick={() => fileInputRef.current?.click()}>Choose file</s-button>
        </div>
      </div>
      {progress > 0 ? (
        <div className="tvc-stack">
          <progress value={progress} max={100} />
          <span className="tvc-muted">{progress}% uploaded</span>
        </div>
      ) : null}
      {progress === 100 ? (
        <div className="tvc-callout tvc-callout--warning tvc-row">
          <span>
            Upload complete. Finish the video setup so it can be attached to a widget.
          </span>
          {fetcher.data?.video?.id ? (
            <Link to={`/app/videos/${fetcher.data.video.id}`}>
              <s-button>Finish setup</s-button>
            </Link>
          ) : null}
        </div>
      ) : null}
      {error || fetcher.data?.message ? (
        <span className="tvc-badge tvc-badge--critical">{error ?? fetcher.data?.message}</span>
      ) : null}
    </div>
  );
}
