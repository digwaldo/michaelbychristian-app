// api/rarity.js
// Consolidated rarity endpoint — replaces get-rarity.js, save-rarity.js, rarity-distribution.js
//
// GET  /api/rarity?type=token&token_id=12   — get rarity for one token
// GET  /api/rarity?type=distribution        — get tier distribution for rarity page
// POST /api/rarity                          — save computed rarity for all tokens (called by collection.tsx)

const { Redis } = require("@upstash/redis");

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

module.exports = async (req, res) => {
  setCORS(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  // ── POST — save rarity data from collection ──────────────────
  if (req.method === "POST") {
    try {
      const { rarities } = req.body;
      if (!rarities || !Array.isArray(rarities))
        return res.status(400).json({ error: "rarities array required" });

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
      console.error("rarity save error:", err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });

  const { type, token_id } = req.query;

  // ── GET ?type=token&token_id=12 — single token rarity ────────
  if (type === "token") {
    if (!token_id) return res.status(400).json({ error: "token_id required" });
    try {
      const raw = await redis.get(`rarity:${token_id}`);
      if (!raw) return res.status(200).json({ found: false });
      const data = typeof raw === "string" ? JSON.parse(raw) : raw;
      return res.status(200).json({ found: true, ...data });
    } catch (err) {
      console.error("rarity token error:", err.message);
      return res.status(200).json({ found: false });
    }
  }

  // ── GET ?type=distribution — full tier breakdown ──────────────
  if (type === "distribution") {
    try {
      const keys = await redis.keys("rarity:*");
      if (!keys.length) {
        return res.status(200).json({
          found: false,
          message: "No rarity data yet — load the collection page first",
          distribution: [],
          total: 0,
        });
      }

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
          percent:
            total > 0 ? parseFloat(((count / total) * 100).toFixed(1)) : 0,
        })),
      });
    } catch (err) {
      console.error("rarity distribution error:", err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  return res
    .status(400)
    .json({ error: "type must be 'token' or 'distribution'" });
};
