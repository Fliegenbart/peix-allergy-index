const state = {
  snapshot: null,
  selectedRegionCode: null,
};

const elements = {
  refreshButton: document.querySelector("#refreshButton"),
  qualityStatus: document.querySelector("#qualityStatus"),
  topRegion: document.querySelector("#topRegion"),
  topRegionAction: document.querySelector("#topRegionAction"),
  boostCount: document.querySelector("#boostCount"),
  avgConfidence: document.querySelector("#avgConfidence"),
  targetDate: document.querySelector("#targetDate"),
  generatedAt: document.querySelector("#generatedAt"),
  regionCount: document.querySelector("#regionCount"),
  rankingList: document.querySelector("#rankingList"),
  detailRegion: document.querySelector("#detailRegion"),
  detailAction: document.querySelector("#detailAction"),
  detailScore: document.querySelector("#detailScore"),
  detailScoreBar: document.querySelector("#detailScoreBar"),
  componentPollen: document.querySelector("#componentPollen"),
  componentWeather: document.querySelector("#componentWeather"),
  componentAir: document.querySelector("#componentAir"),
  componentDemand: document.querySelector("#componentDemand"),
  budgetShift: document.querySelector("#budgetShift"),
  channelPlan: document.querySelector("#channelPlan"),
  sourceTrace: document.querySelector("#sourceTrace"),
  sourceStatus: document.querySelector("#sourceStatus"),
  privacyMode: document.querySelector("#privacyMode"),
};

elements.refreshButton.addEventListener("click", () => {
  loadSnapshot();
});

loadSnapshot();

async function loadSnapshot() {
  elements.qualityStatus.textContent = "Loading";
  elements.rankingList.innerHTML = '<div class="empty-state">Loading allergy media index...</div>';

  try {
    const response = await fetch(`/api/allergy-index?ts=${Date.now()}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    state.snapshot = await response.json();
    state.selectedRegionCode =
      state.snapshot.rankings[0] && state.snapshot.rankings[0].regionCode;
    render();
  } catch (error) {
    elements.qualityStatus.textContent = "Error";
    elements.rankingList.innerHTML = `<div class="empty-state">${escapeHtml(
      error.message
    )}</div>`;
  }
}

function render() {
  const snapshot = state.snapshot;
  const top = snapshot.rankings[0];
  const selected =
    snapshot.rankings.find((row) => row.regionCode === state.selectedRegionCode) || top;

  elements.qualityStatus.textContent = snapshot.qualityGate.status;
  elements.topRegion.textContent = top ? top.regionName : "--";
  elements.topRegionAction.textContent = top ? `${top.action} at ${top.mediaIndex}` : "--";
  elements.boostCount.textContent = snapshot.qualityGate.boostRegionCount;
  elements.avgConfidence.textContent = `${snapshot.qualityGate.averageConfidence}%`;
  elements.targetDate.textContent = snapshot.targetDate;
  elements.generatedAt.textContent = shortDateTime(snapshot.generatedAt);
  elements.regionCount.textContent = `${snapshot.qualityGate.regionCount} regions`;
  elements.privacyMode.textContent = snapshot.privacyMode.replaceAll("_", " ");

  elements.rankingList.innerHTML = snapshot.rankings.map(regionRow).join("");
  elements.rankingList.querySelectorAll("[data-region]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedRegionCode = button.dataset.region;
      render();
    });
  });

  renderDetail(selected);
  renderSources(snapshot.sourceStatus);
}

function regionRow(row, index) {
  const isActive = row.regionCode === state.selectedRegionCode ? " active" : "";
  return `
    <button class="region-row${isActive}" data-region="${row.regionCode}" type="button">
      <span class="region-main">
        <span class="region-name">${index + 1}. ${escapeHtml(row.regionName)}</span>
        <span class="subtle">${escapeHtml(row.regionCode)} · ${escapeHtml(
          row.topPollen ? row.topPollen.type : "no pollen"
        )}</span>
      </span>
      <span class="action ${escapeHtml(row.action)}">${escapeHtml(row.action)}</span>
      <span class="metric-line">
        <span class="mini-track"><span style="width:${row.mediaIndex}%"></span></span>
      </span>
      <strong>${row.mediaIndex}</strong>
    </button>
  `;
}

function renderDetail(row) {
  if (!row) return;
  elements.detailRegion.textContent = row.regionName;
  elements.detailAction.textContent = row.action;
  elements.detailAction.className = `action-pill action ${row.action}`;
  elements.detailScore.textContent = row.mediaIndex;
  elements.detailScoreBar.style.width = `${row.mediaIndex}%`;
  elements.componentPollen.textContent = row.componentScores.pollen;
  elements.componentWeather.textContent = row.componentScores.weather;
  elements.componentAir.textContent = row.componentScores.airQuality;
  elements.componentDemand.textContent = row.componentScores.demand;
  elements.budgetShift.textContent = `${signed(row.suggestedBudgetShiftPct)}% budget shift`;
  elements.channelPlan.innerHTML = row.channelPlan.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  elements.sourceTrace.innerHTML = row.sourceTrace.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function renderSources(sources) {
  elements.sourceStatus.innerHTML = sources
    .map(
      (source) => `
        <article class="source-card">
          <strong>${escapeHtml(source.source)}</strong>
          <span>${escapeHtml(source.status)}</span>
          <span>${escapeHtml(source.message || source.updatedAt || `${source.regionCount || ""} regions`)}</span>
        </article>
      `
    )
    .join("");
}

function shortDateTime(value) {
  if (!value) return "--";
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function signed(value) {
  return value > 0 ? `+${value}` : String(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
