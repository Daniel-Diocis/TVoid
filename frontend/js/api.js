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

  scan() {
    return this.request("/api/scan", { method: "POST" });
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

  saveProgress(id, payload, keepalive = false) {
    return fetch(`/api/progress/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive,
    });
  },

  saveMovieProgress(id, payload, keepalive = false) {
    return fetch(`/api/movie-progress/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive,
    });
  },
};

function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char];
  });
}

function mediaCode(season, episode) {
  return `S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`;
}

function installImageFallbacks(scope = document) {
  scope.querySelectorAll("img[data-fallback]").forEach((image) => {
    image.addEventListener(
      "error",
      () => {
        image.remove();
      },
      { once: true },
    );
  });
}

function emptyState(text) {
  return `<div class="empty-state">${escapeHTML(text)}</div>`;
}
