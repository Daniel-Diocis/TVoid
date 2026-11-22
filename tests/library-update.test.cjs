const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const script = fs.readFileSync(path.join(__dirname, "../frontend/js/library.js"), "utf8");

function catalog(api) {
  const button = {
    disabled: true, parentElement: {},
    addEventListener(name, handler) { this[name] = handler; },
  };
  const status = { textContent: "" };
  const document = { querySelector: (selector) => selector === "#refresh-library" ? button : status };
  const open = vm.runInNewContext(script + "\nopenCatalog", {
    document, TVoidAPI: api, console: { error() {} }, setTimeout: (callback) => callback(),
  });
  return { button, status, open: (load) => open(load, () => assert.fail("Catalog load failed")) };
}

test("an indexed catalog can still be browsed when its manual refresh fails", async () => {
  let reads = 0;
  let scans = 0;
  const { open, button, status } = catalog({
    scanStatus: async () => ({ state: "idle", indexed: true }),
    startScan: async () => { scans++; throw new Error("server unavailable"); },
  });
  await open(() => { reads++; });
  assert.equal(scans, 0);
  await button.click();
  assert.equal(scans, 1);
  assert.equal(reads, 1);
  assert.match(status.textContent, /Riprova/);
  assert.equal(button.disabled, false);
});

test("first access reads the catalog before indexing, then reloads the results", async () => {
  const events = [];
  let indexed = false;
  const { open } = catalog({
    scanStatus: async () => ({ state: "idle", indexed }),
    startScan: async (initial) => {
      assert.equal(initial, true);
      events.push("scan");
      indexed = true;
      return { state: "running" };
    },
  });
  await open(() => events.push("read"));
  assert.deepEqual(events, ["read", "scan", "read"]);
});
