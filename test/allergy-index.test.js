const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildSnapshot,
  buildGoogleDemandSignals,
  getMethodology,
  INDEX_COMPONENT_WEIGHTS,
  parseApproxTraffic,
  parseDwdIndex,
  parseDwdPollen,
  parseGoogleTrendsRss,
  scoreGoogleDemand,
  scoreWeather,
} = require("../lib/allergy-index");

test("parseDwdIndex turns DWD ranges into numeric pressure", () => {
  assert.equal(parseDwdIndex("0-1"), 0.5);
  assert.equal(parseDwdIndex("2-3"), 2.5);
  assert.equal(parseDwdIndex("3"), 3);
  assert.equal(parseDwdIndex(""), 0);
});

test("index component weights are explicit MVP priors and sum to one", () => {
  const totalWeight = Object.values(INDEX_COMPONENT_WEIGHTS).reduce(
    (sum, component) => sum + component.weight,
    0
  );

  assert.equal(Math.round(totalWeight * 100), 100);
  assert.equal(INDEX_COMPONENT_WEIGHTS.pollen.calibrationStatus, "mvp_prior");
  assert.equal(INDEX_COMPONENT_WEIGHTS.weather.calibrationStatus, "mvp_prior");
  assert.equal(INDEX_COMPONENT_WEIGHTS.demand.calibrationStatus, "mvp_prior");
});

test("snapshot exposes methodology so clients see that weights are not validated yet", () => {
  const snapshot = buildSnapshot({
    targetDate: "2026-05-09",
    sourceStatus: [{ source: "DWD_POLLEN", status: "live" }],
  });

  assert.equal(snapshot.methodology.version, "mvp_prior_v1");
  assert.equal(snapshot.methodology.validationStatus, "heuristic_not_yet_backtested");
  assert.equal(snapshot.methodology.components.pollen.weightPct, 45);
  assert.equal(snapshot.methodology.backtestRequiredBeforeAutomation, true);
});

test("methodology includes evidence rationale and calibration roadmap", () => {
  const methodology = getMethodology();

  assert.equal(methodology.components.airQuality.weightPct, 15);
  assert.equal(methodology.components.airQuality.evidenceLevel, "mechanistic_support");
  assert.equal(methodology.calibrationRoadmap.length >= 3, true);
  assert.equal(methodology.calibrationTargets.includes("pharmacy_sellout"), true);
});

test("parseDwdPollen maps DWD combined regions onto Bundesland rows", () => {
  const pollen = parseDwdPollen({
    content: [
      {
        region_name: "Brandenburg und Berlin",
        partregion_name: "Berlin",
        Pollen: {
          Birke: { tomorrow: "3" },
          Graeser: { tomorrow: "1" },
        },
      },
    ],
  });

  const berlin = pollen.find((row) => row.regionCode === "BE");
  const brandenburg = pollen.find((row) => row.regionCode === "BB");

  assert.equal(berlin.pollenType, "Birke");
  assert.equal(berlin.index03, 3);
  assert.equal(brandenburg.index03, 3);
});

test("rain brake suppresses media spend even when pollen is high", () => {
  const result = buildSnapshot({
    targetDate: "2026-05-09",
    sourceStatus: [{ source: "DWD_POLLEN", status: "live" }],
    pollen: [
      {
        regionCode: "HH",
        regionName: "Hamburg",
        targetDate: "2026-05-09",
        pollenType: "Birke",
        index03: 3,
        source: "DWD_POLLEN",
      },
    ],
    weather: [
      {
        regionCode: "HH",
        targetDate: "2026-05-09",
        rainMm: 8,
        precipitationProbability: 88,
        windKmh: 12,
        temperatureC: 18,
        humidityPct: 89,
      },
    ],
  });

  const hamburg = result.rankings.find((row) => row.regionCode === "HH");
  assert.equal(hamburg.rainBrake, true);
  assert.equal(hamburg.action, "pause");
  assert.equal(hamburg.mediaIndex < 50, true);
});

test("strong pollen plus dry weather produces a boost signal", () => {
  const result = buildSnapshot({
    targetDate: "2026-05-09",
    sourceStatus: [
      { source: "DWD_POLLEN", status: "live" },
      { source: "OPEN_METEO_WEATHER", status: "live" },
      { source: "OPEN_METEO_AIR_QUALITY", status: "live" },
    ],
    pollen: [
      {
        regionCode: "SN",
        regionName: "Sachsen",
        targetDate: "2026-05-09",
        pollenType: "Birke",
        index03: 3,
        source: "DWD_POLLEN",
      },
    ],
    weather: [
      {
        regionCode: "SN",
        targetDate: "2026-05-09",
        rainMm: 0,
        precipitationProbability: 5,
        windKmh: 18,
        temperatureC: 21,
        humidityPct: 42,
      },
    ],
    airQuality: [
      {
        regionCode: "SN",
        targetDate: "2026-05-09",
        pm10: 45,
        pm25: 22,
        no2: 48,
        ozone: 105,
      },
    ],
    demand: [
      {
        regionCode: "SN",
        targetDate: "2026-05-09",
        searchInterest: 72,
        searchDelta: 18,
      },
    ],
  });

  assert.equal(result.rankings[0].regionCode, "SN");
  assert.equal(result.rankings[0].action, "boost");
  assert.equal(result.rankings[0].compliance.personalHealthDataUsed, false);
});

test("scoreWeather recognises low-rain dry pollen weather", () => {
  const result = scoreWeather({
    rainMm: 0,
    precipitationProbability: 5,
    windKmh: 18,
    temperatureC: 21,
    humidityPct: 42,
  });

  assert.equal(result.rainBrake, false);
  assert.equal(result.score >= 90, true);
});

test("parseGoogleTrendsRss extracts Google trending topics and traffic", () => {
  const items = parseGoogleTrendsRss(`
    <rss xmlns:ht="https://trends.google.com/trending/rss">
      <channel>
        <item>
          <title>Pollenflug heute</title>
          <ht:approx_traffic>2K+</ht:approx_traffic>
          <pubDate>Fri, 8 May 2026 04:30:00 -0700</pubDate>
          <ht:news_item>
            <ht:news_item_title>Heuschnupfen-Saison startet</ht:news_item_title>
          </ht:news_item>
        </item>
      </channel>
    </rss>
  `);

  assert.equal(items.length, 1);
  assert.equal(items[0].title, "Pollenflug heute");
  assert.equal(items[0].approxTraffic, 2000);
  assert.equal(items[0].newsTitles[0], "Heuschnupfen-Saison startet");
});

test("scoreGoogleDemand raises demand when allergy terms trend on Google", () => {
  const demand = scoreGoogleDemand([
    {
      title: "Pollenflug heute",
      approxTraffic: 2000,
      newsTitles: ["Heuschnupfen-Saison startet"],
    },
    {
      title: "Champions League",
      approxTraffic: 10000,
      newsTitles: [],
    },
  ]);

  assert.equal(demand.score > 50, true);
  assert.deepEqual(demand.matchedTopics, ["Pollenflug heute"]);
  assert.equal(demand.source, "GOOGLE_TRENDS_RSS");
});

test("buildGoogleDemandSignals creates regional demand rows from one Google signal", () => {
  const rows = buildGoogleDemandSignals("2026-05-09", {
    score: 68,
    delta: 18,
    source: "GOOGLE_TRENDS_RSS",
    matchedTopics: ["Pollenflug heute"],
  });

  assert.equal(rows.length >= 16, true);
  assert.equal(rows[0].targetDate, "2026-05-09");
  assert.equal(rows[0].searchInterest, 68);
  assert.equal(rows[0].source, "GOOGLE_TRENDS_RSS");
});

test("parseApproxTraffic handles Google traffic suffixes", () => {
  assert.equal(parseApproxTraffic("200+"), 200);
  assert.equal(parseApproxTraffic("2K+"), 2000);
  assert.equal(parseApproxTraffic("1.5M+"), 1500000);
});
