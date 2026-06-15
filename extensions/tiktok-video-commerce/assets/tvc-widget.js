(() => {
  const loaded = new WeakSet();

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

    const canUseVideo = video.playbackUrl && !/^https:\/\/(www\.)?tiktok\.com/.test(video.playbackUrl);
    if (canUseVideo) {
      const element = document.createElement("video");
      element.src = video.playbackUrl;
      element.poster = video.thumbnailUrl || "";
      element.preload = "metadata";
      element.playsInline = true;
      element.muted = settings.muted !== false;
      element.controls = true;
      element.addEventListener("play", () => postEvent(root, { type: "VIEW", videoId: video.id }), { once: true });
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
