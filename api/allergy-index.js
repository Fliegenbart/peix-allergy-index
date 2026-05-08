const {
  REGIONS,
  airQualityFromOpenMeteo,
  buildDemoSignals,
  buildGoogleDemandSignals,
  buildNeutralDemand,
  buildSnapshot,
  parseDwdPollen,
  parseGoogleTrendsRss,
  scoreGoogleDemand,
  weatherFromOpenMeteo,
} = require("../lib/allergy-index");

const DWD_POLLEN_URL =
  "https://opendata.dwd.de/climate_environment/health/alerts/s31fg.json";
const GOOGLE_TRENDS_RSS_URL = "https://trends.google.com/trending/rss?geo=DE";

module.exports = async function handler(request, response) {
  const targetDate = resolveTargetDate(request.query && request.query.date);
  const generatedAt = new Date().toISOString();
  const sourceStatus = [];

  let pollen = [];
  let weather = [];
  let airQuality = [];
  let demand = buildNeutralDemand(targetDate);

  try {
    const dwdJson = await fetchJson(DWD_POLLEN_URL, 4000);
    pollen = parseDwdPollen(dwdJson, "tomorrow");
    sourceStatus.push({
      source: "DWD_POLLEN",
      status: "live",
      updatedAt: dwdJson.last_update || null,
      nextUpdate: dwdJson.next_update || null,
    });
  } catch (error) {
    sourceStatus.push({
      source: "DWD_POLLEN",
      status: "fallback",
      message: error.message,
    });
  }

  const weatherResults = await Promise.allSettled(
    REGIONS.map((region) => fetchWeather(region, targetDate))
  );
  weather = weatherResults
    .map((result) => (result.status === "fulfilled" ? result.value : null))
    .filter(Boolean);
  sourceStatus.push({
    source: "OPEN_METEO_WEATHER",
    status: weather.length >= 8 ? "live" : "partial",
    regionCount: weather.length,
  });

  const airResults = await Promise.allSettled(
    REGIONS.map((region) => fetchAirQuality(region, targetDate))
  );
  airQuality = airResults
    .map((result) => (result.status === "fulfilled" ? result.value : null))
    .filter(Boolean);
  sourceStatus.push({
    source: "OPEN_METEO_AIR_QUALITY",
    status: airQuality.length >= 8 ? "live" : "partial",
    regionCount: airQuality.length,
  });

  try {
    const googleTrendsXml = await fetchText(GOOGLE_TRENDS_RSS_URL, 4000);
    const googleDemand = scoreGoogleDemand(parseGoogleTrendsRss(googleTrendsXml));
    demand = buildGoogleDemandSignals(targetDate, googleDemand);
    sourceStatus.push({
      source: "GOOGLE_TRENDS_RSS",
      status: "live",
      score: googleDemand.score,
      matchedTopicCount: googleDemand.matchedItemCount,
      message: googleDemand.matchedTopics.length
        ? `Matched: ${googleDemand.matchedTopics.join(", ")}`
        : "No allergy term is trending nationally right now.",
    });
  } catch (error) {
    sourceStatus.push({
      source: "GOOGLE_TRENDS_RSS",
      status: "fallback",
      message: error.message,
    });
  }

  if (!pollen.length && !weather.length && !airQuality.length) {
    const demo = buildDemoSignals(targetDate);
    pollen = demo.pollen;
    weather = demo.weather;
    airQuality = demo.airQuality;
    demand = demo.demand;
    sourceStatus.push({
      source: "DEMO_FALLBACK",
      status: "fallback",
      message: "External public sources were unavailable.",
    });
  }

  const snapshot = buildSnapshot({
    generatedAt,
    targetDate,
    pollen,
    weather,
    airQuality,
    demand,
    sourceStatus,
  });

  response.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=1800");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.status(200).json(snapshot);
};

async function fetchWeather(region, targetDate) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", region.latitude);
  url.searchParams.set("longitude", region.longitude);
  url.searchParams.set(
    "daily",
    "temperature_2m_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max"
  );
  url.searchParams.set("hourly", "relative_humidity_2m");
  url.searchParams.set("forecast_days", "3");
  url.searchParams.set("timezone", "Europe/Berlin");

  const payload = await fetchJson(url.toString(), 3500);
  return weatherFromOpenMeteo(region, payload, targetDate);
}

async function fetchAirQuality(region, targetDate) {
  const url = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
  url.searchParams.set("latitude", region.latitude);
  url.searchParams.set("longitude", region.longitude);
  url.searchParams.set("hourly", "pm10,pm2_5,nitrogen_dioxide,ozone");
  url.searchParams.set("forecast_days", "3");
  url.searchParams.set("timezone", "Europe/Berlin");

  const payload = await fetchJson(url.toString(), 3500);
  return airQualityFromOpenMeteo(region, payload, targetDate);
}

async function fetchJson(url, timeoutMs) {
  const text = await fetchText(url, timeoutMs);
  return JSON.parse(text);
}

async function fetchText(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const result = await fetch(url, { signal: controller.signal });
    if (!result.ok) {
      throw new Error(`${result.status} ${result.statusText}`);
    }
    return await result.text();
  } finally {
    clearTimeout(timeout);
  }
}

function resolveTargetDate(value) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return tomorrow.toISOString().slice(0, 10);
}
