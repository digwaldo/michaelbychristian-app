// api/create-checkout.js
// Vercel serverless function — creates a Stripe Checkout session for a bag purchase
//
// Flow:
//   1. Read bag data + ownership from the Stellar contract
//   2. Confirm the admin wallet still owns the token (i.e. it hasn't sold yet)
//   3. Create a Stripe Checkout session — user pays by card / Apple Pay / Google Pay
//   4. No NFT transfer here — handle that separately via a Stripe webhook when payment succeeds
//
// Place this file at:  mbc-app/api/create-checkout.js
// Vercel exposes it at: https://your-app.vercel.app/api/create-checkout

const Stripe = require("stripe");
const StellarSdk = require("@stellar/stellar-sdk");
const { basicNodeSigner } = require("@stellar/stellar-sdk/contract");

const STELLAR_CONTRACT =
  process.env.STELLAR_CONTRACT_ID ||
  "CACP7SFR7K5MVX4ZRGOTK4WX5NDPQUTFUJTIGU4LJZVDJGILYT2YRDEQ";
const STELLAR_RPC =
  process.env.STELLAR_RPC_URL || "https://soroban-testnet.stellar.org";
const STELLAR_PASSPHRASE =
  process.env.STELLAR_NETWORK_PASSPHRASE || "Test SDF Network ; September 2015";
const ADMIN_SECRET = process.env.STELLAR_ADMIN_SECRET;

function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

// ── Read bag data from Stellar contract ───────────────────────
async function checkBagAvailability(tokenId) {
  const adminKeypair = StellarSdk.Keypair.fromSecret(ADMIN_SECRET);
  const adminPublic = adminKeypair.publicKey();
  const { signTransaction } = basicNodeSigner(adminKeypair, STELLAR_PASSPHRASE);

  const { Client } = await import("../contract-client/dist/index.js");

  const client = new Client({
    contractId: STELLAR_CONTRACT,
    networkPassphrase: STELLAR_PASSPHRASE,
    rpcUrl: STELLAR_RPC,
    publicKey: adminPublic,
    signTransaction,
  });

  // 1. Confirm admin wallet is still the owner (bag hasn't sold yet)
  const ownerTx = await client.owner_of({ token_id: BigInt(tokenId) });
  const retval = ownerTx.simulation?.result?.retval;
  if (!retval) throw new Error(`Token #${tokenId} not found on contract`);

  const currentOwner = StellarSdk.Address.fromScVal(retval).toString();
  if (currentOwner !== adminPublic) {
    throw new Error(
      `Token #${tokenId} is no longer available — it has already been purchased`,
    );
  }

  // 2. Read token data for price, name, traits
  const dataTx = await client.full_token_data({ token_id: BigInt(tokenId) });
  const dataRetval = dataTx.simulation?.result?.retval;
  if (!dataRetval) throw new Error(`Could not load data for token #${tokenId}`);

  const data = StellarSdk.scValToNative(dataRetval);
  if (!data.listed)
    throw new Error(`Token #${tokenId} is not currently listed for sale`);

  const t = data.traits || {};

  return {
    name: data.name || `MBC Token #${tokenId}`,
    price_usdc: data.price_usdc ? Number(data.price_usdc) : 20000,
    edition_type: t.edition_type || data.edition_type || "",
    image: data.image
      ? data.image.startsWith("ipfs://")
        ? data.image.replace("ipfs://", "https://ipfs.io/ipfs/")
        : data.image
      : null,
  };
}

// ── Handler ───────────────────────────────────────────────────
module.exports = async (req, res) => {
  setCORS(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const { tokenId, successUrl, cancelUrl } = req.body;
    if (!tokenId) return res.status(400).json({ error: "tokenId is required" });

    // Verify availability on Stellar before charging the card
    let bag;
    try {
      bag = await checkBagAvailability(Number(tokenId));
    } catch (availErr) {
      console.log(`Token ${tokenId} unavailable: ${availErr.message}`);
      return res.status(400).json({
        error: availErr.message,
        unavailable: true,
      });
    }

    const origin = req.headers.origin || "https://your-app.vercel.app";
    const baseSuccessUrl = successUrl || `${origin}/success`;
    const baseCancelUrl = cancelUrl || `${origin}/`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `MBC — ${bag.name}`,
              description:
                bag.edition_type ||
                "Handcrafted luxury bag. NFC embedded. Authenticated.",
              ...(bag.image ? { images: [bag.image] } : {}),
            },
            unit_amount: bag.price_usdc,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${baseSuccessUrl}?session_id={CHECKOUT_SESSION_ID}&token_id=${tokenId}`,
      cancel_url: baseCancelUrl,
      metadata: {
        token_id: String(tokenId),
        bag_name: bag.name,
      },
      shipping_address_collection: {
        allowed_countries: [
          "US",
          "CA",
          "GB",
          "AU",
          "FR",
          "DE",
          "IT",
          "ES",
          "JP",
        ],
      },
      phone_number_collection: { enabled: true },
      custom_fields: [
        {
          key: "stellar_wallet",
          label: {
            type: "custom",
            custom: "Your Stellar Wallet Address (optional)",
          },
          type: "text",
          optional: true,
        },
      ],
    });

    return res.status(200).json({ sessionId: session.id, url: session.url });
  } catch (err) {
    console.error("Checkout error:", err);
    return res.status(500).json({ error: err.message });
  }
};
