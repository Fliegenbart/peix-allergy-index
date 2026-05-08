#!/usr/bin/env node

const path = require("node:path");

const { buildLiveSnapshot, resolveTargetDate } = require("../lib/live-snapshot");
const { writeSnapshot } = require("../lib/snapshot-store");

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outputDir = path.resolve(args["output-dir"] || "data/snapshots");
  const targetDate = resolveTargetDate(args["target-date"]);
  const snapshot = await buildLiveSnapshot({ targetDate });
  const result = writeSnapshot(snapshot, { directory: outputDir });

  console.log(
    JSON.stringify(
      {
        ok: true,
        file: result.path,
        targetDate: snapshot.targetDate,
        generatedAt: snapshot.generatedAt,
        regionCount: snapshot.rankings.length,
        qualityGate: snapshot.qualityGate.status,
      },
      null,
      2
    )
  );
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

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
