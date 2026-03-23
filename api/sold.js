// api/sold.js
// Consolidated sold endpoint — replaces sold-list.js, sold-gains.js, check-sold.js
//
// GET /api/sold?type=list                        — all sold token IDs (for collection)
// GET /api/sold?type=check&token_id=12           — check if one token is sold + claim status
// GET /api/sold?type=gains                       — gain % for all sold tokens with XLM data

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
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });

  const { type, token_id } = req.query;

  // ── GET ?type=list — all sold token IDs ──────────────────────
  if (type === "list") {
    try {
      const keys = await redis.keys("sold:*");
      const soldTokenIds = keys
        .map((k) => Number(k.replace("sold:", "")))
        .filter((n) => !isNaN(n));
      return res.status(200).json({ soldTokenIds });
    } catch (err) {
      console.error("sold list error:", err.message);
      return res.status(200).json({ soldTokenIds: [] });
    }
  }

  // ── GET ?type=check&token_id=12 — single token status ────────
  if (type === "check") {
    if (!token_id) return res.status(400).json({ error: "token_id required" });
    try {
      const raw = await redis.get(`sold:${token_id}`);
      if (!raw) return res.status(200).json({ sold: false });
      const saleData = typeof raw === "string" ? JSON.parse(raw) : raw;
      return res.status(200).json({
        sold: true,
        claimed: saleData.claimed,
        soldAt: saleData.soldAt,
        claimedAt: saleData.claimedAt || null,
        buyerWallet: saleData.claimed ? saleData.buyerWallet : null,
      });
    } catch (err) {
      console.error("sold check error:", err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── GET ?type=gains — XLM gain % for all sold tokens ─────────
  if (type === "gains") {
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
      console.error("sold gains error:", err.message);
      return res.status(200).json({ gains: {}, currentXlmPrice: null });
    }
  }

  return res
    .status(400)
    .json({ error: "type must be 'list', 'check', or 'gains'" });
};

// ── Internal helpers (used by webhook.js and claim.js) ────────
module.exports.markTokenSold = async function ({
  tokenId,
  buyerEmail,
  buyerName,
  amount,
  shippingAddress,
  xlmPriceAtPurchase,
  xlmEquivalent,
  xlmPriceBaseline,
}) {
  await redis.set(
    `sold:${tokenId}`,
    JSON.stringify({
      soldAt: new Date().toISOString(),
      buyerEmail,
      buyerName,
      amount,
      shippingAddress,
      claimed: false,
      buyerWallet: null,
      xlmPriceAtPurchase: xlmPriceAtPurchase || null,
      xlmEquivalent: xlmEquivalent || null,
      xlmPriceBaseline: xlmPriceBaseline || null,
      equityRedemptions: [],
    }),
  );
  console.log(`Token ${tokenId} marked as sold in KV`);
};

module.exports.getTokenSaleData = async function (tokenId) {
  const data = await redis.get(`sold:${tokenId}`);
  if (!data) return null;
  return typeof data === "string" ? JSON.parse(data) : data;
};

module.exports.isTokenSold = async function (tokenId) {
  const data = await redis.get(`sold:${tokenId}`);
  return !!data;
};

module.exports.markTokenClaimed = async function ({ tokenId, buyerWallet }) {
  const existing = await module.exports.getTokenSaleData(tokenId);
  if (!existing) throw new Error(`No sale data for token ${tokenId}`);
  await redis.set(
    `sold:${tokenId}`,
    JSON.stringify({
      ...existing,
      claimed: true,
      buyerWallet,
      claimedAt: new Date().toISOString(),
    }),
  );
  console.log(`Token ${tokenId} marked as claimed by ${buyerWallet}`);
};
