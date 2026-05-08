const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  listSnapshots,
  snapshotFileName,
  writeSnapshot,
} = require("../lib/snapshot-store");

test("snapshotFileName is stable for generated and target dates", () => {
  const name = snapshotFileName({
    generatedAt: "2026-05-08T07:30:00.000Z",
    targetDate: "2026-05-09",
  });

  assert.equal(name, "snapshot-2026-05-08-for-2026-05-09.json");
});

test("writeSnapshot stores a durable json envelope and listSnapshots reads it", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "peix-snapshots-"));
  const snapshot = {
    generatedAt: "2026-05-08T07:30:00.000Z",
    targetDate: "2026-05-09",
    rankings: [
      {
        regionCode: "NW",
        mediaIndex: 72,
        componentScores: { pollen: 80 },
      },
    ],
  };

  const result = writeSnapshot(snapshot, { directory: dir });
  const stored = JSON.parse(fs.readFileSync(result.path, "utf8"));
  const snapshots = listSnapshots({ directory: dir });

  assert.equal(stored.schemaVersion, "peix_allergy_snapshot_v1");
  assert.equal(stored.targetDate, "2026-05-09");
  assert.equal(stored.regionCount, 1);
  assert.equal(snapshots.length, 1);
  assert.equal(snapshots[0].snapshot.rankings[0].regionCode, "NW");
});
