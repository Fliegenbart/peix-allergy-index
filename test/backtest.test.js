const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildBacktestReport,
  parseOutcomeCsv,
  pearson,
  precisionAtK,
} = require("../lib/backtest");

test("parseOutcomeCsv reads date region metric and numeric value", () => {
  const rows = parseOutcomeCsv(`date,regionCode,metric,value
2026-05-09,NW,pharmacy_sellout,120
2026-05-09,HH,pharmacy_sellout,40
`);

  assert.equal(rows.length, 2);
  assert.equal(rows[0].regionCode, "NW");
  assert.equal(rows[0].value, 120);
});

test("pearson returns positive correlation for aligned index and outcomes", () => {
  assert.equal(pearson([10, 20, 30], [1, 2, 3]), 1);
});

test("precisionAtK measures overlap between top forecast and top outcome regions", () => {
  const score = precisionAtK(["NW", "BY", "HH"], ["BY", "NW", "BE"], 2);

  assert.equal(score, 1);
});

test("buildBacktestReport joins snapshots to outcomes and computes lift", () => {
  const snapshots = [
    {
      snapshot: {
        targetDate: "2026-05-09",
        rankings: [
          {
            regionCode: "NW",
            mediaIndex: 90,
            componentScores: { pollen: 80 },
          },
          {
            regionCode: "HH",
            mediaIndex: 30,
            componentScores: { pollen: 20 },
          },
          {
            regionCode: "BY",
            mediaIndex: 60,
            componentScores: { pollen: 55 },
          },
        ],
      },
    },
  ];
  const outcomes = parseOutcomeCsv(`date,regionCode,metric,value
2026-05-09,NW,pharmacy_sellout,140
2026-05-09,BY,pharmacy_sellout,90
2026-05-09,HH,pharmacy_sellout,20
`);

  const report = buildBacktestReport({ snapshots, outcomes, metric: "pharmacy_sellout" });

  assert.equal(report.status, "ready");
  assert.equal(report.matchedRows, 3);
  assert.equal(report.topK, 1);
  assert.equal(report.topIndexRegions[0], "NW");
  assert.equal(report.topIndexLift > 1, true);
  assert.equal(report.pearsonMediaIndex > 0.9, true);
});
