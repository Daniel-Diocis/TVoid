const categoryNames = { series: "Serie TV", movies: "Film" };

function catalogUrl(category) {
  return `/catalog.html?category=${encodeURIComponent(category)}`;
}

function detailUrl(category, id) {
  const page = category === "movies" ? "movie" : "series";
  return `/${page}.html?id=${encodeURIComponent(id)}`;
}

function watchUrl(category, id) {
  const query = category === "movies" ? "type=movie&" : "";
  return `/watch.html?${query}id=${encodeURIComponent(id)}`;
}

function renderNavigation(section, current = "page") {
  const links = Object.entries({ home: "Home", ...categoryNames }).map(([key, label]) => {
    const href = key === "home" ? "/" : catalogUrl(key);
    const active = key === section ? ` aria-current="${current}"` : "";
    return `<a href="${href}"${active}>${label}</a>`;
  });
  document.querySelector(".topbar").innerHTML = `
    <a class="logo" href="/"><span class="logo-mark" aria-hidden="true">T</span><span>TVoid</span></a>
    <nav class="nav" aria-label="Navigazione principale">
      ${links.join("")}
    </nav>
  `;
}

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
