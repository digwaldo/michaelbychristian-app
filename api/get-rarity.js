// api/get-rarity.js
// GET /api/get-rarity?token_id=12
// Returns computed rarity data for a single token from KV

const { Redis } = require("@upstash/redis");

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
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });

  const { token_id } = req.query;
  if (!token_id) return res.status(400).json({ error: "token_id required" });

  try {
    const raw = await redis.get(`rarity:${token_id}`);
    if (!raw) {
      return res.status(200).json({ found: false });
    }
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    return res.status(200).json({ found: true, ...data });
  } catch (err) {
    console.error("get-rarity error:", err.message);
    return res.status(200).json({ found: false });
  }
};
