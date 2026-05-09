const test = require("node:test");
const assert = require("node:assert/strict");

const { buildLiveSnapshot } = require("../lib/live-snapshot");

test("buildLiveSnapshot builds a full regional snapshot from public-source payloads", async () => {
  const snapshot = await buildLiveSnapshot({
    targetDate: "2026-05-09",
    generatedAt: "2026-05-08T07:30:00.000Z",
    fetchImpl: async (url) => fakeResponse(url),
  });

  assert.equal(snapshot.targetDate, "2026-05-09");
  assert.equal(snapshot.rankings.length, 16);
  assert.equal(snapshot.sourceStatus.some((source) => source.source === "DWD_POLLEN"), true);
  assert.equal(
    snapshot.sourceStatus.some(
      (source) =>
        source.source === "GOOGLE_TRENDS_REGIONAL" || source.source === "GOOGLE_TRENDS_RSS"
    ),
    true
  );
  assert.equal(snapshot.methodology.version, "mvp_prior_v1");
});

function fakeResponse(url) {
  const value = String(url);
  if (value.includes("opendata.dwd.de")) {
    return jsonResponse({
      last_update: "2026-05-08 11:00 Uhr",
      next_update: "2026-05-09 11:00 Uhr",
      content: [
        {
          region_name: "Nordrhein-Westfalen",
          partregion_name: "Rhein.-Westfäl. Tiefland",
          Pollen: {
            Birke: { tomorrow: "3" },
            Graeser: { tomorrow: "2" },
          },
        },
      ],
    });
  }
  if (value.includes("api.open-meteo.com/v1/forecast")) {
    return jsonResponse({
      daily: {
        time: ["2026-05-09"],
        temperature_2m_max: [21],
        precipitation_sum: [0],
        precipitation_probability_max: [5],
        wind_speed_10m_max: [18],
      },
      hourly: {
        time: ["2026-05-09T00:00", "2026-05-09T12:00"],
        relative_humidity_2m: [44, 48],
      },
    });
  }
  if (value.includes("air-quality-api.open-meteo.com")) {
    return jsonResponse({
      hourly: {
        time: ["2026-05-09T00:00", "2026-05-09T12:00"],
        pm10: [20, 30],
        pm2_5: [10, 12],
        nitrogen_dioxide: [18, 20],
        ozone: [70, 80],
      },
    });
  }
  if (value.includes("trends.google.com")) {
    const isNW = value.includes("geo=DE-NW");
    const trafficLevel = isNW ? "5K+" : "2K+";
    return textResponse(`
      <rss xmlns:ht="https://trends.google.com/trending/rss">
        <channel>
          <item>
            <title>Pollenflug heute</title>
            <ht:approx_traffic>${trafficLevel}</ht:approx_traffic>
          </item>
        </channel>
      </rss>
    `);
  }
  throw new Error(`unexpected url ${url}`);
}

function jsonResponse(body) {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    async json() {
      return body;
    },
    async text() {
      return JSON.stringify(body);
    },
  };
}

function textResponse(body) {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    async text() {
      return body;
    },
  };
}
