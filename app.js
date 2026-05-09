const state = {
  snapshot: null,
  validation: null,
  selectedRegionCode: null,
  flow: {
    animationFrame: null,
    particles: [],
    selected: null,
    started: false,
  },
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
  methodologyStatus: document.querySelector("#methodologyStatus"),
  methodologySummary: document.querySelector("#methodologySummary"),
  methodologyVersion: document.querySelector("#methodologyVersion"),
  methodologyWeights: document.querySelector("#methodologyWeights"),
  validationStatus: document.querySelector("#validationStatus"),
  validationState: document.querySelector("#validationState"),
  validationNote: document.querySelector("#validationNote"),
  validationSnapshotCount: document.querySelector("#validationSnapshotCount"),
  validationLatest: document.querySelector("#validationLatest"),
  validationOutcomeRows: document.querySelector("#validationOutcomeRows"),
  validationCorrelation: document.querySelector("#validationCorrelation"),
  validationLift: document.querySelector("#validationLift"),
  validationPrecision: document.querySelector("#validationPrecision"),
  privacyMode: document.querySelector("#privacyMode"),
  flowCanvas: document.querySelector("#flowCanvas"),
  flowRegion: document.querySelector("#flowRegion"),
  flowAction: document.querySelector("#flowAction"),
  flowScore: document.querySelector("#flowScore"),
  flowMeta: document.querySelector("#flowMeta"),
};

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

elements.refreshButton.addEventListener("click", () => {
  loadSnapshot();
});

window.addEventListener("resize", () => {
  resizeFlowCanvas();
});

loadSnapshot();

async function loadSnapshot() {
  elements.qualityStatus.textContent = "Loading";
  elements.validationStatus.textContent = "Loading";
  elements.rankingList.innerHTML = '<div class="empty-state">Loading allergy media index...</div>';

  try {
    const ts = Date.now();
    const [snapshot, validation] = await Promise.all([
      fetchJson(`/api/allergy-index?ts=${ts}`),
      fetchJson(`/api/validation?ts=${ts}`).catch((error) => ({
        status: "unavailable",
        machineState: "validation_api_unavailable",
        snapshotCount: 0,
        outcomeRows: 0,
        error: error.message,
        report: {},
      })),
    ]);

    state.snapshot = snapshot;
    state.validation = validation;
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
  renderMethodology(snapshot.methodology);
  renderValidation(state.validation);
  renderFlowReadout(selected);
  startFlowAnimation(selected);
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json();
}

function regionRow(row, index) {
  const isActive = row.regionCode === state.selectedRegionCode ? " active" : "";
  return `
    <button class="region-row${isActive}" data-region="${row.regionCode}" type="button">
      <span class="region-main">
        <span class="region-name">${index + 1}. ${escapeHtml(row.regionName)}</span>
        <span class="subtle">${escapeHtml(row.regionCode)} / ${escapeHtml(
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
  elements.channelPlan.innerHTML = row.channelPlan
    .map((item) => `<li>${escapeHtml(formatToken(item))}</li>`)
    .join("");
  elements.sourceTrace.innerHTML = row.sourceTrace
    .map((item) => `<li>${escapeHtml(formatToken(item))}</li>`)
    .join("");
}

function renderFlowReadout(row) {
  if (!row) return;
  elements.flowRegion.textContent = `${row.regionName} / ${row.regionCode}`;
  elements.flowAction.textContent = row.action;
  elements.flowAction.className = `action-pill action ${row.action}`;
  elements.flowScore.textContent = row.mediaIndex;
  elements.flowMeta.textContent = `Pollen ${row.componentScores.pollen} / Demand ${row.componentScores.demand}`;
}

function renderSources(sources) {
  elements.sourceStatus.innerHTML = sources
    .map(
      (source) => `
        <article class="source-card">
          <strong>${escapeHtml(formatToken(source.source))}</strong>
          <span>${escapeHtml(source.status)}</span>
          <span>${escapeHtml(
            source.message || source.updatedAt || `${source.regionCount || ""} regions`
          )}</span>
        </article>
      `
    )
    .join("");
}

function renderMethodology(methodology) {
  if (!methodology) return;
  elements.methodologyStatus.textContent =
    methodology.validationStatus === "heuristic_not_yet_backtested"
      ? "mvp prior"
      : methodology.validationStatus;
  elements.methodologySummary.textContent = methodology.summary;
  elements.methodologyVersion.textContent = methodology.version;
  elements.methodologyWeights.innerHTML = Object.entries(methodology.components)
    .map(([key, component]) => {
      return `
        <article class="weight-card">
          <span class="weight-label">${escapeHtml(component.label)}</span>
          <strong>${component.weightPct}%</strong>
          <span class="mini-track"><span style="width:${component.weightPct}%"></span></span>
          <span>${escapeHtml(formatEvidence(component.evidenceLevel))}</span>
        </article>
      `;
    })
    .join("");
}

function renderValidation(summary) {
  if (!summary) return;

  const report = summary.report || {};
  const note =
    summary.error ||
    (Array.isArray(report.notes) && report.notes[0]) ||
    "Ready to compare forecasts with outcome data.";

  elements.validationStatus.textContent = formatToken(summary.status || "unknown");
  elements.validationState.textContent = formatToken(summary.machineState || "unknown");
  elements.validationNote.textContent = note;
  elements.validationSnapshotCount.textContent = formatMetric(summary.snapshotCount);
  elements.validationOutcomeRows.textContent = formatMetric(summary.outcomeRows);
  elements.validationCorrelation.textContent = formatMetric(report.pearsonMediaIndex);
  elements.validationLift.textContent = formatMetric(report.topIndexLift);
  elements.validationPrecision.textContent = formatMetric(report.precisionAtK);
  elements.validationLatest.textContent = summary.latestSnapshot
    ? `latest target ${summary.latestSnapshot.targetDate}`
    : "daily memory";
}

function startFlowAnimation(selected) {
  state.flow.selected = selected;
  resizeFlowCanvas();
  if (!state.flow.particles.length) {
    state.flow.particles = createParticles(86);
  }
  if (state.flow.started && !reducedMotion) {
    return;
  }
  state.flow.started = true;
  drawFlow();
}

function resizeFlowCanvas() {
  const canvas = elements.flowCanvas;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.floor(rect.width * ratio));
  const height = Math.max(1, Math.floor(rect.height * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

function createParticles(count) {
  return Array.from({ length: count }, (_, index) => ({
    x: Math.random(),
    y: Math.random(),
    speed: 0.00045 + Math.random() * 0.0011,
    phase: Math.random() * Math.PI * 2,
    size: 0.8 + Math.random() * 2.4,
    lane: index % 5,
  }));
}

function drawFlow() {
  const canvas = elements.flowCanvas;
  const context = canvas && canvas.getContext("2d");
  if (!canvas || !context) return;

  const width = canvas.width;
  const height = canvas.height;
  const selected = state.flow.selected;
  const intensity = selected ? selected.mediaIndex / 100 : 0.5;
  const pollen = selected ? selected.componentScores.pollen / 100 : 0.5;
  const demand = selected ? selected.componentScores.demand / 100 : 0.5;
  const time = performance.now() * 0.001;

  context.clearRect(0, 0, width, height);
  drawContourLines(context, width, height, time, intensity, pollen);
  drawParticles(context, width, height, time, intensity, demand);

  if (!reducedMotion) {
    state.flow.animationFrame = requestAnimationFrame(drawFlow);
  }
}

function drawContourLines(context, width, height, time, intensity, pollen) {
  const lineCount = 12;
  for (let line = 0; line < lineCount; line += 1) {
    const yBase = height * (0.12 + line * 0.065);
    const amplitude = height * (0.035 + pollen * 0.05);
    const alpha = 0.15 + intensity * 0.2 - line * 0.008;
    context.beginPath();
    for (let step = 0; step <= 150; step += 1) {
      const x = (step / 150) * width;
      const wave =
        Math.sin(step * 0.075 + time * (0.5 + line * 0.04) + line) * amplitude +
        Math.cos(step * 0.04 + time * 0.35) * amplitude * 0.4;
      const y = yBase + wave + Math.sin(line + time * 0.2) * height * 0.025;
      if (step === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }
    const hue = 160 + line * 3;
    context.strokeStyle = `hsla(${hue}, 100%, 60%, ${Math.max(0.04, alpha)})`;
    context.lineWidth = 1 + intensity * 1.8;
    context.shadowColor = `hsla(${hue}, 100%, 50%, 0.5)`;
    context.shadowBlur = 8 + intensity * 12;
    context.stroke();
    context.shadowBlur = 0;
  }

  const gradient = context.createRadialGradient(
    width * 0.5, height * 0.4, 0,
    width * 0.5, height * 0.4, width * 0.5
  );
  gradient.addColorStop(0, `rgba(0, 255, 136, ${0.06 + intensity * 0.08})`);
  gradient.addColorStop(0.5, `rgba(0, 212, 255, ${0.03 + intensity * 0.04})`);
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
}

function drawParticles(context, width, height, time, intensity, demand) {
  const colorA = [0, 255, 136];
  const colorB = [0, 212, 255];
  for (const particle of state.flow.particles) {
    particle.x += particle.speed * (0.6 + intensity * 0.8);
    if (particle.x > 1.05) {
      particle.x = -0.04;
      particle.y = Math.random();
    }
    const curve =
      Math.sin(particle.x * Math.PI * 2 + particle.phase + time * 0.6) * 0.1 +
      Math.cos(time * 0.35 + particle.lane) * 0.02;
    const x = particle.x * width;
    const y = (0.15 + particle.y * 0.7 + curve) * height;
    const mix = particle.lane / 4;
    const rgb = colorA.map((value, index) => Math.round(value * (1 - mix) + colorB[index] * mix));
    const alpha = 0.25 + demand * 0.35;
    const size = particle.size * (window.devicePixelRatio || 1) * (0.8 + intensity * 0.4);

    context.beginPath();
    context.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
    context.shadowColor = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.6)`;
    context.shadowBlur = 6 + intensity * 8;
    context.arc(x, y, size, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;
  }
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

function formatToken(value) {
  return String(value || "").replaceAll("_", " ").toLowerCase();
}

function formatEvidence(value) {
  return formatToken(value).replace("support", "evidence");
}

function formatMetric(value) {
  if (value === null || value === undefined || value === "") return "--";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return String(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
