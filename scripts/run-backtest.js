#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const { buildBacktestReport, parseOutcomeCsv } = require("../lib/backtest");
const { listSnapshots } = require("../lib/snapshot-store");

function main() {
  const args = parseArgs(process.argv.slice(2));
  const snapshotDirectory = path.resolve(args.snapshots || "data/snapshots");
  const outcomeFile = path.resolve(args.outcomes || "data/outcomes/allergy-outcomes.csv");
  const metric = args.metric || "pharmacy_sellout";
  const format = args.format || "text";

  const snapshots = listSnapshots({ directory: snapshotDirectory });
  const outcomes = fs.existsSync(outcomeFile)
    ? parseOutcomeCsv(fs.readFileSync(outcomeFile, "utf8"))
    : [];
  const report = buildBacktestReport({ snapshots, outcomes, metric, topK: Number(args.topK) || 3 });

  if (format === "json") {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log(`PEIX Allergy Index Backtest`);
  console.log(`Status: ${report.status}`);
  console.log(`Metric: ${report.metric}`);
  console.log(`Snapshots: ${report.snapshotCount}`);
  console.log(`Outcome rows: ${report.outcomeRows}`);
  console.log(`Matched rows: ${report.matchedRows}`);
  console.log(`Pearson media index: ${formatNumber(report.pearsonMediaIndex)}`);
  console.log(`Top-index lift: ${formatNumber(report.topIndexLift)}`);
  console.log(`Precision@${report.topK}: ${formatNumber(report.precisionAtK)}`);
  if (report.notes.length) {
    console.log(`Notes: ${report.notes.join(" ")}`);
  }
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) {
      continue;
    }
    const key = item.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    index += 1;
  }
  return args;
}

function formatNumber(value) {
  return Number.isFinite(value) ? String(value) : "n/a";
}

main();
