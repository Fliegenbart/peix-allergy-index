function parseOutcomeCsv(csvText) {
  const text = String(csvText || "").trim();
  if (!text) {
    return [];
  }

  const rows = parseCsvRows(text);
  const header = rows.shift().map((value) => value.trim());
  const indexes = Object.fromEntries(header.map((name, index) => [name, index]));

  for (const required of ["date", "regionCode", "metric", "value"]) {
    if (!Object.prototype.hasOwnProperty.call(indexes, required)) {
      throw new Error(`Outcome CSV is missing required column: ${required}`);
    }
  }

  return rows
    .map((row) => ({
      date: row[indexes.date],
      regionCode: row[indexes.regionCode],
      metric: row[indexes.metric],
      value: Number(row[indexes.value]),
    }))
    .filter((row) => row.date && row.regionCode && row.metric && Number.isFinite(row.value));
}

function buildBacktestReport({ snapshots = [], outcomes = [], metric, topK = 1 } = {}) {
  const matched = joinSnapshotsToOutcomes({ snapshots, outcomes, metric });
  const matchedRows = matched.length;
  const numericTopK = Math.max(1, Math.floor(Number(topK) || 1));

  const report = {
    status: matchedRows >= 3 ? "ready" : "insufficient_outcome_data",
    metric: metric || "all",
    matchedRows,
    snapshotCount: snapshots.length,
    outcomeRows: outcomes.length,
    topK: numericTopK,
    pearsonMediaIndex: null,
    pearsonPollen: null,
    topIndexLift: null,
    precisionAtK: null,
    topIndexRegions: [],
    topOutcomeRegions: [],
    notes: [],
  };

  if (matchedRows < 3) {
    report.notes.push(
      "Collect daily snapshots and add outcome data before judging the index weights."
    );
    return report;
  }

  report.pearsonMediaIndex = round(
    pearson(
      matched.map((row) => row.mediaIndex),
      matched.map((row) => row.outcomeValue)
    ),
    3
  );
  report.pearsonPollen = round(
    pearson(
      matched.map((row) => row.pollenScore),
      matched.map((row) => row.outcomeValue)
    ),
    3
  );

  const byIndex = [...matched].sort(
    (a, b) => b.mediaIndex - a.mediaIndex || b.outcomeValue - a.outcomeValue
  );
  const byOutcome = [...matched].sort(
    (a, b) => b.outcomeValue - a.outcomeValue || b.mediaIndex - a.mediaIndex
  );
  const effectiveTopK = Math.min(numericTopK, matchedRows);
  const topIndexRows = byIndex.slice(0, effectiveTopK);
  const topOutcomeRows = byOutcome.slice(0, effectiveTopK);
  const averageOutcome =
    matched.reduce((sum, row) => sum + row.outcomeValue, 0) / matchedRows;
  const topIndexOutcome =
    topIndexRows.reduce((sum, row) => sum + row.outcomeValue, 0) / effectiveTopK;

  report.topIndexRegions = topIndexRows.map((row) => row.regionCode);
  report.topOutcomeRegions = topOutcomeRows.map((row) => row.regionCode);
  report.topIndexLift = round(topIndexOutcome / averageOutcome, 3);
  report.precisionAtK = round(
    precisionAtK(report.topIndexRegions, report.topOutcomeRegions, effectiveTopK),
    3
  );
  report.notes.push(
    "This is a transparent validation scaffold. Use more history before changing paid-media budgets automatically."
  );

  return report;
}

function joinSnapshotsToOutcomes({ snapshots, outcomes, metric }) {
  const outcomesByKey = new Map();
  for (const row of outcomes) {
    if (metric && row.metric !== metric) {
      continue;
    }
    outcomesByKey.set(`${row.date}__${row.regionCode}`, row);
  }

  const joined = [];
  for (const stored of snapshots) {
    const snapshot = stored && stored.snapshot ? stored.snapshot : stored;
    const targetDate = snapshot && snapshot.targetDate;
    const rankings = Array.isArray(snapshot && snapshot.rankings) ? snapshot.rankings : [];

    for (const ranking of rankings) {
      const outcome = outcomesByKey.get(`${targetDate}__${ranking.regionCode}`);
      if (!outcome) {
        continue;
      }
      joined.push({
        date: targetDate,
        regionCode: ranking.regionCode,
        mediaIndex: Number(ranking.mediaIndex),
        pollenScore: Number(
          ranking.componentScores && ranking.componentScores.pollen
        ),
        outcomeValue: outcome.value,
      });
    }
  }

  return joined.filter(
    (row) =>
      Number.isFinite(row.mediaIndex) &&
      Number.isFinite(row.pollenScore) &&
      Number.isFinite(row.outcomeValue)
  );
}

function pearson(xs, ys) {
  if (!Array.isArray(xs) || !Array.isArray(ys) || xs.length !== ys.length || xs.length < 2) {
    return null;
  }

  const pairs = xs
    .map((x, index) => [Number(x), Number(ys[index])])
    .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));

  if (pairs.length < 2) {
    return null;
  }

  const xMean = mean(pairs.map(([x]) => x));
  const yMean = mean(pairs.map(([, y]) => y));
  let numerator = 0;
  let xSquare = 0;
  let ySquare = 0;

  for (const [x, y] of pairs) {
    const xDelta = x - xMean;
    const yDelta = y - yMean;
    numerator += xDelta * yDelta;
    xSquare += xDelta * xDelta;
    ySquare += yDelta * yDelta;
  }

  const denominator = Math.sqrt(xSquare * ySquare);
  return denominator === 0 ? null : numerator / denominator;
}

function precisionAtK(predictedRegions, actualRegions, k) {
  const limit = Math.max(1, Math.floor(Number(k) || 1));
  const predicted = predictedRegions.slice(0, limit);
  const actual = new Set(actualRegions.slice(0, limit));
  if (!predicted.length) {
    return 0;
  }

  const hits = predicted.filter((regionCode) => actual.has(regionCode)).length;
  return hits / predicted.length;
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      row.push(cell.trim());
      cell = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(cell.trim());
      if (row.some((value) => value !== "")) {
        rows.push(row);
      }
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }

  row.push(cell.trim());
  if (row.some((value) => value !== "")) {
    rows.push(row);
  }

  return rows;
}

module.exports = {
  buildBacktestReport,
  joinSnapshotsToOutcomes,
  parseOutcomeCsv,
  pearson,
  precisionAtK,
};
