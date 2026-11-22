const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const context = vm.createContext({ openDetail() {} });
for (const file of ["ui.js", "series.js"]) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../frontend/js", file), "utf8"), context);
}

function series() {
  return {
    seasons: [
      { episodes: [{ id: 1, season_number: 1, episode_number: 1 }] },
      { episodes: [{ id: 2, season_number: 2, episode_number: 1 }] },
    ],
  };
}

test("resume takes priority over an earlier unwatched episode", () => {
  const item = series();
  item.resume_episode_id = 2;
  const target = context.watchTarget(item);
  assert.equal(target.episode.id, 2);
  assert.equal(target.label, "Riprendi S02E01");
});

test("without a resume target, start the first incomplete episode or replay the series", () => {
  const item = series();
  const [first, second] = item.seasons.map((season) => season.episodes[0]);
  assert.equal(context.watchTarget(item).episode, first);
  first.progress = { completed: true };
  assert.equal(context.watchTarget(item).episode, second);
  assert.equal(context.watchTarget(item).label, "Guarda");
  second.progress = { completed: true };
  assert.equal(context.watchTarget(item).episode, first);
  assert.equal(context.watchTarget(item).label, "Riguarda dall'inizio");
  assert.equal(context.watchTarget({ seasons: [] }), null);
});
