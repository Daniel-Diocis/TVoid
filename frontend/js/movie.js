const movieContent = document.querySelector("#movie-content");
const movieId = qs("id");

function movieProgress(movieFile) {
  return movieFile?.progress || {
    current_time_seconds: 0,
    duration_seconds: movieFile?.duration_seconds ?? null,
    completed: false,
    progress_percent: 0,
  };
}

function movieActionLabel(progress) {
  if (progress.completed) {
    return "Riguarda dall'inizio";
  }

  if (progress.current_time_seconds > 0) {
    return "Riprendi";
  }

  return "Guarda";
}

function renderMovieDetail(movie) {
  const movieFile = movie.movie_file;
  const progress = movieProgress(movieFile);
  const percent = Math.min(100, Math.max(0, Math.round(progress.progress_percent || 0)));
  const actionLabel = movieFile ? movieActionLabel(progress) : "File non disponibile";
  const watchHref = movieFile ? `/watch.html?type=movie&id=${movie.id}` : "#";

  movieContent.innerHTML = `
    <section class="series-hero movie-hero">
      <div class="series-poster">
        <div class="series-poster-placeholder">${escapeHTML(movie.title)}</div>
        <img src="${movie.poster_url}" alt="" data-fallback />
      </div>
      <div class="series-info">
        <p class="eyebrow">Film</p>
        <h1>${escapeHTML(movie.title)}</h1>
        <div class="series-meta">
          ${movie.year ? `<span>${movie.year}</span>` : ""}
          <span>Film</span>
        </div>
        <p>${escapeHTML(movie.description || "Disponibile nella tua libreria locale.")}</p>
        <div class="series-primary-action">
          <a class="button primary ${movieFile ? "" : "disabled"}" href="${watchHref}">${actionLabel}</a>
        </div>
      </div>
    </section>

    <section class="content-section movie-preview-section">
      <div class="section-heading">
        <h2>Anteprima</h2>
        ${percent > 0 ? `<span class="text-link">${percent}% visto</span>` : ""}
      </div>
      <div class="movie-preview-card">
        <div class="thumb-frame movie-preview-thumb">
          <div class="placeholder small">Film</div>
          ${
            movieFile
              ? `<img src="${movieFile.thumbnail_url}" alt="${escapeHTML(movie.title)}" loading="lazy" data-fallback />`
              : ""
          }
        </div>
        <div class="movie-preview-copy">
          <div class="card-title">${escapeHTML(movie.title)}</div>
          <div class="card-meta">${progress.completed ? "Completato" : percent > 0 ? "Visione iniziata" : "Non iniziato"}</div>
          <div class="progress-track ${percent > 0 ? "" : "hidden-progress"}">
            <span style="width: ${percent}%"></span>
          </div>
        </div>
      </div>
    </section>
  `;

  installImageFallbacks(movieContent);
}

async function bootMovie() {
  if (!movieId) {
    movieContent.innerHTML = emptyState("Film non selezionato.");
    return;
  }

  movieContent.innerHTML = emptyState("Caricamento film...");

  try {
    const movie = await TVoidAPI.movie(movieId);
    document.title = `${movie.title} - TVoid`;
    renderMovieDetail(movie);
  } catch (error) {
    movieContent.innerHTML = emptyState("Non riesco ad aprire questo film.");
    console.error(error);
  }
}

bootMovie();
