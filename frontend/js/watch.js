const mediaType = qs("type") || "episode";
const mediaId = qs("id");
const video = document.querySelector("#video-player");
const source = document.querySelector("#video-source");
const kicker = document.querySelector("#episode-kicker");
const title = document.querySelector("#episode-title");
const subtitle = document.querySelector("#episode-subtitle");
const nextButton = document.querySelector("#next-button");
const backSeriesButton = document.querySelector("#back-series-button");

let currentMedia = null;
let progressTargetId = null;
let lastSavedAt = 0;
let lastSavedTime = -1;
let saveTimer = null;
let playbackStarted = false;

const SAVE_INTERVAL_MS = 10000;
const RESUME_REWIND_SECONDS = 2;

function isMovieMode() {
  return mediaType === "movie";
}

function progressPayload() {
  return {
    current_time_seconds: Number.isFinite(video.currentTime) ? video.currentTime : 0,
    duration_seconds: Number.isFinite(video.duration) ? video.duration : currentMedia?.progress?.duration_seconds ?? null,
  };
}

async function persistProgress(payload, keepalive) {
  if (isMovieMode()) {
    return TVoidAPI.saveMovieProgress(progressTargetId, payload, keepalive);
  }

  return TVoidAPI.saveProgress(progressTargetId, payload, keepalive);
}

async function saveProgress(force = false, keepalive = false) {
  if (!currentMedia || !progressTargetId) {
    return;
  }

  const now = Date.now();
  const payload = progressPayload();
  const movedEnough = Math.abs(payload.current_time_seconds - lastSavedTime) >= 3;
  const waitedEnough = now - lastSavedAt >= SAVE_INTERVAL_MS;

  if (currentMedia.progress?.completed && !playbackStarted && payload.current_time_seconds < 1) {
    return;
  }

  if (!force && (!movedEnough || !waitedEnough)) {
    return;
  }

  lastSavedAt = now;
  lastSavedTime = payload.current_time_seconds;

  try {
    await persistProgress(payload, keepalive);
  } catch (error) {
    console.error(error);
  }
}

function restorePlaybackPosition() {
  const progress = currentMedia.progress;
  if (progress && progress.current_time_seconds > 0 && !progress.completed) {
    const safeResume = Math.max(0, progress.current_time_seconds - RESUME_REWIND_SECONDS);
    if (safeResume < video.duration) {
      video.currentTime = safeResume;
      console.info(
        `TVoid restored playback position for ${mediaType} ${progressTargetId}: ${safeResume.toFixed(2)}s of ${video.duration.toFixed(2)}s`,
      );
    }
  } else if (progress?.completed) {
    video.currentTime = 0;
  }
}

function installProgressListeners() {
  video.addEventListener(
    "loadedmetadata",
    () => {
      restorePlaybackPosition();
    },
    { once: true },
  );

  video.addEventListener("play", () => {
    playbackStarted = true;
    clearInterval(saveTimer);
    saveTimer = setInterval(() => saveProgress(false), SAVE_INTERVAL_MS);
  });
  video.addEventListener("pause", () => {
    clearInterval(saveTimer);
    saveProgress(true);
  });
  video.addEventListener("ended", () => {
    clearInterval(saveTimer);
    saveProgress(true);
  });
  window.addEventListener("pagehide", () => saveProgress(true, true));
  window.addEventListener("beforeunload", () => saveProgress(true, true));
}

async function loadEpisode() {
  const episode = await TVoidAPI.episode(mediaId);
  currentMedia = episode;
  progressTargetId = episode.id;

  document.title = `${episode.series_title} - ${episode.title} - TVoid`;
  kicker.textContent = "In riproduzione";
  title.textContent = episode.series_title;
  subtitle.textContent = `${mediaCode(episode.season_number, episode.episode_number)} · ${episode.title}`;

  source.src = episode.video_url;
  video.load();

  backSeriesButton.href = `/series.html?id=${episode.media_id}`;
  backSeriesButton.textContent = "Torna alla serie";
  backSeriesButton.classList.remove("hidden");

  if (episode.next_episode_id) {
    nextButton.href = `/watch.html?id=${episode.next_episode_id}`;
    nextButton.textContent = "Prossimo episodio";
    nextButton.classList.remove("hidden");
  }
}

async function loadMovie() {
  const movie = await TVoidAPI.movie(mediaId);
  if (!movie.movie_file) {
    throw new Error("Movie file not found");
  }

  currentMedia = {
    ...movie.movie_file,
    media_id: movie.id,
    title: movie.title,
  };
  progressTargetId = movie.movie_file.id;

  document.title = `${movie.title} - TVoid`;
  kicker.textContent = "Film";
  title.textContent = movie.title;
  subtitle.textContent = movie.year ? `${movie.year} · Film` : "Film";

  source.src = movie.movie_file.video_url;
  video.load();

  backSeriesButton.href = `/movie.html?id=${movie.id}`;
  backSeriesButton.textContent = "Torna al film";
  backSeriesButton.classList.remove("hidden");
  nextButton.classList.add("hidden");
}

async function bootWatch() {
  if (!mediaId) {
    title.textContent = isMovieMode() ? "Film non selezionato" : "Episodio non selezionato";
    return;
  }

  try {
    if (isMovieMode()) {
      await loadMovie();
    } else {
      await loadEpisode();
    }

    installProgressListeners();
  } catch (error) {
    title.textContent = isMovieMode() ? "Non riesco ad aprire questo film" : "Non riesco ad aprire questo episodio";
    subtitle.textContent = "";
    console.error(error);
  }
}

bootWatch();
