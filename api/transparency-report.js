const { buildLiveSnapshot, resolveTargetDate } = require("../lib/live-snapshot");
const { buildTransparencyReport } = require("../lib/allergy-index");

module.exports = async function handler(request, response) {
  const targetDate = resolveTargetDate(request.query && request.query.date);
  const format = request.query && request.query.format;
  const snapshot = await buildLiveSnapshot({ targetDate });
  const report = buildTransparencyReport(snapshot);

  response.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=1800");

  if (format === "text") {
    response.setHeader("Content-Type", "text/plain; charset=utf-8");
    response.status(200).send(formatAsText(report));
  } else {
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.status(200).json(report);
  }
};

function formatAsText(report) {
  const lines = [];
  lines.push("=".repeat(70));
  lines.push("PEIX ALLERGY MEDIA TRANSPARENCY REPORT");
  lines.push("=".repeat(70));
  lines.push("");
  lines.push(`Erstellt: ${report.generatedAt}`);
  lines.push(`Zieldatum: ${report.targetDate}`);
  lines.push("");
  lines.push("-".repeat(70));
  lines.push("ZUSAMMENFASSUNG");
  lines.push("-".repeat(70));
  lines.push(`BOOST Regionen (${report.summary.boostRegions.length}): ${report.summary.boostRegions.join(", ") || "keine"}`);
  lines.push(`PREPARE Regionen (${report.summary.prepareRegions.length}): ${report.summary.prepareRegions.join(", ") || "keine"}`);
  lines.push(`HOLD Regionen (${report.summary.holdRegions.length}): ${report.summary.holdRegions.join(", ") || "keine"}`);
  lines.push(`PAUSE Regionen (${report.summary.pauseRegions.length}): ${report.summary.pauseRegions.join(", ") || "keine"}`);
  lines.push("");
  lines.push(`Durchschnittliche Budget-Empfehlung: ${report.summary.averageBudgetShiftPct >= 0 ? "+" : ""}${report.summary.averageBudgetShiftPct}%`);
  lines.push("");
  lines.push("-".repeat(70));
  lines.push("DATENSCHUTZ");
  lines.push("-".repeat(70));
  lines.push(report.privacyStatement.description);
  lines.push("");
  lines.push("-".repeat(70));
  lines.push("REGIONALE BEGRÜNDUNGEN");
  lines.push("-".repeat(70));

  for (const region of report.regions) {
    lines.push("");
    lines.push(region.rationale);
    lines.push("-".repeat(40));
  }

  lines.push("");
  lines.push("=".repeat(70));
  lines.push(`Methodik: ${report.methodology.version}`);
  lines.push(report.methodology.note);
  lines.push("=".repeat(70));

  return lines.join("\n");
}
