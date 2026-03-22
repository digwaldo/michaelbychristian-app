// api/claim.js
// POST /api/claim
// Verifies buyer email matches sale record, then transfers NFT to their wallet
// Called from /piece/[id] claim section after purchase

const { getTokenSaleData, markTokenClaimed } = require("./mark-sold");
const StellarSdk = require("@stellar/stellar-sdk");

const STELLAR_CONTRACT =
  process.env.STELLAR_CONTRACT_ID ||
  "CB7GCGWAHWCF3SAJTYCR7JEFINLJBKA3LV7BZNAI46OXYPYZSTFZ6EMB";
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

function createCustodialWallet() {
  const keypair = StellarSdk.Keypair.random();
  return { publicKey: keypair.publicKey(), secretKey: keypair.secret() };
}

async function fundTestnetAccount(publicKey) {
  const res = await fetch(`https://friendbot.stellar.org?addr=${publicKey}`);
  if (!res.ok) throw new Error("Friendbot failed");
  return res.json();
}

async function transferNFT(tokenId, buyerAddress) {
  const { basicNodeSigner } = require("@stellar/stellar-sdk/contract");
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

  const tx = await client.transfer({
    from: adminPublic,
    to: buyerAddress,
    token_id: BigInt(tokenId),
  });

  const result = await tx.signAndSend();
  console.log(
    `Token ${tokenId} transferred to ${buyerAddress}: ${result.hash}`,
  );
  return { hash: result.hash };
}

module.exports = async (req, res) => {
  setCORS(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { tokenId, buyerEmail, walletAddress } = req.body;
  if (!tokenId || !buyerEmail)
    return res.status(400).json({ error: "tokenId and buyerEmail required" });

  try {
    // 1. Verify this buyer actually purchased this token
    const saleData = await getTokenSaleData(Number(tokenId));
    if (!saleData)
      return res
        .status(400)
        .json({ error: "No purchase found for this token" });

    if (saleData.buyerEmail.toLowerCase() !== buyerEmail.toLowerCase())
      return res
        .status(403)
        .json({ error: "Email does not match purchase record" });

    if (saleData.claimed)
      return res.status(400).json({
        error: "This token has already been claimed",
        buyerWallet: saleData.buyerWallet,
      });

    // 2. Resolve wallet — use provided or create custodial
    let wallet = walletAddress?.trim();
    let custodialSecret = null;
    let isCustodial = false;

    if (!wallet || !wallet.startsWith("G")) {
      console.log(`Creating custodial wallet for ${buyerEmail}`);
      const custodial = createCustodialWallet();
      wallet = custodial.publicKey;
      custodialSecret = custodial.secretKey;
      isCustodial = true;
      try {
        await fundTestnetAccount(wallet);
      } catch (e) {
        console.log("Friendbot note:", e.message);
      }
    }

    // 3. Transfer NFT
    const transfer = await transferNFT(tokenId, wallet);

    // 4. Mark as claimed in KV
    await markTokenClaimed({ tokenId: Number(tokenId), buyerWallet: wallet });

    // 5. Send wallet details email if custodial
    if (isCustodial && process.env.RESEND_API_KEY) {
      const { Stripe } = require("stripe"); // just for reference, not used
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "MBC Michael By Christian <onboarding@resend.dev>",
          to: [buyerEmail],
          subject: `Your MBC Wallet & NFT — Token #${tokenId}`,
          html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0C0B09;font-family:Helvetica,Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
  <div style="text-align:center;padding:32px 0;border-bottom:1px solid rgba(184,150,62,0.2);">
    <p style="font-size:10px;letter-spacing:0.4em;text-transform:uppercase;color:#B8963E;">Michael By Christian</p>
    <h1 style="font-family:Georgia,serif;font-size:32px;color:#F5EFE0;margin:8px 0 0;">Your NFT Has Been Claimed</h1>
  </div>
  <div style="padding:32px 0;">
    <p style="font-size:14px;color:#9A8E7A;line-height:1.8;">Your Authentication Contract (NFT) for Token #${tokenId} has been transferred to your new Stellar wallet.</p>
    <div style="background:#1A1916;border:1px solid rgba(192,97,74,0.4);padding:24px;margin:24px 0;">
      <p style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#C0614A;margin-bottom:12px;">YOUR WALLET — SAVE THIS NOW</p>
      <p style="font-size:10px;color:#7A7060;margin-bottom:4px;">WALLET ADDRESS</p>
      <p style="font-family:monospace;font-size:11px;color:#D4AF6A;word-break:break-all;background:#0C0B09;padding:10px;margin-bottom:12px;">${wallet}</p>
      <p style="font-size:10px;color:#7A7060;margin-bottom:4px;">SECRET KEY — NEVER SHARE WITH ANYONE</p>
      <p style="font-family:monospace;font-size:11px;color:#F5EFE0;word-break:break-all;background:#0C0B09;padding:10px;">${custodialSecret}</p>
    </div>
    <p style="font-size:12px;color:#7A7060;text-align:center;">Transaction: <span style="color:#B8963E;font-family:monospace;">${transfer.hash}</span></p>
  </div>
</div></body></html>`,
        }),
      });
    }

    return res.status(200).json({
      success: true,
      txHash: transfer.hash,
      buyerWallet: wallet,
      isCustodial,
      custodialSecret: isCustodial ? custodialSecret : null,
    });
  } catch (err) {
    console.error("Claim error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
