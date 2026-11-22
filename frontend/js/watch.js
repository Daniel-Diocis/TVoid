const mediaType = qs("type") || "episode";
const mediaId = qs("id");
const video = document.querySelector("#video-player");
const kicker = document.querySelector("#episode-kicker");
const title = document.querySelector("#episode-title");
const subtitle = document.querySelector("#episode-subtitle");
const nextButton = document.querySelector("#next-button");
const backSeriesButton = document.querySelector("#back-series-button");
const playbackError = document.querySelector("#playback-error");
const playbackErrorMessage = document.querySelector("#playback-error-message");
const retryButton = document.querySelector("#retry-playback");

let currentMedia = null;
let progressTargetId = null;
let playbackSession;
let sessionRequest;
let saveSequence = 0;
let confirmedSequence = 0;
let lastSavedAt = 0;
let lastSavedTime = -1;
let saveTimer = null;
let initialPosition = null;
let viewerHasInteracted = false;

const SAVE_INTERVAL_MS = 10000;
const RESUME_REWIND_SECONDS = 2;

function isMovieMode() {
  return mediaType === "movie";
}

async function showPlaybackError() {
  const code = video.error?.code;
  if (!code || code === 1) return; // The browser cancelled the request.
  clearInterval(saveTimer);
  const playerHadFocus = document.activeElement === video;
  video.hidden = true;
  playbackError.hidden = false;
  kicker.textContent = isMovieMode() ? "Film" : "Episodio";
  playbackErrorMessage.textContent = "Controlla che TVoid sia raggiungibile, poi riprova.";
  if (playerHadFocus) retryButton.focus();

  const unreadable = "Il browser non riesce a leggere questo video. Verifica il formato del file MP4.";
  if (code === 3) {
    playbackErrorMessage.textContent = unreadable;
    return;
  }

  // MediaError does not expose the HTTP status. Probe only the failed stream.
  try {
    const response = await fetch(video.src, { headers: { Range: "bytes=0-0" }, cache: "no-store" });
    await response.body?.cancel();
    if (response.status === 404) {
      playbackErrorMessage.textContent = "Il file non è presente nella libreria. Ripristinalo nella cartella originale e riprova.";
    } else if (response.status === 416 || (response.ok && code === 4)) {
      playbackErrorMessage.textContent = unreadable;
    }
  } catch {
    // Keep the connection message if the server cannot be reached.
  }
}

function progressPayload() {
  return {
    current_time_seconds: video.currentTime,
    duration_seconds: Number.isFinite(video.duration) ? video.duration : currentMedia?.progress?.duration_seconds ?? null,
  };
}

function requestPlaybackSession() {
  if (!sessionRequest) {
    sessionRequest = TVoidAPI.startPlaybackSession().then((session) => {
      playbackSession = session.playback_session;
      return playbackSession;
    }).catch((error) => {
      sessionRequest = null;
      throw error;
    });
  }
  return sessionRequest;
}

async function persistProgress(payload, keepalive) {
  if (isMovieMode()) {
    return TVoidAPI.saveMovieProgress(progressTargetId, payload, keepalive);
  }

  return TVoidAPI.saveProgress(progressTargetId, payload, keepalive);
}

async function saveProgress(force = false, keepalive = false) {
  if (initialPosition === null || !viewerHasInteracted || video.error || !Number.isFinite(video.currentTime)) {
    return;
  }

  const now = Date.now();
  const payload = progressPayload();
  const movedEnough = Math.abs(payload.current_time_seconds - lastSavedTime) >= 3;
  const waitedEnough = now - lastSavedAt >= SAVE_INTERVAL_MS;

  if (!force && (!movedEnough || !waitedEnough)) {
    return;
  }

  payload.save_sequence = ++saveSequence;
  try {
    payload.playback_session = playbackSession ?? await requestPlaybackSession();
    const result = await persistProgress(payload, keepalive);
    if (result.status === "ok" && payload.save_sequence > confirmedSequence) {
      confirmedSequence = payload.save_sequence;
      lastSavedAt = now;
      lastSavedTime = payload.current_time_seconds;
    }
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
      return safeResume;
    }
  } else if (progress?.completed) {
    video.currentTime = 0;
  }
  return video.currentTime;
}

function installProgressListeners() {
  video.addEventListener(
    "loadedmetadata",
    () => {
      initialPosition = restorePlaybackPosition();
    },
    { once: true },
  );

  video.addEventListener("playing", () => {
    viewerHasInteracted = true;
    clearInterval(saveTimer);
    saveTimer = setInterval(() => saveProgress(false), SAVE_INTERVAL_MS);
  });
  video.addEventListener("seeked", () => {
    // Browsers can round currentTime. Ignore the seek generated by automatic resume.
    if (initialPosition !== null && Math.abs(video.currentTime - initialPosition) >= 0.1) {
      viewerHasInteracted = true;
    }
    if (video.paused) saveProgress(true);
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
}

async function loadEpisode() {
  const episode = await TVoidAPI.episode(mediaId);
  currentMedia = episode;
  progressTargetId = episode.id;

  document.title = `${episode.series_title} - ${episode.title} - TVoid`;
  kicker.textContent = "In riproduzione";
  title.textContent = episode.series_title;
  subtitle.textContent = `${mediaCode(episode.season_number, episode.episode_number)} · ${episode.title}`;

  backSeriesButton.href = detailUrl("series", episode.media_id);
  backSeriesButton.textContent = "Torna alla serie";
  backSeriesButton.classList.remove("hidden");

  if (episode.next_episode_id) {
    nextButton.href = watchUrl("series", episode.next_episode_id);
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

  backSeriesButton.href = detailUrl("movies", movie.id);
  backSeriesButton.textContent = "Torna al film";
  backSeriesButton.classList.remove("hidden");
  nextButton.classList.add("hidden");
}

async function bootWatch() {
  renderNavigation(isMovieMode() ? "movies" : "series", "location");
  if (!mediaId) {
    title.textContent = isMovieMode() ? "Film non selezionato" : "Episodio non selezionato";
    return;
  }

  try {
    requestPlaybackSession().catch((error) => console.error(error));
    if (isMovieMode()) {
      await loadMovie();
    } else {
      await loadEpisode();
    }

    installProgressListeners();
    video.addEventListener("error", showPlaybackError);
    retryButton.onclick = () => window.location.reload();
    video.src = currentMedia.video_url;
  } catch (error) {
    title.textContent = isMovieMode() ? "Non riesco ad aprire questo film" : "Non riesco ad aprire questo episodio";
    subtitle.textContent = "";
    console.error(error);
  }
}

bootWatch();
