// api/sold-gains.js
// GET /api/sold-gains
// Returns gain % for all sold tokens that have XLM price data
// Only returns tokens with positive gain — used by collection and [id] page

const { Redis } = require("@upstash/redis");
const { fetchXLMPrice } = require("./xlm-price");

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

module.exports = async (req, res) => {
  setCORS(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).end();

  try {
    const [keys, currentXlmPrice] = await Promise.all([
      redis.keys("sold:*"),
      fetchXLMPrice(),
    ]);

    const gains = {};

    for (const key of keys) {
      try {
        const raw = await redis.get(key);
        if (!raw) continue;
        const saleData = typeof raw === "string" ? JSON.parse(raw) : raw;

        if (!saleData.xlmPriceAtPurchase || !saleData.xlmEquivalent) continue;

        const purchasePriceUSD = saleData.amount / 100;
        const currentValueUSD = saleData.xlmEquivalent * currentXlmPrice;
        const gainPercent =
          ((currentValueUSD - purchasePriceUSD) / purchasePriceUSD) * 100;

        // Only include positive gains
        if (gainPercent > 0) {
          const tokenId = Number(key.replace("sold:", ""));
          gains[tokenId] = parseFloat(gainPercent.toFixed(1));
        }
      } catch {
        continue;
      }
    }

    return res.status(200).json({ gains, currentXlmPrice });
  } catch (err) {
    console.error("sold-gains error:", err.message);
    return res.status(200).json({ gains: {}, currentXlmPrice: null });
  }
};
