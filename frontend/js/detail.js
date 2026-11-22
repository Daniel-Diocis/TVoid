async function openDetail(category, load, render) {
  const id = qs("id");
  if (!id) {
    window.location.replace(catalogUrl(category));
    return;
  }

  renderNavigation(category, "location");
  const content = document.querySelector("#detail-content");
  content.innerHTML = emptyState("Caricamento scheda…");
  try {
    const item = await load(id);
    if (item.category !== category) {
      window.location.replace(detailUrl(item.category, item.id));
      return;
    }
    document.title = `${item.title} - TVoid`;
    render(item, content);
  } catch (error) {
    content.innerHTML = emptyState("Non riesco ad aprire questa scheda.");
    console.error(error);
  }
}

function detailHero(item, meta, description, action) {
  const movie = item.category === "movies";
  return `
    <section class="detail-hero">
      <div class="detail-poster">
        <div class="detail-poster-placeholder">${escapeHTML(item.title)}</div>
        <img src="${escapeHTML(item.poster_url)}" alt="" data-fallback />
      </div>
      <div class="detail-info">
        <p class="eyebrow">${movie ? "Film" : "Dettaglio serie"}</p>
        <h1>${escapeHTML(item.title)}</h1>
        <div class="detail-meta">${meta.filter(Boolean).map((value) => `<span>${escapeHTML(value)}</span>`).join("")}</div>
        <p>${escapeHTML(item.description || description)}</p>
        ${action}
      </div>
    </section>
  `;
}
