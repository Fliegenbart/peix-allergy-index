const { buildLiveSnapshot, resolveTargetDate } = require("../lib/live-snapshot");

module.exports = async function handler(request, response) {
  const targetDate = resolveTargetDate(request.query && request.query.date);
  const snapshot = await buildLiveSnapshot({ targetDate });

  response.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=1800");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.status(200).json(snapshot);
};
