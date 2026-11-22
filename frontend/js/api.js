// Older cached series pages also load this script, but lack the detail view.
if (window.location.pathname === "/series.html" && !document.querySelector("#detail-content")) {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("view")) {
    url.searchParams.set("view", "2");
    window.location.replace(url.href);
  }
}

const TVoidAPI = {
  async request(path, options = {}) {
    const response = await fetch(path, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `HTTP ${response.status}`);
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  },

  startScan(initial = false) {
    return this.request(initial ? "/api/scan/start?initial=true" : "/api/scan/start", { method: "POST" });
  },

  scanStatus() {
    return this.request("/api/scan/status");
  },

  home() {
    return this.request("/api/home");
  },

  media(category = "series") {
    return this.request(`/api/media?category=${encodeURIComponent(category)}`);
  },

  mediaDetail(id) {
    return this.request(`/api/media/${id}`);
  },

  episode(id) {
    return this.request(`/api/episodes/${id}`);
  },

  movie(id) {
    return this.request(`/api/movies/${id}`);
  },

  startPlaybackSession() {
    return this.request("/api/playback-session", { method: "POST" });
  },

  saveProgress(id, payload, keepalive = false) {
    return this.request(`/api/progress/${id}`, {
      method: "POST",
      body: JSON.stringify(payload),
      keepalive,
    });
  },

  saveMovieProgress(id, payload, keepalive = false) {
    return this.request(`/api/movie-progress/${id}`, {
      method: "POST",
      body: JSON.stringify(payload),
      keepalive,
    });
  },
};
