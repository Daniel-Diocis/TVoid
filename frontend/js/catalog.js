function bootCatalog() {
  const category = qs("category");
  if (!Object.keys(categoryNames).includes(category)) {
    window.location.replace(catalogUrl("series"));
    return;
  }

  renderNavigation(category);
  document.title = `${categoryNames[category]} - TVoid`;
  document.querySelector("#catalog-title").textContent = categoryNames[category];
  const content = document.querySelector("#catalog-content");
  content.innerHTML = emptyState("Caricamento catalogo…");
  openCatalog(async () => {
    const items = await TVoidAPI.media(category);
    content.innerHTML = items.length
      ? `<div class="poster-grid library-grid">${items.map(posterCard).join("")}</div>`
      : emptyState(emptyCategoryMessage(category));
    installImageFallbacks(content);
  }, () => {
    content.innerHTML = emptyState("Non riesco a caricare il catalogo.");
  });
}

bootCatalog();
