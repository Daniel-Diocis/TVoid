function emptyCategoryMessage(category) {
  return category === "movies" ? "Nessun film trovato in media/movies." : "Nessuna serie trovata in media/series.";
}

function posterCard(item) {
  const href = detailUrl(item.category, item.id);
  const progress = item.progress && !item.progress.completed ? Math.round(item.progress.progress_percent || 0) : 0;
  return `
    <a class="poster-card" href="${href}">
      <div class="poster-frame">
        <div class="placeholder">${escapeHTML(item.title)}</div>
        <img src="${item.poster_url}" alt="" loading="lazy" data-fallback />
        <div class="poster-shine"></div>
        ${progress > 0 ? `<div class="poster-progress"><span style="width: ${progress}%"></span></div>` : ""}
      </div>
      <div class="poster-copy">
        <div class="card-title">${escapeHTML(item.title)}</div>
        ${item.year ? `<div class="card-meta">${item.year}</div>` : ""}
      </div>
    </a>
  `;
}

async function openCatalog(loadCatalog, showLoadError) {
  const button = document.querySelector("#refresh-library");
  const status = document.querySelector("#library-status");
  button.parentElement.hidden = false;

  async function followScan(scan) {
    status.textContent = "Aggiornamento della libreria in corso…";
    while (scan.state === "running") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      scan = await TVoidAPI.scanStatus();
    }
    if (scan.state === "failed") throw new Error("Library scan failed");
    await loadCatalog();
    status.textContent = "Libreria aggiornata.";
  }

  function showUpdateError(error) {
    console.error(error);
    status.textContent = "Impossibile aggiornare la libreria. Riprova.";
  }

  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      await followScan(await TVoidAPI.startScan());
    } catch (error) {
      showUpdateError(error);
    } finally {
      button.disabled = false;
    }
  });

  // Take the scan snapshot before reading the catalog. A scan that finishes
  // between the two reads is either already visible or followed to completion.
  const scan = await TVoidAPI.scanStatus().catch(() => null);
  try {
    await loadCatalog();
  } catch (error) {
    console.error(error);
    showLoadError();
  }
  try {
    if (!scan) {
      status.textContent = "Stato dell’aggiornamento non disponibile. Riprova.";
    } else if (scan.state === "running") {
      await followScan(scan);
    } else if (scan.state === "failed") {
      status.textContent = "Ultimo aggiornamento non riuscito. Riprova.";
    } else if (!scan.indexed) {
      await followScan(await TVoidAPI.startScan(true));
    }
  } catch (error) {
    showUpdateError(error);
  } finally {
    button.disabled = false;
  }
}
