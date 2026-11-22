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
  const resumeEpisode = episodes.find((episode) => episode.id === item.resume_episode_id);
  if (resumeEpisode) {
    return {
      episode: resumeEpisode,
      label: `Riprendi ${mediaCode(resumeEpisode.season_number, resumeEpisode.episode_number)}`,
    };
  }
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
    label: "Guarda",
  };
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
    <a class="episode-row ${completed ? "completed" : ""} ${started ? "in-progress" : ""}" href="${watchUrl("series", episode.id)}">
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
              class="season-tab"
              type="button"
              role="tab"
              id="season-tab-${season.id}"
              aria-controls="season-panel-${season.id}"
              aria-selected="false"
              tabindex="-1"
            >
              Stagione ${season.season_number}
            </button>
          `,
        )
        .join("")}
    </div>
    ${item.seasons.map((season) => `
      <section class="episodes-panel" id="season-panel-${season.id}" role="tabpanel"
        aria-labelledby="season-tab-${season.id}" ${season.episodes.length ? "" : 'tabindex="0"'} hidden></section>
    `).join("")}
  `;
}

function renderEpisodeList(season) {
  const episodes = season.episodes.length
    ? season.episodes.map(episodeRow).join("")
    : emptyState("Questa stagione non contiene episodi MP4 validi.");

  return `
    <div class="season-heading">
      <h2>Stagione ${season.season_number}</h2>
      <span>${season.episodes.length} ${season.episodes.length === 1 ? "episodio" : "episodi"}</span>
    </div>
    <div class="episode-list">${episodes}</div>
  `;
}

function installSeasonTabs(content, seasons, targetEpisode) {
  const tabs = Array.from(content.querySelectorAll('[role="tab"]'));
  const panels = tabs.map((tab) => document.getElementById(tab.getAttribute("aria-controls")));

  function select(index) {
    if (!panels[index].hidden) return;
    tabs.forEach((tab, position) => {
      const active = position === index;
      tab.tabIndex = active ? 0 : -1;
      tab.setAttribute("aria-selected", String(active));
      panels[position].hidden = !active;
    });
    const panel = panels[index];
    if (!panel.firstElementChild) {
      panel.innerHTML = renderEpisodeList(seasons[index]);
      installImageFallbacks(panel);
    }
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => {
      select(index);
      tab.focus();
    });
    tab.addEventListener("keydown", (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      let next;
      switch (event.key) {
        case "ArrowLeft": next = (index - 1 + tabs.length) % tabs.length; break;
        case "ArrowRight": next = (index + 1) % tabs.length; break;
        case "Home": next = 0; break;
        case "End": next = tabs.length - 1; break;
        default: return;
      }
      event.preventDefault();
      select(next);
      tabs[next].focus();
    });
  });

  const initialIndex = seasons.findIndex((season) => season.season_number === targetEpisode?.season_number);
  select(Math.max(0, initialIndex));
}

function renderSeriesDetailView(item, content) {
  const target = watchTarget(item);
  const stats = seasonStats(item);
  const meta = [
    item.year,
    "Serie TV",
    `${stats.seasonCount} ${stats.seasonCount === 1 ? "stagione" : "stagioni"}`,
    `${stats.episodeCount} episodi`,
  ];

  const action = target
    ? `<a class="button primary detail-action" href="${watchUrl("series", target.episode.id)}">${target.label}</a>`
    : "";
  content.innerHTML = `
    ${detailHero(item, meta, "Nessuna descrizione disponibile.", action)}
    ${item.seasons.length ? renderSeasonTabs(item) : emptyState("Nessuna stagione rilevata.")}
  `;

  installImageFallbacks(content);
  if (item.seasons.length) installSeasonTabs(content, item.seasons, target?.episode);
}

openDetail("series", (id) => TVoidAPI.mediaDetail(id), renderSeriesDetailView);
