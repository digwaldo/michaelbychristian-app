// api/claim.js
// POST /api/claim
// Verifies buyer email, transfers NFT using raw Stellar SDK (no contract-client)

const { getTokenSaleData, markTokenClaimed } = require("./sold");
const StellarSdk = require("@stellar/stellar-sdk");

const STELLAR_CONTRACT =
  process.env.STELLAR_CONTRACT_ID ||
  "CB7GCGWAHWCF3SAJTYCR7JEFINLJBKA3LV7BZNAI46OXYPYZSTFZ6EMB";
const STELLAR_RPC =
  process.env.STELLAR_RPC_URL || "https://soroban-testnet.stellar.org";
const STELLAR_PASSPHRASE =
  process.env.STELLAR_NETWORK_PASSPHRASE || "Test SDF Network ; September 2015";

const ADMIN_SECRET = process.env.STELLAR_ADMIN_SECRET;
const ADMIN_WALLET =
  process.env.STELLAR_ADMIN_WALLET ||
  "GB2GKZ22XFF5BZWRV6AIO7JLCDT7W36Y5DFIUWPENA5IIDEAH7FLXOA3";

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

// Check current owner on Stellar
async function getTokenOwner(tokenId) {
  try {
    const server = new StellarSdk.rpc.Server(STELLAR_RPC);
    const contract = new StellarSdk.Contract(STELLAR_CONTRACT);
    const keypair = StellarSdk.Keypair.random();
    const account = new StellarSdk.Account(keypair.publicKey(), "0");
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: STELLAR_PASSPHRASE,
    })
      .addOperation(
        contract.call(
          "owner_of",
          StellarSdk.nativeToScVal(Number(tokenId), { type: "u64" }),
        ),
      )
      .setTimeout(30)
      .build();
    const sim = await server.simulateTransaction(tx);
    if (!StellarSdk.rpc.Api.isSimulationSuccess(sim)) return null;
    return String(StellarSdk.scValToNative(sim.result.retval)).trim();
  } catch (e) {
    console.log("getTokenOwner error:", e.message);
    return null;
  }
}

// Transfer NFT using raw Stellar SDK with proper auth signing
async function transferNFT(tokenId, buyerAddress) {
  const adminKeypair = StellarSdk.Keypair.fromSecret(ADMIN_SECRET);
  const adminPublic = adminKeypair.publicKey();

  const server = new StellarSdk.rpc.Server(STELLAR_RPC);
  const contract = new StellarSdk.Contract(STELLAR_CONTRACT);

  // Load admin account with current sequence
  const accountData = await server.getAccount(adminPublic);
  const account = new StellarSdk.Account(
    adminPublic,
    String(accountData.sequence),
  );

  // Build the transfer operation with proper ScVal encoding for Soroban addresses
  const fromVal = new StellarSdk.Address(adminPublic).toScVal();
  const toVal = new StellarSdk.Address(buyerAddress).toScVal();
  const tokenIdVal = StellarSdk.nativeToScVal(Number(tokenId), { type: "u64" });

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: "1000000", // higher fee for contract calls
    networkPassphrase: STELLAR_PASSPHRASE,
  })
    .addOperation(contract.call("transfer", fromVal, toVal, tokenIdVal))
    .setTimeout(60)
    .build();

  // Simulate — this returns the sorobanData + auth entries
  const sim = await server.simulateTransaction(tx);
  if (!StellarSdk.rpc.Api.isSimulationSuccess(sim)) {
    const errStr = JSON.stringify(sim, (_, v) =>
      typeof v === "bigint" ? v.toString() : v,
    ).slice(0, 500);
    throw new Error(`Transfer simulation failed: ${errStr}`);
  }

  console.log(`Simulation success for token ${tokenId}, assembling...`);

  // assembleTransaction adds sorobanData + auth to the tx
  const preparedTx = StellarSdk.rpc.assembleTransaction(tx, sim).build();

  // Sign the transaction with admin keypair
  preparedTx.sign(adminKeypair);

  // Submit
  const sendResult = await server.sendTransaction(preparedTx);
  console.log(`Send status: ${sendResult.status}, hash: ${sendResult.hash}`);

  if (sendResult.status === "ERROR") {
    const errStr = JSON.stringify(sendResult, (_, v) =>
      typeof v === "bigint" ? v.toString() : v,
    ).slice(0, 500);
    throw new Error(`Transfer submission failed: ${errStr}`);
  }

  // Poll for confirmation
  let txResult = { status: "PENDING" };
  let attempts = 0;
  while (txResult.status === "PENDING" || txResult.status === "NOT_FOUND") {
    if (attempts++ > 30)
      throw new Error("Transaction confirmation timed out after 45s");
    await new Promise((r) => setTimeout(r, 1500));
    try {
      txResult = await server.getTransaction(sendResult.hash);
    } catch (e) {
      console.log(`Poll attempt ${attempts}: ${e.message}`);
    }
  }

  if (txResult.status !== "SUCCESS") {
    const errStr = JSON.stringify(txResult, (_, v) =>
      typeof v === "bigint" ? v.toString() : v,
    ).slice(0, 500);
    throw new Error(
      `Transfer failed with status ${txResult.status}: ${errStr}`,
    );
  }

  console.log(
    `✓ Token ${tokenId} successfully transferred to ${buyerAddress}: ${sendResult.hash}`,
  );
  return { hash: sendResult.hash };
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
    // 1. Verify this buyer purchased this token
    const saleData = await getTokenSaleData(Number(tokenId));
    if (!saleData)
      return res
        .status(400)
        .json({ error: "No purchase found for this token" });

    if (saleData.buyerEmail.toLowerCase() !== buyerEmail.toLowerCase())
      return res
        .status(403)
        .json({ error: "Email does not match purchase record" });

    // 2. Check if already claimed in KV
    if (saleData.claimed) {
      return res.status(400).json({
        error: "This token has already been claimed",
        buyerWallet: saleData.buyerWallet,
      });
    }

    // 3. Also check on-chain — if owner is not admin, it's already transferred
    const currentOwner = await getTokenOwner(tokenId);
    if (
      currentOwner &&
      currentOwner.toUpperCase() !== ADMIN_WALLET.toUpperCase()
    ) {
      // Already transferred on-chain — just update KV to reflect this
      await markTokenClaimed({
        tokenId: Number(tokenId),
        buyerWallet: currentOwner,
      });
      return res.status(200).json({
        success: true,
        alreadyTransferred: true,
        buyerWallet: currentOwner,
        message: "NFT was already transferred to this wallet",
      });
    }

    // 4. Resolve wallet — use provided or create custodial
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

    // 5. Transfer NFT
    const transfer = await transferNFT(tokenId, wallet);

    // 6. Mark as claimed in KV
    await markTokenClaimed({ tokenId: Number(tokenId), buyerWallet: wallet });

    // 7. Send wallet credentials email if custodial
    if (isCustodial && process.env.RESEND_API_KEY) {
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
