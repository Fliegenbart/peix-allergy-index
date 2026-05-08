const POLLEN_TYPES = [
  "Birke",
  "Graeser",
  "Hasel",
  "Erle",
  "Esche",
  "Roggen",
  "Beifuss",
  "Ambrosia",
];

const ALLERGY_DEMAND_TERMS = [
  "allergie",
  "allergien",
  "heuschnupfen",
  "pollen",
  "pollenflug",
  "birke",
  "graeser",
  "gräser",
  "loratadin",
  "cetirizin",
  "antihistamin",
  "nasenspray",
  "augentropfen",
];

const INDEX_COMPONENT_WEIGHTS = {
  pollen: {
    weight: 0.45,
    label: "Pollen pressure",
    evidenceLevel: "direct_domain_signal",
    calibrationStatus: "mvp_prior",
    rationale:
      "DWD pollen hazard and allergy literature treat pollen exposure as the primary allergy pressure signal.",
  },
  weather: {
    weight: 0.25,
    label: "Weather exposure modifier",
    evidenceLevel: "strong_mechanistic_support",
    calibrationStatus: "mvp_prior",
    rationale:
      "Rain, wind, humidity, and temperature modulate airborne pollen exposure and symptom-triggering conditions.",
  },
  airQuality: {
    weight: 0.15,
    label: "Air-quality irritation multiplier",
    evidenceLevel: "mechanistic_support",
    calibrationStatus: "mvp_prior",
    rationale:
      "PM, ozone, and NO2 can aggravate airway irritation and may increase allergenic potency or symptom burden.",
  },
  demand: {
    weight: 0.1,
    label: "Observed demand confirmation",
    evidenceLevel: "digital_proxy_support",
    calibrationStatus: "mvp_prior",
    rationale:
      "Google search signals can proxy allergy demand, but this MVP uses national RSS trends until richer regional Google data is connected.",
  },
  confidence: {
    weight: 0.05,
    label: "Source confidence",
    evidenceLevel: "operational_quality_control",
    calibrationStatus: "mvp_prior",
    rationale:
      "Completeness across independent public signals reduces the risk of activating media from a single noisy source.",
  },
};

const REGIONS = [
  {
    code: "BW",
    name: "Baden-Wuerttemberg",
    latitude: 48.78,
    longitude: 9.18,
    dwdRegion: "Baden-Wuerttemberg",
  },
  {
    code: "BY",
    name: "Bayern",
    latitude: 48.14,
    longitude: 11.58,
    dwdRegion: "Bayern",
  },
  {
    code: "BE",
    name: "Berlin",
    latitude: 52.52,
    longitude: 13.4,
    dwdRegion: "Brandenburg und Berlin",
  },
  {
    code: "BB",
    name: "Brandenburg",
    latitude: 52.4,
    longitude: 13.06,
    dwdRegion: "Brandenburg und Berlin",
  },
  {
    code: "HB",
    name: "Bremen",
    latitude: 53.08,
    longitude: 8.8,
    dwdRegion: "Niedersachsen und Bremen",
  },
  {
    code: "HH",
    name: "Hamburg",
    latitude: 53.55,
    longitude: 10.0,
    dwdRegion: "Schleswig-Holstein und Hamburg",
  },
  {
    code: "HE",
    name: "Hessen",
    latitude: 50.08,
    longitude: 8.24,
    dwdRegion: "Hessen",
  },
  {
    code: "MV",
    name: "Mecklenburg-Vorpommern",
    latitude: 53.63,
    longitude: 11.42,
    dwdRegion: "Mecklenburg-Vorpommern",
  },
  {
    code: "NI",
    name: "Niedersachsen",
    latitude: 52.37,
    longitude: 9.73,
    dwdRegion: "Niedersachsen und Bremen",
  },
  {
    code: "NW",
    name: "Nordrhein-Westfalen",
    latitude: 51.23,
    longitude: 6.78,
    dwdRegion: "Nordrhein-Westfalen",
  },
  {
    code: "RP",
    name: "Rheinland-Pfalz",
    latitude: 49.99,
    longitude: 8.27,
    dwdRegion: "Rheinland-Pfalz und Saarland",
  },
  {
    code: "SL",
    name: "Saarland",
    latitude: 49.24,
    longitude: 6.99,
    dwdRegion: "Rheinland-Pfalz und Saarland",
  },
  {
    code: "SN",
    name: "Sachsen",
    latitude: 51.05,
    longitude: 13.74,
    dwdRegion: "Sachsen",
  },
  {
    code: "ST",
    name: "Sachsen-Anhalt",
    latitude: 52.13,
    longitude: 11.63,
    dwdRegion: "Sachsen-Anhalt",
  },
  {
    code: "SH",
    name: "Schleswig-Holstein",
    latitude: 54.32,
    longitude: 10.13,
    dwdRegion: "Schleswig-Holstein und Hamburg",
  },
  {
    code: "TH",
    name: "Thueringen",
    latitude: 50.98,
    longitude: 11.03,
    dwdRegion: "Thueringen",
  },
];

function buildSnapshot({
  generatedAt = new Date().toISOString(),
  targetDate = isoDateOffset(1),
  pollen = [],
  weather = [],
  airQuality = [],
  demand = [],
  sourceStatus = [],
} = {}) {
  const weatherByRegion = new Map(weather.map((item) => [item.regionCode, item]));
  const airByRegion = new Map(airQuality.map((item) => [item.regionCode, item]));
  const demandByRegion = new Map(demand.map((item) => [item.regionCode, item]));

  const pollenByRegion = new Map();
  for (const item of pollen) {
    const previous = pollenByRegion.get(item.regionCode);
    if (!previous || item.index03 > previous.index03) {
      pollenByRegion.set(item.regionCode, item);
    }
  }

  const rankings = REGIONS.map((region) => {
    const pollenSignal = pollenByRegion.get(region.code);
    const weatherSignal = weatherByRegion.get(region.code);
    const airSignal = airByRegion.get(region.code);
    const demandSignal = demandByRegion.get(region.code);

    return buildRegionDecision({
      region,
      targetDate,
      pollenSignal,
      weatherSignal,
      airSignal,
      demandSignal,
    });
  }).sort((a, b) => b.mediaIndex - a.mediaIndex || b.confidence - a.confidence);

  return {
    generatedAt,
    targetDate,
    product: "PEIX Allergy Media Index",
    scope: "contextual_environmental_region_targeting",
    privacyMode: "no_individual_health_targeting",
    methodology: getMethodology(),
    sourceStatus,
    qualityGate: buildQualityGate(rankings, sourceStatus),
    rankings,
  };
}

function buildRegionDecision({
  region,
  targetDate,
  pollenSignal,
  weatherSignal,
  airSignal,
  demandSignal,
}) {
  const pollenScore = pollenSignal ? clamp((pollenSignal.index03 / 3) * 100) : 0;
  const weatherResult = scoreWeather(weatherSignal);
  const airQualityScore = scoreAirQuality(airSignal);
  const demandScore = scoreDemand(demandSignal);

  const sourceTrace = [
    pollenSignal ? "DWD_POLLEN" : null,
    weatherSignal ? "OPEN_METEO_WEATHER" : null,
    airSignal ? airSignal.source || "PUBLIC_AIR_QUALITY" : null,
    demandSignal ? demandSignal.source || "DEMAND_PROXY" : null,
  ].filter(Boolean);

  const warnings = [
    pollenSignal ? null : "missing_pollen",
    weatherSignal ? null : "missing_weather",
    airSignal ? null : "missing_air_quality",
    demandSignal ? null : "missing_demand",
  ].filter(Boolean);

  const confidence = scoreConfidence({
    hasPollen: Boolean(pollenSignal),
    hasWeather: Boolean(weatherSignal),
    hasAir: Boolean(airSignal),
    hasDemand: Boolean(demandSignal),
  });

  let mediaIndex =
    pollenScore * INDEX_COMPONENT_WEIGHTS.pollen.weight +
    weatherResult.score * INDEX_COMPONENT_WEIGHTS.weather.weight +
    airQualityScore * INDEX_COMPONENT_WEIGHTS.airQuality.weight +
    demandScore * INDEX_COMPONENT_WEIGHTS.demand.weight +
    confidence * INDEX_COMPONENT_WEIGHTS.confidence.weight;

  if (pollenScore < 35) {
    mediaIndex = Math.min(mediaIndex, 45);
  }
  if (weatherResult.rainBrake) {
    mediaIndex = Math.min(mediaIndex, 42);
  }

  mediaIndex = round(clamp(mediaIndex), 1);
  const action = actionFor(mediaIndex, confidence, pollenScore, weatherResult.rainBrake);

  return {
    regionCode: region.code,
    regionName: region.name,
    targetDate,
    mediaIndex,
    action,
    suggestedBudgetShiftPct: budgetShiftFor(action),
    confidence,
    rainBrake: weatherResult.rainBrake,
    blockers: weatherResult.rainBrake ? ["rain_brake"] : [],
    warnings,
    sourceTrace,
    topPollen: pollenSignal
      ? {
          type: pollenSignal.pollenType,
          index03: round(pollenSignal.index03, 2),
          dwdRegion: pollenSignal.dwdRegion,
        }
      : null,
    componentScores: {
      pollen: round(pollenScore, 1),
      weather: round(weatherResult.score, 1),
      airQuality: round(airQualityScore, 1),
      demand: round(demandScore, 1),
    },
    drivers: driversFor({
      pollenScore,
      weatherResult,
      airQualityScore,
      demandScore,
    }),
    channelPlan: channelPlanFor(action),
    compliance: {
      targetingMode: "contextual_environmental_region",
      personalHealthDataUsed: false,
      individualHealthProfileUsed: false,
      humanApprovalRequired: true,
    },
  };
}

function parseDwdPollen(dwdJson, targetKey = "tomorrow") {
  const content = Array.isArray(dwdJson && dwdJson.content) ? dwdJson.content : [];

  return REGIONS.map((region) => {
    const matchingParts = content.filter((item) => {
      return normalizeRegionName(item.region_name) === normalizeRegionName(region.dwdRegion);
    });

    let best = null;
    for (const part of matchingParts) {
      for (const pollenType of POLLEN_TYPES) {
        const raw = part.Pollen && part.Pollen[pollenType] && part.Pollen[pollenType][targetKey];
        const index03 = parseDwdIndex(raw);
        if (!best || index03 > best.index03) {
          best = {
            regionCode: region.code,
            regionName: region.name,
            pollenType,
            index03,
            rawScale: raw || "0",
            dwdRegion: part.region_name,
            dwdPartRegion: part.partregion_name,
            source: "DWD_POLLEN",
          };
        }
      }
    }

    return (
      best || {
        regionCode: region.code,
        regionName: region.name,
        pollenType: "unknown",
        index03: 0,
        rawScale: "0",
        dwdRegion: region.dwdRegion,
        source: "DWD_POLLEN",
      }
    );
  });
}

function parseDwdIndex(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }
  const parts = String(value)
    .split("-")
    .map((part) => Number(part.trim()))
    .filter((part) => Number.isFinite(part));

  if (!parts.length) {
    return 0;
  }
  return clamp(parts.reduce((sum, part) => sum + part, 0) / parts.length, 0, 3);
}

function weatherFromOpenMeteo(region, payload, targetDate) {
  const daily = payload && payload.daily ? payload.daily : {};
  const index = Array.isArray(daily.time) ? daily.time.indexOf(targetDate) : -1;
  if (index === -1) {
    return null;
  }

  return {
    regionCode: region.code,
    regionName: region.name,
    targetDate,
    rainMm: numberAt(daily.precipitation_sum, index),
    precipitationProbability: numberAt(daily.precipitation_probability_max, index),
    windKmh: numberAt(daily.wind_speed_10m_max, index),
    temperatureC: numberAt(daily.temperature_2m_max, index),
    humidityPct: averageHourlyForDate(payload.hourly, "relative_humidity_2m", targetDate),
    source: "OPEN_METEO_WEATHER",
  };
}

function airQualityFromOpenMeteo(region, payload, targetDate) {
  const hourly = payload && payload.hourly ? payload.hourly : {};
  if (!Array.isArray(hourly.time)) {
    return null;
  }

  return {
    regionCode: region.code,
    regionName: region.name,
    targetDate,
    pm10: averageHourlyForDate(hourly, "pm10", targetDate),
    pm25: averageHourlyForDate(hourly, "pm2_5", targetDate),
    no2: averageHourlyForDate(hourly, "nitrogen_dioxide", targetDate),
    ozone: averageHourlyForDate(hourly, "ozone", targetDate),
    source: "OPEN_METEO_AIR_QUALITY",
  };
}

function buildNeutralDemand(targetDate) {
  return REGIONS.map((region) => ({
    regionCode: region.code,
    regionName: region.name,
    targetDate,
    searchInterest: 50,
    searchDelta: 0,
    source: "NEUTRAL_DEMAND_PROXY",
  }));
}

function buildGoogleDemandSignals(targetDate, googleDemand) {
  const demand = googleDemand || {
    score: 50,
    delta: 0,
    source: "GOOGLE_TRENDS_RSS",
    matchedTopics: [],
  };

  return REGIONS.map((region) => ({
    regionCode: region.code,
    regionName: region.name,
    targetDate,
    searchInterest: demand.score,
    searchDelta: demand.delta,
    matchedTopics: demand.matchedTopics,
    source: demand.source || "GOOGLE_TRENDS_RSS",
  }));
}

function parseGoogleTrendsRss(xml) {
  if (!xml) {
    return [];
  }

  const items = [];
  const itemPattern = /<item>([\s\S]*?)<\/item>/g;
  let itemMatch;
  while ((itemMatch = itemPattern.exec(xml))) {
    const itemXml = itemMatch[1];
    const newsTitles = extractAllXmlValues(itemXml, "ht:news_item_title");
    items.push({
      title: extractXmlValue(itemXml, "title"),
      approxTraffic: parseApproxTraffic(extractXmlValue(itemXml, "ht:approx_traffic")),
      pubDate: extractXmlValue(itemXml, "pubDate"),
      link: extractXmlValue(itemXml, "link"),
      newsTitles,
      haystack: [
        extractXmlValue(itemXml, "title"),
        extractXmlValue(itemXml, "description"),
        ...newsTitles,
        ...extractAllXmlValues(itemXml, "ht:news_item_snippet"),
      ]
        .filter(Boolean)
        .join(" "),
    });
  }

  return items;
}

function scoreGoogleDemand(items) {
  const trendItems = Array.isArray(items) ? items : [];
  const matches = trendItems.filter((item) => containsAllergyTerm(item.haystack || item.title));
  const matchedTraffic = matches.reduce((sum, item) => sum + (item.approxTraffic || 0), 0);
  const totalTraffic = trendItems.reduce((sum, item) => sum + (item.approxTraffic || 0), 0);
  const trafficShare = totalTraffic > 0 ? matchedTraffic / totalTraffic : 0;
  const matchCountBoost = Math.min(matches.length * 8, 24);
  const trafficBoost = Math.min(trafficShare * 120, 26);
  const score = round(clamp(50 + matchCountBoost + trafficBoost), 1);

  return {
    score,
    delta: round(score - 50, 1),
    source: "GOOGLE_TRENDS_RSS",
    matchedTopics: matches.map((item) => item.title).filter(Boolean).slice(0, 5),
    matchedTraffic,
    itemCount: trendItems.length,
    matchedItemCount: matches.length,
  };
}

function buildDemoSignals(targetDate = isoDateOffset(1)) {
  const pollen = REGIONS.map((region, index) => ({
    regionCode: region.code,
    regionName: region.name,
    targetDate,
    pollenType: index % 3 === 0 ? "Birke" : index % 3 === 1 ? "Graeser" : "Roggen",
    index03: [3, 2.5, 2, 1.5, 1][index % 5],
    rawScale: String([3, 2.5, 2, 1.5, 1][index % 5]),
    dwdRegion: region.dwdRegion,
    source: "DEMO_POLLEN",
  }));

  const weather = REGIONS.map((region, index) => ({
    regionCode: region.code,
    regionName: region.name,
    targetDate,
    rainMm: index === 5 ? 8 : index % 4 === 0 ? 0.2 : 1.1,
    precipitationProbability: index === 5 ? 90 : index % 4 === 0 ? 8 : 25,
    windKmh: 12 + (index % 5) * 3,
    temperatureC: 18 + (index % 4),
    humidityPct: index === 5 ? 88 : 45 + (index % 6) * 4,
    source: "DEMO_WEATHER",
  }));

  const airQuality = REGIONS.map((region, index) => ({
    regionCode: region.code,
    regionName: region.name,
    targetDate,
    pm10: 18 + (index % 7) * 5,
    pm25: 9 + (index % 5) * 3,
    no2: 18 + (index % 6) * 5,
    ozone: 65 + (index % 7) * 8,
    source: "DEMO_AIR_QUALITY",
  }));

  const demand = REGIONS.map((region, index) => ({
    regionCode: region.code,
    regionName: region.name,
    targetDate,
    searchInterest: 42 + (index % 8) * 6,
    searchDelta: index % 3 === 0 ? 15 : 4,
    source: "DEMO_DEMAND_PROXY",
  }));

  return { pollen, weather, airQuality, demand };
}

function getMethodology() {
  return {
    version: "mvp_prior_v1",
    validationStatus: "heuristic_not_yet_backtested",
    summary:
      "Current weights are transparent MVP priors. Signal choice is evidence-informed, but the exact weights must be learned against outcome data before automated media buying.",
    backtestRequiredBeforeAutomation: true,
    components: Object.fromEntries(
      Object.entries(INDEX_COMPONENT_WEIGHTS).map(([key, component]) => [
        key,
        {
          label: component.label,
          weight: component.weight,
          weightPct: Math.round(component.weight * 100),
          evidenceLevel: component.evidenceLevel,
          calibrationStatus: component.calibrationStatus,
          rationale: component.rationale,
        },
      ])
    ),
    calibrationTargets: [
      "google_search_interest",
      "paid_search_ctr",
      "pharmacy_sellout",
      "campaign_conversion_rate",
      "incremental_roas",
    ],
    calibrationRoadmap: [
      "Build a daily region panel with pollen, weather, air quality, Google demand, media spend, and outcome data.",
      "Fit transparent baseline models such as ridge regression, GAM, and hierarchical regional models.",
      "Backtest ranking quality, lift, lead time, and budget-allocation regret against naive seasonal baselines.",
      "Promote learned weights only when they improve out-of-sample outcomes and remain explainable for pharma clients.",
    ],
  };
}

function scoreWeather(signal) {
  if (!signal) {
    return { score: 50, rainBrake: false, reasons: ["weather_missing"] };
  }

  const rainMm = toNumber(signal.rainMm, 0);
  const precipitationProbability = normalizeProbability(signal.precipitationProbability);
  const rainBrake = rainMm >= 5 || precipitationProbability >= 0.75;

  if (rainBrake) {
    return { score: 18, rainBrake: true, reasons: ["rain_suppresses_pollen"] };
  }

  let score = 50;
  const reasons = [];
  const temperatureC = toNumber(signal.temperatureC, null);
  const windKmh = toNumber(signal.windKmh, null);
  const humidityPct = toNumber(signal.humidityPct, null);

  if (temperatureC !== null) {
    if (temperatureC >= 12 && temperatureC <= 26) {
      score += 15;
      reasons.push("comfortable_temperature");
    } else if (temperatureC >= 8 && temperatureC <= 30) {
      score += 8;
      reasons.push("moderate_temperature");
    } else {
      score -= 5;
    }
  }

  if (windKmh !== null) {
    if (windKmh >= 10 && windKmh <= 30) {
      score += 15;
      reasons.push("wind_spreads_pollen");
    } else if (windKmh > 45) {
      score -= 10;
    } else if (windKmh < 5) {
      score -= 5;
    }
  }

  if (humidityPct !== null) {
    if (humidityPct < 60) {
      score += 10;
      reasons.push("dry_air");
    } else if (humidityPct > 80) {
      score -= 10;
    }
  }

  if (precipitationProbability <= 0.15) {
    score += 5;
    reasons.push("low_rain_risk");
  } else if (precipitationProbability >= 0.4) {
    score -= 15;
  }

  if (rainMm >= 1 && rainMm < 5) {
    score -= 20;
  }

  return { score: clamp(score), rainBrake: false, reasons };
}

function scoreAirQuality(signal) {
  if (!signal) {
    return 50;
  }
  const components = [
    scale(signal.pm10, 50),
    scale(signal.pm25, 25),
    scale(signal.no2, 50),
    scale(signal.ozone, 120),
  ].filter((value) => value !== null);

  if (!components.length) {
    return 50;
  }
  return components.reduce((sum, value) => sum + value, 0) / components.length;
}

function scoreDemand(signal) {
  if (!signal) {
    return 50;
  }
  const interest = toNumber(signal.searchInterest, 50);
  const delta = toNumber(signal.searchDelta, 0);
  return clamp(interest + Math.max(delta, 0) * 0.8);
}

function scoreConfidence({ hasPollen, hasWeather, hasAir, hasDemand }) {
  const coverage = [hasPollen, hasWeather, hasAir, hasDemand].filter(Boolean).length / 4;
  let score = 35 + coverage * 45;
  if (hasPollen) score += 10;
  if (hasWeather) score += 5;
  return round(clamp(score), 1);
}

function actionFor(mediaIndex, confidence, pollenScore, rainBrake) {
  if (rainBrake || pollenScore === 0) return "pause";
  if (mediaIndex >= 80 && confidence >= 60) return "boost";
  if (mediaIndex >= 65 && confidence >= 55) return "prepare";
  if (mediaIndex >= 45) return "hold";
  return "pause";
}

function budgetShiftFor(action) {
  return {
    boost: 150,
    prepare: 60,
    hold: 0,
    pause: -100,
  }[action];
}

function channelPlanFor(action) {
  if (action === "boost") {
    return ["mobile_display", "paid_social", "retail_media", "pharmacy_dooh"];
  }
  if (action === "prepare") {
    return ["programmatic_reserve", "search_budget_ready", "pharmacy_inventory_ping"];
  }
  if (action === "hold") {
    return ["monitor", "keep_frequency_cap"];
  }
  return ["pause_paid_media", "keep_organic_content"];
}

function driversFor({ pollenScore, weatherResult, airQualityScore, demandScore }) {
  if (weatherResult.rainBrake) {
    return ["rain_brake", ...weatherResult.reasons].slice(0, 4);
  }

  const drivers = [];
  if (pollenScore >= 70) drivers.push("high_pollen_pressure");
  if (weatherResult.score >= 70) drivers.push(...weatherResult.reasons.slice(0, 2));
  if (airQualityScore >= 70) drivers.push("air_quality_irritation_multiplier");
  if (demandScore >= 70) drivers.push("rising_demand_proxy");
  return drivers.slice(0, 4);
}

function buildQualityGate(rankings, sourceStatus) {
  const averageConfidence = rankings.length
    ? rankings.reduce((sum, row) => sum + row.confidence, 0) / rankings.length
    : 0;
  const boostCount = rankings.filter((row) => row.action === "boost").length;
  const activationCount = rankings.filter((row) => ["boost", "prepare"].includes(row.action))
    .length;
  const liveSourceCount = sourceStatus.filter((item) => item.status === "live").length;

  return {
    status:
      activationCount > 0 && liveSourceCount >= 2 && averageConfidence >= 60
        ? "pilot_ready"
        : "shadow_only",
    averageConfidence: round(averageConfidence, 1),
    boostRegionCount: boostCount,
    activationRegionCount: activationCount,
    liveSourceCount,
    regionCount: rankings.length,
  };
}

function normalizeRegionName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ü/g, "ue")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ß/g, "ss")
    .toLowerCase();
}

function containsAllergyTerm(value) {
  const normalized = normalizeRegionName(value);
  return ALLERGY_DEMAND_TERMS.some((term) => normalized.includes(normalizeRegionName(term)));
}

function extractXmlValue(xml, tagName) {
  const escapedTag = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = xml.match(new RegExp(`<${escapedTag}[^>]*>([\\s\\S]*?)<\\/${escapedTag}>`));
  return match ? decodeXml(match[1].trim()) : "";
}

function extractAllXmlValues(xml, tagName) {
  const escapedTag = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<${escapedTag}[^>]*>([\\s\\S]*?)<\\/${escapedTag}>`, "g");
  const values = [];
  let match;
  while ((match = pattern.exec(xml))) {
    values.push(decodeXml(match[1].trim()));
  }
  return values;
}

function parseApproxTraffic(value) {
  const cleaned = String(value || "")
    .replace(/\+/g, "")
    .replace(/\s/g, "")
    .replace(/,/g, ".")
    .toUpperCase();
  const match = cleaned.match(/^(\d+(?:\.\d+)?)([KM]?)$/);
  if (!match) {
    return 0;
  }
  const amount = Number(match[1]);
  const multiplier = match[2] === "M" ? 1_000_000 : match[2] === "K" ? 1_000 : 1;
  return Math.round(amount * multiplier);
}

function decodeXml(value) {
  return String(value || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

function averageHourlyForDate(hourly, key, targetDate) {
  if (!hourly || !Array.isArray(hourly.time) || !Array.isArray(hourly[key])) {
    return null;
  }
  const values = hourly.time
    .map((time, index) => (String(time).startsWith(targetDate) ? hourly[key][index] : null))
    .filter((value) => Number.isFinite(Number(value)))
    .map(Number);

  if (!values.length) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function isoDateOffset(days) {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

function numberAt(list, index) {
  if (!Array.isArray(list)) {
    return null;
  }
  const value = Number(list[index]);
  return Number.isFinite(value) ? value : null;
}

function scale(value, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return clamp((parsed / max) * 100);
}

function normalizeProbability(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return parsed > 1 ? parsed / 100 : parsed;
}

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

module.exports = {
  ALLERGY_DEMAND_TERMS,
  INDEX_COMPONENT_WEIGHTS,
  POLLEN_TYPES,
  REGIONS,
  actionFor,
  airQualityFromOpenMeteo,
  buildDemoSignals,
  buildGoogleDemandSignals,
  buildNeutralDemand,
  buildSnapshot,
  getMethodology,
  parseApproxTraffic,
  parseDwdIndex,
  parseDwdPollen,
  parseGoogleTrendsRss,
  scoreGoogleDemand,
  scoreAirQuality,
  scoreWeather,
  weatherFromOpenMeteo,
};
