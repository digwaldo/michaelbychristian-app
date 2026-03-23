// api/save-rarity.js
// POST /api/save-rarity
// Called by collection.tsx after addRarity() completes
// Stores computed rarity for all tokens in KV so piece pages can read it

const { Redis } = require("@upstash/redis");

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

module.exports = async (req, res) => {
  setCORS(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const { rarities } = req.body;
    // rarities = [{ tokenId, rank, label, score, percentile, traitCount }, ...]
    if (!rarities || !Array.isArray(rarities))
      return res.status(400).json({ error: "rarities array required" });

    // Store all in one pipeline for speed
    const pipeline = redis.pipeline();
    for (const r of rarities) {
      pipeline.set(
        `rarity:${r.tokenId}`,
        JSON.stringify({
          rank: r.rank,
          label: r.label,
          score: r.score,
          percentile: r.percentile,
          traitCount: r.traitCount,
          total: rarities.length,
          updatedAt: new Date().toISOString(),
        }),
      );
    }
    await pipeline.exec();

    console.log(`Saved rarity for ${rarities.length} tokens`);
    return res.status(200).json({ saved: rarities.length });
  } catch (err) {
    console.error("save-rarity error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
