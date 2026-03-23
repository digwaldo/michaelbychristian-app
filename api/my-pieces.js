// api/my-pieces.js
// GET /api/my-pieces?email=buyer@email.com&token_id=12
// Verifies if a logged-in user owns a specific token
// Used by profile page to list owned pieces

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

  const { email, token_id } = req.query;
  if (!email || !token_id)
    return res.status(400).json({ error: "email and token_id required" });

  try {
    const raw = await redis.get(`sold:${token_id}`);
    if (!raw) return res.status(200).json({ isOwner: false });

    const saleData = typeof raw === "string" ? JSON.parse(raw) : raw;

    if (saleData.buyerEmail?.toLowerCase() !== email.toLowerCase())
      return res.status(200).json({ isOwner: false });

    return res.status(200).json({
      isOwner: true,
      bagName: saleData.pieceName || null,
      amount: saleData.amount,
      soldAt: saleData.soldAt,
      claimed: saleData.claimed,
      buyerWallet: saleData.claimed ? saleData.buyerWallet : null,
    });
  } catch (err) {
    console.error("my-pieces error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
