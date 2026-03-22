// api/sold-list.js
// GET /api/sold-list
// Returns all token IDs that have been sold (paid but not yet claimed on-chain)
// Used by collection.tsx to immediately hide sold items after payment

const { Redis } = require("@upstash/redis");

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).end();

  try {
    // Get all keys matching sold:*
    const keys = await redis.keys("sold:*");
    const soldTokenIds = keys
      .map((k) => Number(k.replace("sold:", "")))
      .filter((n) => !isNaN(n));

    return res.status(200).json({ soldTokenIds });
  } catch (err) {
    console.error("sold-list error:", err.message);
    // Return empty list on error — don't break the collection
    return res.status(200).json({ soldTokenIds: [] });
  }
};
