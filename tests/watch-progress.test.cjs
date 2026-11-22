const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");
const { setImmediate: settle } = require("node:timers/promises");

async function openPlayer(type, saveResponse, sessionResponse) {
  const video = Object.assign(new EventTarget(), {
    currentTime: 0, duration: NaN, paused: true, load() {},
  });
  const window = Object.assign(new EventTarget(), { location: { search: `?type=${type}&id=4` } });
  const progress = { current_time_seconds: 720, duration_seconds: 1800, completed: false };
  const mediaFile = { id: 9, progress, video_url: "/video" };
  const detail = type === "movie" ? { id: 4, movie_file: mediaFile } : { ...mediaFile, id: 4 };
  const writes = [];
  const elements = new Map([["#video-player", video]]);
  const streamRequests = [];
  const errors = [];
  let tick;
  let status = 200;
  let now = 100000;
  const context = vm.createContext({
    window, URLSearchParams,
    Date: { now: () => now },
    document: { querySelector(id) {
      if (!elements.has(id)) elements.set(id, { classList: { add() {}, remove() {} } });
      return elements.get(id);
    } },
    console: { info() {}, error: (error) => errors.push(error) },
    setInterval: (callback) => { tick = callback; return 1; },
    clearInterval: () => { tick = undefined; },
    fetch: async (url, options) => {
      if (url === "/api/playback-session") {
        return sessionResponse ? sessionResponse() : Response.json({ playback_session: 42 });
      }
      if (url === mediaFile.video_url) {
        streamRequests.push(options.headers.Range);
        return new Response(null, { status });
      }
      if (options.method !== "POST") return Response.json(detail);
      writes.push({ url, payload: JSON.parse(options.body), keepalive: options.keepalive });
      if (saveResponse) return saveResponse();
      return Response.json({ status: "ok" }, { status });
    },
  });
  for (const file of ["api.js", "ui.js", "watch.js"]) {
    const script = fs.readFileSync(path.join(__dirname, "../frontend/js", file), "utf8");
    vm.runInContext(script, context, { filename: file });
  }
  await settle();
  return {
    video, window, writes, errors, streamRequests, elements,
    metadata() { video.duration = 1800; video.dispatchEvent(new Event("loadedmetadata")); },
    play() {
      video.paused = false;
      for (const name of ["play", "playing"]) video.dispatchEvent(new Event(name));
    },
    tick: () => tick(),
    advanceClock(ms) { now += ms; },
    respondWith(code) { status = code; },
  };
}

test("a missing movie after playback shows recovery and preserves the saved position", async () => {
  const player = await openPlayer("movie");
  player.metadata();
  player.play();
  assert.deepEqual(player.streamRequests, []);
  player.respondWith(404);
  player.video.currentTime = 0;
  player.video.error = { code: 4 };
  player.video.dispatchEvent(new Event("error"));
  player.window.dispatchEvent(new Event("pagehide"));
  await settle();
  assert.deepEqual(player.streamRequests, ["bytes=0-0"]);
  assert.match(player.elements.get("#playback-error-message").textContent, /nella libreria/);
  assert.equal(player.elements.get("#playback-error").hidden, false);
  assert.deepEqual(player.writes, []);
});

for (const type of ["episode", "movie"]) {
  test(`${type}: closing before metadata or after automatic resume preserves 12:00`, async () => {
    const player = await openPlayer(type);
    player.video.dispatchEvent(new Event("play"));
    player.window.dispatchEvent(new Event("pagehide"));
    player.metadata();
    assert.equal(player.video.currentTime, 718);
    player.video.dispatchEvent(new Event("seeked"));
    player.window.dispatchEvent(new Event("pagehide"));
    await settle();
    assert.deepEqual(player.writes, []);
  });

  test(`${type}: pausing after playback saves the new position to the correct endpoint`, async () => {
    const player = await openPlayer(type);
    player.metadata();
    player.play();
    player.video.currentTime = 750;
    player.video.paused = true;
    player.video.dispatchEvent(new Event("pause"));
    await settle();
    assert.deepEqual(player.writes, [{
      url: type === "movie" ? "/api/movie-progress/9" : "/api/progress/4",
      payload: { current_time_seconds: 750, duration_seconds: 1800, playback_session: 42, save_sequence: 1 },
      keepalive: false,
    }]);
  });
}

test("leaving during playback sends the latest position with keepalive", async () => {
  const player = await openPlayer("episode");
  player.metadata();
  player.play();
  player.video.currentTime = 764;
  player.window.dispatchEvent(new Event("pagehide"));
  await settle();
  assert.equal(player.writes.length, 1);
  assert.equal(player.writes[0].payload.current_time_seconds, 764);
  assert.equal(player.writes[0].keepalive, true);
});

test("seeking while paused saves the chosen position, including zero", async () => {
  const player = await openPlayer("episode");
  player.metadata();
  player.video.currentTime = 0;
  player.video.dispatchEvent(new Event("seeked"));
  await settle();
  assert.deepEqual(player.writes.map((write) => write.payload.current_time_seconds), [0]);
});

test("a rejected HTTP save is eligible for retry at the same position", async () => {
  const player = await openPlayer("movie");
  player.metadata();
  player.play();
  player.video.currentTime = 750;
  player.respondWith(503);
  await player.tick();
  player.respondWith(200);
  await player.tick();
  await player.tick();
  assert.equal(player.errors.length, 1);
  assert.deepEqual(player.writes.map((write) => write.payload.current_time_seconds), [750, 750]);
});

test("a delayed acknowledgement cannot reset the last confirmed position", async () => {
  let finishFirst;
  const first = new Promise((resolve) => { finishFirst = resolve; });
  let count = 0;
  const player = await openPlayer("episode", () => ++count === 1 ? first : Response.json({ status: "ok" }));
  player.metadata();
  player.play();
  player.video.currentTime = 720;
  const delayed = player.tick();
  player.video.currentTime = 0;
  player.window.dispatchEvent(new Event("pagehide"));
  await settle();
  finishFirst(Response.json({ status: "ok" }));
  await delayed;
  assert.deepEqual(player.writes.map(({ payload }) => [payload.save_sequence, payload.current_time_seconds]),
    [[1, 720], [2, 0]]);
  // After the throttle expires, remaining at the confirmed zero needs no new write.
  player.advanceClock(11000);
  await player.tick();
  assert.equal(player.writes.length, 2);
});

test("a transient session failure permits playback and retries before sending an ordered save", async () => {
  let attempts = 0;
  const player = await openPlayer("movie", null, () => {
    if (++attempts === 1) return new Response(null, { status: 503 });
    return Response.json({ playback_session: 43 });
  });
  player.metadata();
  assert.equal(player.video.currentTime, 718);
  player.play();
  player.video.currentTime = 750;
  await player.tick();
  assert.equal(attempts, 2);
  assert.equal(player.writes.length, 1);
  assert.equal(player.writes[0].payload.playback_session, 43);
  assert.equal(player.writes[0].payload.save_sequence, 1);
});
