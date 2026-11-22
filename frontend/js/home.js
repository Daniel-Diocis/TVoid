const continueRow = document.querySelector("#continue-row");
const seriesRow = document.querySelector("#series-row");
const recentRow = document.querySelector("#recent-row");
const moviesRow = document.querySelector("#movies-row");
const continueSection = document.querySelector("#continue-section");
const featuredHero = document.querySelector("#featured-hero");
const homeRows = [continueRow, seriesRow, moviesRow, recentRow];

function setHomeRowsBusy(isBusy) {
  homeRows.forEach((row) => row.setAttribute("aria-busy", String(isBusy)));
}

function setHomeRowsLive(isLive) {
  homeRows.forEach((row) => {
    if (isLive) {
      row.setAttribute("aria-live", "polite");
      row.setAttribute("aria-atomic", "false");
      return;
    }

    row.removeAttribute("aria-live");
    row.removeAttribute("aria-atomic");
  });
}

function setHomeRowsState(message) {
  const state = emptyState(message);
  setHomeRowsLive(true);
  continueSection.classList.remove("hidden");
  homeRows.forEach((row) => {
    row.innerHTML = state;
  });
}

function progressPercent(item) {
  const percent = Number(item.progress_percent || 0);
  return Math.min(100, Math.max(0, Math.round(percent)));
}

function continueCard(item) {
  if (item.type === "movie") {
    const percent = progressPercent(item);
    return `
      <a class="continue-card" href="${watchUrl("movies", item.media_id)}">
        <div class="thumb-frame episode-thumbnail-wrap">
          <div class="placeholder small episode-thumb-placeholder">Film</div>
          <img class="episode-thumb" src="${item.thumbnail_url}" alt="${escapeHTML(item.title)}" loading="lazy" data-fallback />
          <span class="watch-badge">${percent}%</span>
        </div>
        <div class="continue-body">
          <div class="continue-head">
            <div>
              <div class="card-title">${escapeHTML(item.title)}</div>
              <div class="episode-code">Film</div>
            </div>
            <span class="mini-pill">Riprendi</span>
          </div>
          <div class="card-meta">${percent}% completato</div>
          <div class="progress-track">
            <span style="width: ${percent}%"></span>
          </div>
        </div>
      </a>
    `;
  }

  const percent = progressPercent(item);
  const code = mediaCode(item.season_number, item.episode_number);
  return `
    <a class="continue-card" href="${watchUrl("series", item.episode_id)}">
      <div class="thumb-frame episode-thumbnail-wrap">
        <div class="placeholder small episode-thumb-placeholder">${code}</div>
        <img class="episode-thumb" src="${item.thumbnail_url}" alt="${escapeHTML(item.episode_title)}" loading="lazy" data-fallback />
        <span class="watch-badge">${percent}%</span>
      </div>
      <div class="continue-body">
        <div class="continue-head">
          <div>
            <div class="card-title">${escapeHTML(item.series_title)}</div>
            <div class="episode-code">${code}</div>
          </div>
          <span class="mini-pill">Riprendi</span>
        </div>
        <div class="card-meta">${escapeHTML(item.episode_title)}</div>
        <div class="progress-track">
          <span style="width: ${percent}%"></span>
        </div>
      </div>
    </a>
  `;
}

function renderHero(data) {
  const featured = data.continue_watching[0] || data.recently_added[0] || data.series[0] || data.movies[0];
  if (!featured) {
    featuredHero.innerHTML = `
      <div class="hero-copy-block">
        <p class="eyebrow">Libreria locale</p>
        <h1>TVoid</h1>
        <p class="hero-copy">Le tue serie in streaming dal filesystem, con ripresa automatica della visione.</p>
      </div>
    `;
    return;
  }

  const isEpisode = featured.type === "episode" || Boolean(featured.episode_id);
  const isMovie = featured.type === "movie" || featured.category === "movies";
  const title = isEpisode ? featured.series_title : featured.title;
  const href = isEpisode
    ? watchUrl("series", featured.episode_id)
    : isMovie
      ? watchUrl("movies", featured.media_id || featured.id)
      : detailUrl("series", featured.id);
  const image = isEpisode ? featured.thumbnail_url : featured.poster_url || featured.thumbnail_url;
  const eyebrow = isEpisode
    ? `${mediaCode(featured.season_number, featured.episode_number)} · Continua a guardare`
    : isMovie
      ? featured.year
        ? `Film in evidenza · ${featured.year}`
        : "Film in evidenza"
      : featured.year
        ? `Serie in evidenza · ${featured.year}`
        : "Serie in evidenza";
  const copy = isEpisode ? featured.episode_title : featured.description || "Disponibile nella tua libreria locale.";
  const action = isEpisode ? "Riprendi episodio" : isMovie ? "Guarda film" : "Apri serie";

  featuredHero.innerHTML = `
    <div class="hero-media" aria-hidden="true">
      <img src="${image}" alt="" data-fallback />
    </div>
    <div class="hero-copy-block">
      <p class="eyebrow">${escapeHTML(eyebrow)}</p>
      <h1>${escapeHTML(title)}</h1>
      <p class="hero-copy">${escapeHTML(copy)}</p>
      <a class="button primary" href="${href}">${action}</a>
    </div>
  `;
}

async function loadHome() {
  const data = await TVoidAPI.home();
  renderHero(data);
  setHomeRowsLive(false);

  continueSection.classList.toggle("hidden", data.continue_watching.length === 0);
  continueRow.innerHTML = data.continue_watching.length
    ? data.continue_watching.map(continueCard).join("")
    : "";

  seriesRow.innerHTML = data.series.length
    ? data.series.map(posterCard).join("")
    : emptyState(emptyCategoryMessage("series"));

  moviesRow.innerHTML = data.movies.length
    ? data.movies.map(posterCard).join("")
    : emptyState(emptyCategoryMessage("movies"));

  recentRow.innerHTML = data.recently_added.length
    ? data.recently_added.map(posterCard).join("")
    : emptyState("La libreria è vuota.");

  installImageFallbacks();
  setHomeRowsBusy(false);
}

if (window.location.hash === "#movies") {
  window.location.replace(catalogUrl("movies"));
} else {
  renderNavigation("home");
  setHomeRowsBusy(true);
  setHomeRowsState("Caricamento libreria…");
  openCatalog(loadHome, () => {
    setHomeRowsState("Non riesco a caricare la libreria.");
    setHomeRowsBusy(false);
  });
}
