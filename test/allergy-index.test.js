const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildSnapshot,
  parseDwdIndex,
  parseDwdPollen,
  scoreWeather,
} = require("../lib/allergy-index");

test("parseDwdIndex turns DWD ranges into numeric pressure", () => {
  assert.equal(parseDwdIndex("0-1"), 0.5);
  assert.equal(parseDwdIndex("2-3"), 2.5);
  assert.equal(parseDwdIndex("3"), 3);
  assert.equal(parseDwdIndex(""), 0);
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
