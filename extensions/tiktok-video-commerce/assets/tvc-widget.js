(() => {
  const loaded = new WeakSet();
  const HLS_SCRIPT_SRC = "https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.min.js";
  let hlsLoader;

  const visitorId = () => {
    const key = "tvc_visitor_id";
    let value = localStorage.getItem(key);
    if (!value) {
      value = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
      localStorage.setItem(key, value);
    }
    return value;
  };

  const sessionId = () => {
    const key = "tvc_session_id";
    let value = sessionStorage.getItem(key);
    if (!value) {
      value = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
      sessionStorage.setItem(key, value);
    }
    return value;
  };

  const postEvent = (root, payload) => {
    const analytics = root.dataset.tvcAnalytics || "/apps/tvc/analytics";
    const body = JSON.stringify({
      widgetToken: root.dataset.tvcWidget,
      visitorId: visitorId(),
      sessionId: sessionId(),
      path: location.pathname,
      referrer: document.referrer || undefined,
      ...payload,
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon(analytics, new Blob([body], { type: "application/json" }));
      return;
    }

    fetch(analytics, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  };

  const loadWidget = async (root) => {
    if (loaded.has(root)) return;
    loaded.add(root);

    const token = root.dataset.tvcWidget;
    if (!token) return;

    const endpoint = `${root.dataset.tvcEndpoint || "/apps/tvc/widgets"}/${encodeURIComponent(token)}`;
    const response = await fetch(endpoint, {
      headers: { accept: "application/json" },
      credentials: "same-origin",
    });

    if (!response.ok) {
      renderSetupState(root, "Widget token is not published or the app proxy is not connected.");
      return;
    }

    const payload = await response.json();
    if (render(root, payload)) {
      postEvent(root, { type: "IMPRESSION" });
    }
  };

  const render = (root, payload) => {
    const title = root.dataset.tvcTitle || payload.widget.title || payload.widget.name;
    const layout = root.dataset.tvcLayout || payload.widget.layout || "grid";
    const videos = payload.videos || [];
    const maxVideos = Number(payload.widget.settings?.maxVideos || 12);
    const listClass = layout === "carousel" || layout === "stories" ? "tvc-widget-carousel" : "tvc-widget-grid";

    root.innerHTML = `
      ${title ? `<h2 class="tvc-widget-heading">${escapeHtml(title)}</h2>` : ""}
      <div class="${listClass}"></div>
    `;

    if (videos.length === 0) {
      const attachedVideos = Number(payload.diagnostics?.attachedVideos || 0);
      const message = attachedVideos > 0
        ? "Attached videos are not ready yet. Use READY videos in this widget."
        : "No videos are attached to this widget yet.";
      renderSetupState(root, message, title);
      return false;
    }

    const list = root.querySelector(`.${listClass}`);
    videos.slice(0, maxVideos).forEach((video) => {
      list.appendChild(videoCard(root, video, payload.widget.settings || {}));
    });
    root.querySelectorAll(".tvc-widget-product-link").forEach((link) => {
      link.addEventListener("click", () => {
        postEvent(root, {
          type: "CLICK",
          videoId: link.dataset.tvcVideo,
          productTagId: link.dataset.tvcTag,
          productId: link.dataset.tvcProduct,
          variantId: link.dataset.tvcVariant,
        });
      });
    });
    return true;
  };

  const renderSetupState = (root, message, title = root.dataset.tvcTitle) => {
    if (!window.Shopify?.designMode) {
      root.innerHTML = "";
      return;
    }

    root.innerHTML = `
      ${title ? `<h2 class="tvc-widget-heading">${escapeHtml(title)}</h2>` : ""}
      <div class="tvc-widget-empty">${escapeHtml(message)}</div>
    `;
  };

  const videoCard = (root, video, settings) => {
    const card = document.createElement("article");
    card.className = "tvc-widget-card";

    const media = document.createElement("div");
    media.className = "tvc-widget-media";

    const isTikTok = video.source === "TIKTOK" || /^https:\/\/(www\.)?tiktok\.com/.test(video.playbackUrl || "");
    const canUseVideo = video.playbackUrl && !isTikTok;

    if (isTikTok && video.embedHtml) {
      const wrapper = document.createElement("div");
      wrapper.className = "tvc-widget-tiktok-embed";
      wrapper.innerHTML = video.embedHtml;
      const existingScript = wrapper.querySelector("script");
      if (existingScript) existingScript.remove();
      media.appendChild(wrapper);
      requestAnimationFrame(() => {
        if (!document.querySelector("script[src*=\"tiktok.com/embed.js\"]")) {
          const script = document.createElement("script");
          script.src = "https://www.tiktok.com/embed.js";
          script.async = true;
          document.body.appendChild(script);
        } else if (window.tiktokEmbed && typeof window.tiktokEmbed.lib === "object") {
          try {
            window.tiktokEmbed.lib.render();
          } catch (_) {
            // The TikTok script can be present before its renderer is ready.
          }
        }
      });
    } else if (isTikTok && video.playbackUrl) {
      const wrapper = document.createElement("div");
      wrapper.className = "tvc-widget-tiktok-embed";
      const videoIdMatch = video.playbackUrl.match(/\/video\/(\d+)/);
      if (videoIdMatch) {
        const blockquote = document.createElement("blockquote");
        blockquote.className = "tiktok-embed";
        blockquote.setAttribute("cite", video.playbackUrl);
        blockquote.setAttribute("data-video-id", videoIdMatch[1]);
        blockquote.style.maxWidth = "100%";
        const section = document.createElement("section");
        blockquote.appendChild(section);
        wrapper.appendChild(blockquote);
        media.appendChild(wrapper);
        requestAnimationFrame(() => {
          if (!document.querySelector("script[src*=\"tiktok.com/embed.js\"]")) {
            const script = document.createElement("script");
            script.src = "https://www.tiktok.com/embed.js";
            script.async = true;
            document.body.appendChild(script);
          } else if (window.tiktokEmbed && typeof window.tiktokEmbed.lib === "object") {
            try {
              window.tiktokEmbed.lib.render();
            } catch (_) {
              // The TikTok script can be present before its renderer is ready.
            }
          }
        });
      } else if (video.thumbnailUrl) {
        const image = document.createElement("img");
        image.src = video.thumbnailUrl;
        image.alt = "";
        image.loading = "lazy";
        media.appendChild(image);
      }
    } else if (canUseVideo) {
      const element = document.createElement("video");
      element.poster = video.thumbnailUrl || "";
      element.preload = "metadata";
      element.playsInline = true;
      element.muted = settings.muted !== false;
      element.controls = true;
      element.addEventListener("play", () => postEvent(root, { type: "VIEW", videoId: video.id }), { once: true });
      attachVideoSource(element, video.playbackUrl);
      media.appendChild(element);
    } else if (video.thumbnailUrl) {
      const image = document.createElement("img");
      image.src = video.thumbnailUrl;
      image.alt = "";
      image.loading = "lazy";
      media.appendChild(image);
    }

    (video.tags || []).forEach((tag) => {
      const hotspot = document.createElement("a");
      hotspot.className = "tvc-widget-hotspot";
      hotspot.href = tag.clickUrl || (tag.handle ? `/products/${tag.handle}` : "#");
      hotspot.style.left = `${tag.x}%`;
      hotspot.style.top = `${tag.y}%`;
      hotspot.setAttribute("aria-label", tag.title);
      hotspot.addEventListener("click", () => {
        postEvent(root, {
          type: "CLICK",
          videoId: video.id,
          productTagId: tag.id,
          productId: tag.productId,
          variantId: tag.variantId,
        });
      });
      media.appendChild(hotspot);
    });

    const caption = document.createElement("div");
    caption.className = "tvc-widget-caption";
    caption.innerHTML = `
      <strong>${escapeHtml(video.title)}</strong>
      ${settings.showCaptions !== false && video.caption ? `<span>${escapeHtml(video.caption)}</span>` : ""}
      ${primaryProductLink(video)}
    `;

    card.appendChild(media);
    card.appendChild(caption);
    return card;
  };

  const primaryProductLink = (video) => {
    const tag = (video.tags || [])[0];
    if (!tag) return "";
    const href = tag.clickUrl || (tag.handle ? `/products/${tag.handle}` : "#");
    return `<a class="tvc-widget-product-link" href="${escapeAttribute(href)}" data-tvc-video="${escapeAttribute(video.id)}" data-tvc-tag="${escapeAttribute(tag.id)}" data-tvc-product="${escapeAttribute(tag.productId)}" data-tvc-variant="${escapeAttribute(tag.variantId || "")}">${escapeHtml(tag.ctaLabel || "Shop now")}</a>`;
  };

  const attachVideoSource = (element, url) => {
    if (!isHlsUrl(url) || element.canPlayType("application/vnd.apple.mpegurl") || element.canPlayType("application/x-mpegURL")) {
      element.src = url;
      return;
    }

    loadHls().then((Hls) => {
      if (Hls && Hls.isSupported && Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(element);
        return;
      }

      element.src = url;
    }).catch(() => {
      element.src = url;
    });
  };

  const isHlsUrl = (url) => /\.m3u8(?:[?#]|$)/i.test(url || "");

  const loadHls = () => {
    if (window.Hls) return Promise.resolve(window.Hls);
    if (hlsLoader) return hlsLoader;

    hlsLoader = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${HLS_SCRIPT_SRC}"]`);
      if (existing) {
        existing.addEventListener("load", () => resolve(window.Hls), { once: true });
        existing.addEventListener("error", () => reject(new Error("Failed to load HLS player.")), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = HLS_SCRIPT_SRC;
      script.async = true;
      script.onload = () => resolve(window.Hls);
      script.onerror = () => reject(new Error("Failed to load HLS player."));
      document.head.appendChild(script);
    });

    return hlsLoader;
  };

  const escapeHtml = (value) =>
    String(value || "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    })[char]);

  const escapeAttribute = escapeHtml;

  const observe = () => {
    const roots = document.querySelectorAll("[data-tvc-widget]");
    if (!("IntersectionObserver" in window)) {
      roots.forEach(loadWidget);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          observer.unobserve(entry.target);
          loadWidget(entry.target).catch(() => {});
        }
      });
    }, { rootMargin: "300px 0px" });

    roots.forEach((root) => observer.observe(root));
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", observe, { once: true });
  } else {
    observe();
  }
})();
