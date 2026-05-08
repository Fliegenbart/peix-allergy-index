const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { buildValidationSummary } = require("../lib/validation");
const { writeSnapshot } = require("../lib/snapshot-store");

test("buildValidationSummary reports collection mode without stored outcomes", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "peix-validation-empty-"));
  const summary = buildValidationSummary({
    snapshotDirectory: path.join(root, "snapshots"),
    outcomeFile: path.join(root, "outcomes.csv"),
  });

  assert.equal(summary.status, "insufficient_outcome_data");
  assert.equal(summary.snapshotCount, 0);
  assert.equal(summary.outcomeRows, 0);
  assert.equal(summary.machineState, "collecting_forecasts");
});

test("buildValidationSummary reads stored snapshots and outcome rows", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "peix-validation-ready-"));
  const snapshotDirectory = path.join(root, "snapshots");
  const outcomeFile = path.join(root, "outcomes.csv");
  writeSnapshot(
    {
      generatedAt: "2026-05-08T07:30:00.000Z",
      targetDate: "2026-05-09",
      rankings: [
        { regionCode: "NW", mediaIndex: 90, componentScores: { pollen: 80 } },
        { regionCode: "BY", mediaIndex: 70, componentScores: { pollen: 65 } },
        { regionCode: "HH", mediaIndex: 20, componentScores: { pollen: 10 } },
      ],
    },
    { directory: snapshotDirectory }
  );
  fs.writeFileSync(
    outcomeFile,
    `date,regionCode,metric,value
2026-05-09,NW,pharmacy_sellout,140
2026-05-09,BY,pharmacy_sellout,80
2026-05-09,HH,pharmacy_sellout,20
`,
    "utf8"
  );

  const summary = buildValidationSummary({
    snapshotDirectory,
    outcomeFile,
    metric: "pharmacy_sellout",
  });

  assert.equal(summary.status, "ready");
  assert.equal(summary.snapshotCount, 1);
  assert.equal(summary.outcomeRows, 3);
  assert.equal(summary.report.topIndexRegions[0], "NW");
});
