// api/rarity-distribution.js
// GET /api/rarity-distribution
// Returns tier counts and top pieces from KV rarity data
// Called by rarity.tsx — single call instead of N individual fetches

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
  if (req.method !== "GET") return res.status(405).end();

  try {
    // Get all rarity keys
    const keys = await redis.keys("rarity:*");

    if (!keys.length) {
      return res.status(200).json({
        found: false,
        message: "No rarity data yet — load the collection page first",
        distribution: [],
        total: 0,
      });
    }

    // Fetch all rarity records in one pipeline
    const pipeline = redis.pipeline();
    for (const key of keys) pipeline.get(key);
    const results = await pipeline.exec();

    const counts = {
      Haute: 0,
      "Très Rare": 0,
      Prestige: 0,
      Signature: 0,
      Essential: 0,
    };

    let total = 0;
    let topTokenId = null;
    let topRank = Infinity;

    results.forEach((raw, idx) => {
      if (!raw) return;
      const data = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (!data?.label) return;

      total++;
      if (counts[data.label] !== undefined) counts[data.label]++;

      // Track highest ranked (rank 1 = rarest)
      const tokenId = Number(keys[idx].replace("rarity:", ""));
      if (data.rank < topRank) {
        topRank = data.rank;
        topTokenId = tokenId;
      }
    });

    return res.status(200).json({
      found: true,
      total,
      topTokenId,
      distribution: Object.entries(counts).map(([label, count]) => ({
        label,
        count,
        percent: total > 0 ? parseFloat(((count / total) * 100).toFixed(1)) : 0,
      })),
    });
  } catch (err) {
    console.error("rarity-distribution error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
