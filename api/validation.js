const { buildValidationSummary } = require("../lib/validation");

module.exports = async function handler(request, response) {
  const metric =
    (request.query && typeof request.query.metric === "string" && request.query.metric) ||
    "pharmacy_sellout";
  const topK =
    request.query && request.query.topK ? Math.max(1, Number(request.query.topK) || 3) : 3;

  const summary = buildValidationSummary({ metric, topK });

  response.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=900");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.status(200).json(summary);
};
