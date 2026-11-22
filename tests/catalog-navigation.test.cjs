const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("a cached series document reloads the current layout once, keeping the requested episode library", () => {
  const api = fs.readFileSync(path.join(__dirname, "../frontend/js/api.js"), "utf8");
  const requested = new URL("http://localhost/series.html?id=1");
  function open(url, hasDetailContent) {
    const redirects = [];
    vm.runInNewContext(api, {
      URL,
      window: { location: { pathname: url.pathname, href: url.href, replace: href => redirects.push(href) } },
      document: { querySelector: selector => hasDetailContent && selector === "#detail-content" },
    });
    return redirects;
  }
  const [fresh] = open(requested, false);
  assert.equal(fresh, "http://localhost/series.html?id=1&view=2");
  assert.deepEqual(open(new URL(fresh), false), []);
  assert.deepEqual(open(requested, true), []);
});

for (const [category, label, detailPage] of [["movies", "Film", "movie"], ["series", "Serie TV", "series"]]) {
  test(`${label} uses the category catalog, corresponding detail page and active navigation link`, async () => {
    const elements = new Map();
    const document = { querySelector(selector) {
      if (!elements.has(selector)) elements.set(selector, { querySelectorAll: () => [] });
      return elements.get(selector);
    } };
    const requests = [];
    const context = vm.createContext({
      document, window: { location: { search: `?category=${category}` } }, URLSearchParams,
      TVoidAPI: { async media(value) {
        requests.push(value);
        return [{ category: value, id: 7, title: "Titolo", poster_url: "/poster" }];
      } },
    });
    function load(file) {
      vm.runInContext(fs.readFileSync(path.join(__dirname, "../frontend/js", file), "utf8"), context);
    }
    load("ui.js");
    load("library.js");
    let catalogReady;
    context.openCatalog = (render) => { catalogReady = render(); };
    load("catalog.js");
    await catalogReady;
    assert.deepEqual(requests, [category]);
    assert.equal(document.querySelector("#catalog-title").textContent, label);
    assert.ok(document.querySelector(".topbar").innerHTML.includes(
      `href="/catalog.html?category=${category}" aria-current="page">${label}</a>`));
    assert.ok(document.querySelector("#catalog-content").innerHTML.includes(`href="/${detailPage}.html?id=7"`));
  });
}
