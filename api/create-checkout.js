// api/create-checkout.js
// Uses raw Stellar SDK simulation — same approach as collection.tsx and [id].tsx
// No contract-client dependency needed

const Stripe = require("stripe");
const StellarSdk = require("@stellar/stellar-sdk");
const {
  rpc,
  Contract,
  Account,
  TransactionBuilder,
  BASE_FEE,
  nativeToScVal,
  scValToNative,
  Keypair,
} = StellarSdk;

const STELLAR_CONTRACT =
  process.env.STELLAR_CONTRACT_ID ||
  "CB7GCGWAHWCF3SAJTYCR7JEFINLJBKA3LV7BZNAI46OXYPYZSTFZ6EMB";
const STELLAR_RPC =
  process.env.STELLAR_RPC_URL || "https://soroban-testnet.stellar.org";
const STELLAR_PASSPHRASE =
  process.env.STELLAR_NETWORK_PASSPHRASE || "Test SDF Network ; September 2015";
const ADMIN_WALLET =
  process.env.STELLAR_ADMIN_WALLET ||
  "GB2GKZ22XFF5BZWRV6AIO7JLCDT7W36Y5DFIUWPENA5IIDEAH7FLXOA3";

function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

// ── Same simulation pattern as collection.tsx ─────────────────
async function simulate(fn, args = []) {
  const server = new rpc.Server(STELLAR_RPC);
  const contract = new Contract(STELLAR_CONTRACT);
  const keypair = Keypair.random();
  const account = new Account(keypair.publicKey(), "0");

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: STELLAR_PASSPHRASE,
  })
    .addOperation(contract.call(fn, ...args))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (!rpc.Api.isSimulationSuccess(sim)) {
    throw new Error(`Simulation failed for ${fn}`);
  }
  return scValToNative(sim.result.retval);
}

async function checkBagAvailability(tokenId) {
  const tokenArg = nativeToScVal(tokenId, { type: "u64" });

  const [raw, ownerRaw] = await Promise.all([
    simulate("full_token_data", [tokenArg]),
    simulate("owner_of", [tokenArg]).catch(() => null),
  ]);

  if (!raw) throw new Error(`Token #${tokenId} not found on contract`);

  // Check admin wallet still owns it
  const owner = ownerRaw ? String(ownerRaw).trim() : null;
  const ownedByAdmin =
    !owner || owner.toUpperCase() === ADMIN_WALLET.toUpperCase();

  if (!ownedByAdmin) {
    throw new Error(
      `Token #${tokenId} is no longer available — it has already been purchased`,
    );
  }

  if (raw.listed === false) {
    throw new Error(`Token #${tokenId} is not currently listed for sale`);
  }

  const t = raw.traits || {};

  return {
    name: raw.name || `MBC Token #${tokenId}`,
    price_usdc: raw.price_usdc ? Number(raw.price_usdc) : 20000,
    edition_type: t.edition_type || raw.edition_type || "",
    image: raw.image
      ? raw.image.startsWith("ipfs://")
        ? raw.image.replace("ipfs://", "https://ipfs.io/ipfs/")
        : raw.image
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

    const origin =
      req.headers.origin || "https://michael-by-christian.vercel.app";
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
