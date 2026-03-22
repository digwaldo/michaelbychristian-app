// api/check-sold.js
// GET /api/check-sold?token_id=12
// Returns whether a token is sold and its sale/claim data
// Called by [id].tsx to determine page state

const { getTokenSaleData } = require("./mark-sold");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).end();

  const { token_id } = req.query;
  if (!token_id) return res.status(400).json({ error: "token_id required" });

  try {
    const saleData = await getTokenSaleData(Number(token_id));
    if (!saleData) {
      return res.status(200).json({ sold: false });
    }
    return res.status(200).json({
      sold: true,
      claimed: saleData.claimed,
      soldAt: saleData.soldAt,
      claimedAt: saleData.claimedAt || null,
      buyerWallet: saleData.claimed ? saleData.buyerWallet : null,
      // Never expose buyerEmail to the client
    });
  } catch (err) {
    console.error("check-sold error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
