const content = document.querySelector("#series-content");
const selectedId = qs("id");
let currentSeriesDetail = null;
let activeSeasonId = null;

function listCard(item) {
  return `
    <a class="poster-card" href="/series.html?id=${item.id}">
      <div class="poster-frame">
        <div class="placeholder">${escapeHTML(item.title)}</div>
        <img src="${item.poster_url}" alt="" loading="lazy" data-fallback />
        <div class="poster-shine"></div>
      </div>
      <div class="poster-copy">
        <div class="card-title">${escapeHTML(item.title)}</div>
        ${item.year ? `<div class="card-meta">${item.year}</div>` : ""}
      </div>
    </a>
  `;
}

function clampPercent(value) {
  const percent = Number(value || 0);
  return Math.min(100, Math.max(0, Math.round(percent)));
}

function allEpisodes(item) {
  return item.seasons.flatMap((season) => season.episodes);
}

function episodeProgress(episode) {
  return episode.progress || {};
}

function isCompleted(episode) {
  return Boolean(episodeProgress(episode).completed);
}

function isStarted(episode) {
  return Number(episodeProgress(episode).current_time_seconds || 0) > 0 && !isCompleted(episode);
}

function watchTarget(item) {
  const episodes = allEpisodes(item);
  const firstEpisode = episodes[0];
  const firstIncomplete = episodes.find((episode) => !isCompleted(episode));

  if (!firstEpisode) {
    return null;
  }

  if (!firstIncomplete) {
    return {
      episode: firstEpisode,
      label: "Riguarda dall'inizio",
    };
  }

  return {
    episode: firstIncomplete,
    label: isStarted(firstIncomplete) ? "Riprendi" : "Guarda",
  };
}

function seasonHasIncompleteEpisodes(season) {
  return season.episodes.some((episode) => !isCompleted(episode));
}

function defaultSeasonId(item) {
  const season = item.seasons.find(seasonHasIncompleteEpisodes) || item.seasons[0];
  return season?.id ?? null;
}

function seasonStats(item) {
  const episodes = allEpisodes(item);
  return {
    seasonCount: item.seasons.length,
    episodeCount: episodes.length,
  };
}

function episodeRow(episode) {
  const progress = clampPercent(episode.progress?.progress_percent);
  const completed = episode.progress?.completed;
  const started = isStarted(episode);
  const code = mediaCode(episode.season_number, episode.episode_number);
  const visualProgress = completed ? 100 : progress;
  const status = completed ? "✓ Completato" : started ? "In corso" : "";

  return `
    <a class="episode-row ${completed ? "completed" : ""} ${started ? "in-progress" : ""}" href="/watch.html?id=${episode.id}">
      <div class="episode-thumb">
        <div class="episode-thumb-placeholder">${code}</div>
        <img class="episode-thumb-img" src="${episode.thumbnail_url}" alt="${escapeHTML(episode.title)}" loading="lazy" data-fallback />
      </div>
      <div class="episode-main">
        <div class="episode-header">
          <div class="episode-title-block">
            <span class="episode-code">${code}</span>
            <h3 class="episode-title">${escapeHTML(episode.title)}</h3>
          </div>
          ${status ? `<span class="episode-status ${completed ? "completed" : "in-progress"}">${status}</span>` : ""}
        </div>
        ${
          visualProgress > 0
            ? `
              <div class="episode-progress">
                <span class="episode-progress-fill" style="width: ${visualProgress}%"></span>
              </div>
              <span class="episode-progress-value">${visualProgress}%</span>
            `
            : `<div class="episode-progress empty"></div>`
        }
      </div>
    </a>
  `;
}

function renderSeasonTabs(item) {
  return `
    <div class="season-tabs" role="tablist" aria-label="Stagioni">
      ${item.seasons
        .map(
          (season) => `
            <button
              class="season-tab ${season.id === activeSeasonId ? "active" : ""}"
              type="button"
              data-season-id="${season.id}"
              aria-selected="${season.id === activeSeasonId ? "true" : "false"}"
            >
              Stagione ${season.season_number}
            </button>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderEpisodeList(item) {
  const season = item.seasons.find((season) => season.id === activeSeasonId) || item.seasons[0];
  if (!season) {
    return emptyState("Nessuna stagione rilevata.");
  }

  const episodes = season.episodes.length
    ? season.episodes.map(episodeRow).join("")
    : emptyState("Questa stagione non contiene episodi MP4 validi.");

  return `
    <section class="episodes-panel">
      <div class="season-heading">
        <h2>Stagione ${season.season_number}</h2>
        <span>${season.episodes.length} episodi</span>
      </div>
      <div class="episode-list">${episodes}</div>
    </section>
  `;
}

function renderSeriesDetailView(item) {
  const target = watchTarget(item);
  const stats = seasonStats(item);
  const meta = [
    item.year,
    "Serie TV",
    `${stats.seasonCount} ${stats.seasonCount === 1 ? "stagione" : "stagioni"}`,
    `${stats.episodeCount} episodi`,
  ].filter(Boolean);

  content.innerHTML = `
    <section class="series-hero">
      <div class="series-poster">
        <div class="series-poster-placeholder">${escapeHTML(item.title)}</div>
        <img src="${item.poster_url}" alt="" data-fallback />
      </div>
      <div class="series-info">
        <p class="eyebrow">Dettaglio serie</p>
        <h1>${escapeHTML(item.title)}</h1>
        <div class="series-meta">${meta.map((value) => `<span>${escapeHTML(value)}</span>`).join("")}</div>
        <p>${escapeHTML(item.description || "Nessuna descrizione disponibile.")}</p>
        ${
          target
            ? `<a class="button primary series-primary-action" href="/watch.html?id=${target.episode.id}">${target.label}</a>`
            : ""
        }
      </div>
    </section>
    ${item.seasons.length ? renderSeasonTabs(item) : ""}
    ${renderEpisodeList(item)}
  `;

  installImageFallbacks(content);
}

async function renderSeriesList() {
  content.innerHTML = emptyState("Scansione libreria...");
  await TVoidAPI.scan();
  const items = await TVoidAPI.media("series");
  content.innerHTML = items.length
    ? `
      <section class="content-section library-heading">
        <div class="section-heading">
          <h1>Serie TV</h1>
        </div>
        <div class="poster-grid library-grid">${items.map(listCard).join("")}</div>
      </section>
    `
    : emptyState("Nessuna serie trovata in media/series.");
  installImageFallbacks(content);
}

async function renderSeriesDetail(id) {
  content.innerHTML = emptyState("Caricamento serie...");
  currentSeriesDetail = await TVoidAPI.mediaDetail(id);
  activeSeasonId = defaultSeasonId(currentSeriesDetail);
  renderSeriesDetailView(currentSeriesDetail);
}

content.addEventListener("click", (event) => {
  const tab = event.target.closest("[data-season-id]");
  if (!tab || !currentSeriesDetail) {
    return;
  }

  activeSeasonId = Number(tab.dataset.seasonId);
  renderSeriesDetailView(currentSeriesDetail);
});

async function bootSeries() {
  try {
    if (selectedId) {
      await renderSeriesDetail(selectedId);
    } else {
      await renderSeriesList();
    }
  } catch (error) {
    content.innerHTML = emptyState("Non riesco a caricare questa pagina.");
    console.error(error);
  }
}

bootSeries();
