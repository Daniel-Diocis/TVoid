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

function renderMovieDetail(movie, content) {
  const movieFile = movie.movie_file;
  const progress = movieProgress(movieFile);
  const percent = Math.min(100, Math.max(0, Math.round(progress.progress_percent || 0)));
  const actionLabel = movieFile ? movieActionLabel(progress) : "File non disponibile";
  const action = movieFile
    ? `<a class="button primary detail-action" href="${watchUrl("movies", movie.id)}">${actionLabel}</a>`
    : `<span class="button disabled">${actionLabel}</span>`;
  content.innerHTML = `
    ${detailHero(movie, [movie.year, "Film"], "Disponibile nella tua libreria locale.", action)}
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

  installImageFallbacks(content);
}

openDetail("movies", (id) => TVoidAPI.movie(id), renderMovieDetail);
