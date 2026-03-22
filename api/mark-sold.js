// api/mark-sold.js
// Marks a token as sold in Upstash KV — called internally by webhook
// Stores: sold:{tokenId} = { soldAt, buyerEmail, buyerName, amount, shippingAddress }

const { Redis } = require("@upstash/redis");

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

async function markTokenSold({
  tokenId,
  buyerEmail,
  buyerName,
  amount,
  shippingAddress,
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
    }),
  );
  console.log(`Token ${tokenId} marked as sold in KV`);
}

async function getTokenSaleData(tokenId) {
  const data = await redis.get(`sold:${tokenId}`);
  if (!data) return null;
  return typeof data === "string" ? JSON.parse(data) : data;
}

async function isTokenSold(tokenId) {
  const data = await redis.get(`sold:${tokenId}`);
  return !!data;
}

async function markTokenClaimed({ tokenId, buyerWallet }) {
  const existing = await getTokenSaleData(tokenId);
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
}

module.exports = {
  markTokenSold,
  getTokenSaleData,
  isTokenSold,
  markTokenClaimed,
};
