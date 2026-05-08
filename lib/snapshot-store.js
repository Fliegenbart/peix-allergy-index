const fs = require("node:fs");
const path = require("node:path");

const SNAPSHOT_SCHEMA_VERSION = "peix_allergy_snapshot_v1";

function snapshotFileName(snapshot) {
  const generatedDate = String(snapshot.generatedAt || "").slice(0, 10);
  const targetDate = String(snapshot.targetDate || "").slice(0, 10);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(generatedDate)) {
    throw new Error("snapshot.generatedAt must contain an ISO date");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    throw new Error("snapshot.targetDate must be YYYY-MM-DD");
  }

  return `snapshot-${generatedDate}-for-${targetDate}.json`;
}

function writeSnapshot(snapshot, { directory = path.join(process.cwd(), "data/snapshots") } = {}) {
  if (!snapshot || typeof snapshot !== "object") {
    throw new Error("snapshot is required");
  }

  fs.mkdirSync(directory, { recursive: true });
  const filePath = path.join(directory, snapshotFileName(snapshot));
  const envelope = {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    capturedAt: snapshot.generatedAt,
    targetDate: snapshot.targetDate,
    regionCount: Array.isArray(snapshot.rankings) ? snapshot.rankings.length : 0,
    snapshot,
  };

  fs.writeFileSync(filePath, `${JSON.stringify(envelope, null, 2)}\n`, "utf8");

  return {
    path: filePath,
    fileName: path.basename(filePath),
    envelope,
  };
}

function listSnapshots({ directory = path.join(process.cwd(), "data/snapshots") } = {}) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs
    .readdirSync(directory)
    .filter((fileName) => fileName.endsWith(".json"))
    .sort()
    .map((fileName) => {
      const filePath = path.join(directory, fileName);
      const envelope = JSON.parse(fs.readFileSync(filePath, "utf8"));
      return {
        path: filePath,
        fileName,
        ...envelope,
      };
    })
    .filter((entry) => entry.schemaVersion === SNAPSHOT_SCHEMA_VERSION && entry.snapshot);
}

module.exports = {
  SNAPSHOT_SCHEMA_VERSION,
  listSnapshots,
  snapshotFileName,
  writeSnapshot,
};
