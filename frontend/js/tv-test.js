(function () {
  "use strict";

  var STORAGE_EVENTS_KEY = "tvoid-tv-test-events";
  var STORAGE_CODES_KEY = "tvoid-tv-test-keycodes";
  var MAX_EVENTS = 30;
  var events = loadStoredValue(STORAGE_EVENTS_KEY, []);
  var observedCodes = loadStoredValue(STORAGE_CODES_KEY, {});

  if (!Array.isArray(events)) {
    events = [];
  }
  if (!observedCodes || typeof observedCodes !== "object" || Array.isArray(observedCodes)) {
    observedCodes = {};
  }

  var eventNameElement = document.getElementById("tv-test-event-name");
  var eventDataElement = document.getElementById("tv-test-event-data");
  var userAgentElement = document.getElementById("tv-test-user-agent");
  var environmentElement = document.getElementById("tv-test-environment-data");
  var keycodeBodyElement = document.getElementById("tv-test-keycode-body");
  var historyElement = document.getElementById("tv-test-history");
  var clearButton = document.getElementById("tv-test-clear");
  var copyButton = document.getElementById("tv-test-copy");
  var exportButton = document.getElementById("tv-test-export");
  var statusElement = document.getElementById("tv-test-status");
  var outputElement = document.getElementById("tv-test-output");

  function loadStoredValue(key, fallback) {
    try {
      var stored = window.localStorage.getItem(key);
      return stored ? JSON.parse(stored) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function saveStoredValues() {
    try {
      window.localStorage.setItem(STORAGE_EVENTS_KEY, JSON.stringify(events));
      window.localStorage.setItem(STORAGE_CODES_KEY, JSON.stringify(observedCodes));
    } catch (error) {
      setStatus("Impossibile salvare in localStorage; il registro resta disponibile in questa pagina.");
    }
  }

  function valueOrDash(value) {
    if (value === undefined || value === null || value === "") {
      return "—";
    }
    return String(value);
  }

  function booleanLabel(value) {
    return value ? "true" : "false";
  }

  function describeElement(element) {
    var label;
    var description;

    if (!element || !element.tagName) {
      return "nessuno";
    }

    description = element.tagName.toLowerCase();
    if (element.id) {
      description += "#" + element.id;
    }
    if (element.getAttribute) {
      label = element.getAttribute("aria-label") || element.getAttribute("title");
    }
    if (!label && (element.tagName === "BUTTON" || element.tagName === "A")) {
      label = element.textContent;
    }
    if (label) {
      label = label.replace(/^\s+|\s+$/g, "").replace(/\s+/g, " ");
      if (label.length > 60) {
        label = label.substring(0, 57) + "...";
      }
      description += " (" + label + ")";
    }
    return description;
  }

  function normalizeKey(event) {
    var key = event.key || "";
    var keyCode = Number(event.keyCode || event.which || 0);
    var keyNames = {
      ArrowUp: "ArrowUp",
      Up: "ArrowUp",
      ArrowDown: "ArrowDown",
      Down: "ArrowDown",
      ArrowLeft: "ArrowLeft",
      Left: "ArrowLeft",
      ArrowRight: "ArrowRight",
      Right: "ArrowRight",
      Enter: "Enter / OK",
      OK: "Enter / OK",
      Select: "Enter / OK",
      Escape: "Back / Return",
      Esc: "Back / Return",
      Back: "Back / Return",
      Backspace: "Back / Return",
      Return: "Back / Return",
      BrowserBack: "Back / Return",
      GoBack: "Back / Return",
      TVBack: "Back / Return",
      XF86Back: "Back / Return",
      MediaPlay: "Play",
      Play: "Play",
      MediaPause: "Pause",
      Pause: "Pause",
      MediaPlayPause: "PlayPause",
      PlayPause: "PlayPause",
      MediaRewind: "Rewind",
      Rewind: "Rewind",
      MediaFastForward: "FastForward",
      FastForward: "FastForward",
      MediaTrackPrevious: "MediaTrackPrevious",
      TrackPrevious: "MediaTrackPrevious",
      MediaTrackNext: "MediaTrackNext",
      TrackNext: "MediaTrackNext",
      MediaStop: "Stop",
      Stop: "Stop",
      " ": "Space",
      Spacebar: "Space",
      Space: "Space"
    };
    var legacyCodes = {
      8: "Back / Return",
      13: "Enter / OK",
      19: "Pause",
      32: "Space",
      37: "ArrowLeft",
      38: "ArrowUp",
      39: "ArrowRight",
      40: "ArrowDown",
      166: "Back / Return",
      176: "MediaTrackNext",
      177: "MediaTrackPrevious",
      178: "Stop",
      179: "PlayPause",
      227: "Rewind",
      228: "FastForward",
      412: "Rewind",
      413: "Stop",
      415: "Play",
      417: "FastForward",
      461: "Back / Return",
      10009: "Back / Return",
      10232: "MediaTrackPrevious",
      10233: "MediaTrackNext",
      10252: "PlayPause"
    };

    if (keyNames[key]) {
      return keyNames[key];
    }
    if (legacyCodes[keyCode]) {
      return legacyCodes[keyCode];
    }
    return key ? key : "Non riconosciuto";
  }

  function shouldPreventKey(normalizedName) {
    return normalizedName === "ArrowUp" ||
      normalizedName === "ArrowDown" ||
      normalizedName === "ArrowLeft" ||
      normalizedName === "ArrowRight" ||
      normalizedName === "Enter / OK" ||
      normalizedName === "Space" ||
      normalizedName === "Play" ||
      normalizedName === "Pause" ||
      normalizedName === "PlayPause" ||
      normalizedName === "Rewind" ||
      normalizedName === "FastForward" ||
      normalizedName === "MediaTrackPrevious" ||
      normalizedName === "MediaTrackNext" ||
      normalizedName === "Stop";
  }

  function makeEventRecord(event) {
    var now = new Date();
    var isKeyboard = event.type === "keydown" || event.type === "keyup";
    var record = {
      timestamp: now.toISOString(),
      time: now.toLocaleTimeString("it-IT"),
      type: event.type,
      isTrusted: Boolean(event.isTrusted),
      key: isKeyboard ? valueOrDash(event.key) : "—",
      code: isKeyboard ? valueOrDash(event.code) : "—",
      keyCode: isKeyboard ? Number(event.keyCode || 0) : 0,
      which: isKeyboard ? Number(event.which || 0) : 0,
      repeat: isKeyboard ? Boolean(event.repeat) : false,
      altKey: isKeyboard ? Boolean(event.altKey) : false,
      ctrlKey: isKeyboard ? Boolean(event.ctrlKey) : false,
      shiftKey: isKeyboard ? Boolean(event.shiftKey) : false,
      metaKey: isKeyboard ? Boolean(event.metaKey) : false,
      normalized: isKeyboard ? normalizeKey(event) : "—",
      eventTimeStamp: typeof event.timeStamp === "number" ? event.timeStamp : 0,
      focusedElement: describeElement(document.activeElement),
      target: describeElement(event.target),
      visibilityState: document.visibilityState || "non disponibile"
    };

    if (event.type === "popstate") {
      try {
        record.state = JSON.stringify(event.state);
      } catch (error) {
        record.state = "non serializzabile";
      }
    }

    return record;
  }

  function updateObservedCode(record) {
    var codeKey;
    var entry;

    if ((record.type !== "keydown" && record.type !== "keyup") || !record.keyCode) {
      return;
    }

    codeKey = String(record.keyCode);
    entry = observedCodes[codeKey] || {
      keyCode: record.keyCode,
      key: record.key,
      normalized: record.normalized,
      count: 0
    };
    entry.key = record.key;
    entry.normalized = record.normalized;
    entry.count += 1;
    observedCodes[codeKey] = entry;
  }

  function recordEvent(event) {
    var record = makeEventRecord(event);

    events.unshift(record);
    if (events.length > MAX_EVENTS) {
      events.length = MAX_EVENTS;
    }
    updateObservedCode(record);
    saveStoredValues();
    renderLatest(record);
    renderHistory();
    renderObservedCodes();
    renderEnvironment();
  }

  function appendDefinition(list, label, value) {
    var term = document.createElement("dt");
    var definition = document.createElement("dd");
    term.textContent = label;
    definition.textContent = valueOrDash(value);
    list.appendChild(term);
    list.appendChild(definition);
  }

  function renderLatest(record) {
    eventDataElement.textContent = "";

    if (!record) {
      eventNameElement.textContent = "In attesa del primo evento";
      appendDefinition(eventDataElement, "Tipo", "—");
      appendDefinition(eventDataElement, "event.isTrusted", "—");
      appendDefinition(eventDataElement, "Nome normalizzato", "—");
      appendDefinition(eventDataElement, "event.key", "—");
      appendDefinition(eventDataElement, "event.code", "—");
      appendDefinition(eventDataElement, "keyCode", "—");
      appendDefinition(eventDataElement, "which", "—");
      appendDefinition(eventDataElement, "repeat", "—");
      appendDefinition(eventDataElement, "altKey", "—");
      appendDefinition(eventDataElement, "ctrlKey", "—");
      appendDefinition(eventDataElement, "shiftKey", "—");
      appendDefinition(eventDataElement, "metaKey", "—");
      appendDefinition(eventDataElement, "Elemento focalizzato", "—");
      appendDefinition(eventDataElement, "Target", "—");
      appendDefinition(eventDataElement, "Timestamp", "—");
      appendDefinition(eventDataElement, "event.timeStamp", "—");
      return;
    }

    eventNameElement.textContent = record.type + (record.normalized !== "—" ? " — " + record.normalized : "");
    appendDefinition(eventDataElement, "Tipo", record.type);
    appendDefinition(eventDataElement, "event.isTrusted", booleanLabel(record.isTrusted));
    appendDefinition(eventDataElement, "Nome normalizzato", record.normalized);
    appendDefinition(eventDataElement, "event.key", record.key);
    appendDefinition(eventDataElement, "event.code", record.code);
    appendDefinition(eventDataElement, "keyCode", record.keyCode);
    appendDefinition(eventDataElement, "which", record.which);
    appendDefinition(eventDataElement, "repeat", booleanLabel(record.repeat));
    appendDefinition(eventDataElement, "altKey", booleanLabel(record.altKey));
    appendDefinition(eventDataElement, "ctrlKey", booleanLabel(record.ctrlKey));
    appendDefinition(eventDataElement, "shiftKey", booleanLabel(record.shiftKey));
    appendDefinition(eventDataElement, "metaKey", booleanLabel(record.metaKey));
    appendDefinition(eventDataElement, "Elemento focalizzato", record.focusedElement);
    appendDefinition(eventDataElement, "Target", record.target);
    appendDefinition(eventDataElement, "Timestamp", record.timestamp);
    appendDefinition(eventDataElement, "event.timeStamp", record.eventTimeStamp);
    if (record.state !== undefined) {
      appendDefinition(eventDataElement, "popstate.state", record.state);
    }
    if (record.type === "visibilitychange") {
      appendDefinition(eventDataElement, "visibilityState", record.visibilityState);
    }
  }

  function fullscreenSupport() {
    var standard = Boolean(document.fullscreenEnabled || document.documentElement.requestFullscreen);
    var webkit = Boolean(document.webkitFullscreenEnabled || document.documentElement.webkitRequestFullscreen);

    if (standard && webkit) {
      return "Sì (standard e webkit)";
    }
    if (standard) {
      return "Sì (standard)";
    }
    if (webkit) {
      return "Sì (webkit)";
    }
    return "No";
  }

  function getEnvironmentData() {
    return {
      userAgent: navigator.userAgent || "non disponibile",
      viewport: window.innerWidth + " × " + window.innerHeight,
      documentClientWidth: document.documentElement.clientWidth,
      documentClientHeight: document.documentElement.clientHeight,
      fullscreen: fullscreenSupport(),
      mediaSession: Boolean(navigator.mediaSession),
      tizen: typeof window.tizen !== "undefined",
      webapis: typeof window.webapis !== "undefined"
    };
  }

  function renderEnvironment() {
    var environment = getEnvironmentData();
    userAgentElement.textContent = environment.userAgent;
    environmentElement.textContent = "";
    appendDefinition(environmentElement, "Viewport", environment.viewport);
    appendDefinition(environmentElement, "clientWidth", environment.documentClientWidth);
    appendDefinition(environmentElement, "clientHeight", environment.documentClientHeight);
    appendDefinition(environmentElement, "Fullscreen", environment.fullscreen);
    appendDefinition(environmentElement, "navigator.mediaSession", environment.mediaSession ? "presente" : "assente");
    appendDefinition(environmentElement, "window.tizen", environment.tizen ? "presente" : "assente");
    appendDefinition(environmentElement, "window.webapis", environment.webapis ? "presente" : "assente");
  }

  function historyLine(record) {
    var parts = [record.time, record.type, "trusted=" + booleanLabel(record.isTrusted)];

    if (record.key !== "—") {
      parts.push("key=" + record.key);
      parts.push("code=" + record.code);
      parts.push("keyCode=" + record.keyCode);
      parts.push("nome=" + record.normalized);
    } else {
      parts.push("target=" + record.target);
    }
    return parts.join(" | ");
  }

  function renderHistory() {
    var index;
    var item;

    historyElement.textContent = "";
    if (!events.length) {
      item = document.createElement("li");
      item.textContent = "Nessun evento registrato.";
      historyElement.appendChild(item);
      return;
    }

    for (index = 0; index < events.length; index += 1) {
      item = document.createElement("li");
      item.textContent = historyLine(events[index]);
      historyElement.appendChild(item);
    }
  }

  function renderObservedCodes() {
    var keys = Object.keys(observedCodes);
    var index;
    var entry;
    var row;
    var cell;

    keys.sort(function (a, b) {
      return Number(a) - Number(b);
    });
    keycodeBodyElement.textContent = "";

    if (!keys.length) {
      row = document.createElement("tr");
      cell = document.createElement("td");
      cell.colSpan = 4;
      cell.className = "tv-test-empty";
      cell.textContent = "Nessun keyCode osservato.";
      row.appendChild(cell);
      keycodeBodyElement.appendChild(row);
      return;
    }

    for (index = 0; index < keys.length; index += 1) {
      entry = observedCodes[keys[index]];
      row = document.createElement("tr");
      appendTableCell(row, entry.keyCode);
      appendTableCell(row, entry.key);
      appendTableCell(row, entry.normalized);
      appendTableCell(row, entry.count);
      keycodeBodyElement.appendChild(row);
    }
  }

  function appendTableCell(row, value) {
    var cell = document.createElement("td");
    cell.textContent = valueOrDash(value);
    row.appendChild(cell);
  }

  function exportData() {
    return {
      exportedAt: new Date().toISOString(),
      userAgent: navigator.userAgent || "non disponibile",
      environment: getEnvironmentData(),
      events: events,
      observedKeyCodes: observedCodes
    };
  }

  function resultsAsText() {
    var environment = getEnvironmentData();
    var lines = [
      "TVoid — Test telecomando",
      "User Agent: " + environment.userAgent,
      "Viewport: " + environment.viewport,
      "documentElement.clientWidth: " + environment.documentClientWidth,
      "documentElement.clientHeight: " + environment.documentClientHeight,
      "Fullscreen: " + environment.fullscreen,
      "navigator.mediaSession: " + (environment.mediaSession ? "presente" : "assente"),
      "window.tizen: " + (environment.tizen ? "presente" : "assente"),
      "window.webapis: " + (environment.webapis ? "presente" : "assente"),
      "",
      "Eventi osservati (più recenti per primi):"
    ];
    var index;

    for (index = 0; index < events.length; index += 1) {
      lines.push(historyLine(events[index]));
    }
    return lines.join("\n");
  }

  function showOutput(text, message) {
    outputElement.value = text;
    outputElement.className = "tv-test-output tv-test-output-visible";
    outputElement.focus();
    outputElement.select();
    setStatus(message);
  }

  function setStatus(message) {
    statusElement.textContent = message || "";
  }

  function clearLog() {
    events = [];
    observedCodes = {};
    saveStoredValues();
    renderLatest(null);
    renderHistory();
    renderObservedCodes();
    outputElement.value = "";
    outputElement.className = "tv-test-output";
    setStatus("Registro cancellato.");
  }

  function copyResults() {
    var text = resultsAsText();

    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(text).then(function () {
        setStatus("Risultati copiati negli appunti.");
      }, function () {
        showOutput(text, "Copia automatica non disponibile: seleziona e copia il testo qui sotto.");
      });
      return;
    }

    showOutput(text, "Clipboard API non disponibile: seleziona e copia il testo qui sotto.");
  }

  function downloadJson() {
    var json = JSON.stringify(exportData(), null, 2);
    var link;
    var url;

    if (window.Blob && window.URL && typeof window.URL.createObjectURL === "function") {
      try {
        link = document.createElement("a");
        if ("download" in link) {
          url = window.URL.createObjectURL(new Blob([json], { type: "application/json" }));
          link.href = url;
          link.download = "tvoid-tv-test.json";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.setTimeout(function () {
            window.URL.revokeObjectURL(url);
          }, 1000);
          setStatus("Esportazione JSON avviata.");
          return;
        }
      } catch (error) {
        showOutput(json, "Download non disponibile: copia il JSON dalla textarea.");
        return;
      }
    }

    showOutput(json, "Download non supportato: copia il JSON dalla textarea.");
  }

  function handleKeyboard(event) {
    var normalized = normalizeKey(event);
    var focused = document.activeElement;

    if (shouldPreventKey(normalized)) {
      event.preventDefault();
    }

    recordEvent(event);

    if (event.type === "keydown" && !event.repeat &&
        (normalized === "Enter / OK" || normalized === "Space") &&
        focused && focused.tagName === "BUTTON") {
      focused.click();
    }
  }

  document.addEventListener("keydown", handleKeyboard, false);
  document.addEventListener("keyup", handleKeyboard, false);
  document.addEventListener("click", recordEvent, true);
  document.addEventListener("focus", recordEvent, true);
  document.addEventListener("blur", recordEvent, true);
  window.addEventListener("popstate", recordEvent, false);
  document.addEventListener("visibilitychange", recordEvent, false);
  window.addEventListener("resize", renderEnvironment, false);

  clearButton.addEventListener("click", clearLog, false);
  copyButton.addEventListener("click", copyResults, false);
  exportButton.addEventListener("click", downloadJson, false);

  renderEnvironment();
  renderHistory();
  renderObservedCodes();
  renderLatest(events.length ? events[0] : null);
}());
