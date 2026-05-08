const fs = require("node:fs");
const path = require("node:path");

const { buildBacktestReport, parseOutcomeCsv } = require("./backtest");
const { listSnapshots } = require("./snapshot-store");

function buildValidationSummary({
  snapshotDirectory = path.join(process.cwd(), "data/snapshots"),
  outcomeFile = path.join(process.cwd(), "data/outcomes/allergy-outcomes.csv"),
  metric = "pharmacy_sellout",
  topK = 3,
} = {}) {
  const snapshots = listSnapshots({ directory: snapshotDirectory });
  const outcomes = readOutcomeRows(outcomeFile);
  const report = buildBacktestReport({ snapshots, outcomes, metric, topK });
  const latestSnapshot = snapshots[snapshots.length - 1];

  return {
    generatedAt: new Date().toISOString(),
    status: report.status,
    machineState: machineStateFor({
      snapshotCount: snapshots.length,
      outcomeRows: outcomes.length,
      reportStatus: report.status,
    }),
    snapshotCount: snapshots.length,
    outcomeRows: outcomes.length,
    metric,
    topK,
    latestSnapshot: latestSnapshot
      ? {
          capturedAt: latestSnapshot.capturedAt,
          targetDate: latestSnapshot.targetDate,
          regionCount: latestSnapshot.regionCount,
          fileName: latestSnapshot.fileName,
        }
      : null,
    report,
    outcomeSchema: {
      requiredColumns: ["date", "regionCode", "metric", "value"],
      example: "2026-05-09,NW,pharmacy_sellout,140",
    },
  };
}

function readOutcomeRows(outcomeFile) {
  if (!fs.existsSync(outcomeFile)) {
    return [];
  }
  return parseOutcomeCsv(fs.readFileSync(outcomeFile, "utf8"));
}

function machineStateFor({ snapshotCount, outcomeRows, reportStatus }) {
  if (!snapshotCount) {
    return "collecting_forecasts";
  }
  if (!outcomeRows) {
    return "awaiting_outcomes";
  }
  if (reportStatus !== "ready") {
    return "needs_more_matches";
  }
  return "backtest_ready";
}

module.exports = {
  buildValidationSummary,
  machineStateFor,
  readOutcomeRows,
};
