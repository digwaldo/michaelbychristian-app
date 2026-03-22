// api/xlm-price.js
// GET /api/xlm-price
// Fetches current XLM/USD price from CoinGecko (free, no API key needed)
// Also used internally by other API routes

async function fetchXLMPrice() {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd",
    { headers: { Accept: "application/json" } },
  );
  if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`);
  const data = await res.json();
  const price = data?.stellar?.usd;
  if (!price) throw new Error("Could not parse XLM price from CoinGecko");
  return price;
}

module.exports = { fetchXLMPrice };

module.exports.default = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const price = await fetchXLMPrice();
    return res.status(200).json({
      price,
      currency: "usd",
      asset: "XLM",
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("XLM price fetch failed:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
