import { useEffect, useRef, type VideoHTMLAttributes } from "react";

const HLS_SCRIPT_SRC = "https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.min.js";

type HlsInstance = {
  attachMedia(media: HTMLMediaElement): void;
  destroy(): void;
  loadSource(source: string): void;
};

type HlsConstructor = {
  new (): HlsInstance;
  isSupported(): boolean;
};

declare global {
  interface Window {
    Hls?: HlsConstructor;
  }
}

type HlsVideoProps = Omit<VideoHTMLAttributes<HTMLVideoElement>, "src"> & {
  src: string;
};

let hlsScriptPromise: Promise<void> | null = null;

export function HlsVideo({ src, ...props }: HlsVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    let active = true;
    let hls: HlsInstance | undefined;

    const useNativePlayback = !isHlsUrl(src) || canPlayNativeHls(video);
    if (useNativePlayback) {
      video.src = src;
      return () => {
        video.removeAttribute("src");
        video.load();
      };
    }

    loadHlsScript()
      .then(() => {
        if (!active) return;

        if (window.Hls?.isSupported()) {
          hls = new window.Hls();
          hls.loadSource(src);
          hls.attachMedia(video);
          return;
        }

        video.src = src;
      })
      .catch(() => {
        if (active) video.src = src;
      });

    return () => {
      active = false;
      hls?.destroy();
      video.removeAttribute("src");
      video.load();
    };
  }, [src]);

  return (
    <video ref={videoRef} {...props}>
      <track kind="captions" />
    </video>
  );
}

function isHlsUrl(src: string) {
  return /\.m3u8(?:[?#]|$)/i.test(src);
}

function canPlayNativeHls(video: HTMLVideoElement) {
  return Boolean(
    video.canPlayType("application/vnd.apple.mpegurl") ||
      video.canPlayType("application/x-mpegURL"),
  );
}

function loadHlsScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("HLS playback is only available in the browser."));
  }

  if (window.Hls) return Promise.resolve();
  if (hlsScriptPromise) return hlsScriptPromise;

  hlsScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${HLS_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load HLS player.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = HLS_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load HLS player."));
    document.head.appendChild(script);
  });

  return hlsScriptPromise;
}
