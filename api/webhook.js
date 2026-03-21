// api/webhook.js
// Receives Stripe payment confirmations, transfers NFT, sends confirmation email

const Stripe = require("stripe");
const StellarSdk = require("@stellar/stellar-sdk");
const { basicNodeSigner } = require("@stellar/stellar-sdk/contract");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const STELLAR_CONTRACT =
  process.env.STELLAR_CONTRACT_ID ||
  "CACP7SFR7K5MVX4ZRGOTK4WX5NDPQUTFUJTIGU4LJZVDJGILYT2YRDEQ";
const STELLAR_RPC =
  process.env.STELLAR_RPC_URL || "https://soroban-testnet.stellar.org";
const STELLAR_PASSPHRASE =
  process.env.STELLAR_NETWORK_PASSPHRASE || "Test SDF Network ; September 2015";
const ADMIN_SECRET = process.env.STELLAR_ADMIN_SECRET;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

module.exports.config = { api: { bodyParser: false } };

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

async function transferNFT(tokenId, buyerAddress) {
  const adminKeypair = StellarSdk.Keypair.fromSecret(ADMIN_SECRET);
  const adminPublic = adminKeypair.publicKey();

  console.log(
    `Transferring token ${tokenId} from ${adminPublic} to ${buyerAddress}`,
  );

  const { signTransaction } = basicNodeSigner(adminKeypair, STELLAR_PASSPHRASE);
  const { Client } = await import("../contract-client/dist/index.js");

  const client = new Client({
    contractId: STELLAR_CONTRACT,
    networkPassphrase: STELLAR_PASSPHRASE,
    rpcUrl: STELLAR_RPC,
    publicKey: adminPublic,
    signTransaction,
  });

  // Ownership check before transfer
  try {
    const ownerTx = await client.owner_of({ token_id: BigInt(tokenId) });
    const retval = ownerTx.simulation?.result?.retval;
    if (retval) {
      const currentOwner = StellarSdk.Address.fromScVal(retval).toString();
      console.log(`Token ${tokenId} owner: ${currentOwner}`);
      if (currentOwner !== adminPublic) {
        throw new Error(
          `Cannot transfer token ${tokenId}: Not owned by admin (${adminPublic}). Current owner: ${currentOwner}`,
        );
      }
      console.log(`Ownership verified for token ${tokenId}`);
    }
  } catch (ownerErr) {
    // If it's our own ownership error, rethrow it
    if (ownerErr.message.includes("Cannot transfer token")) throw ownerErr;
    // Otherwise just log and proceed — owner check failed for another reason
    console.log(`Owner check note: ${ownerErr.message}`);
  }

  // Execute transfer
  const tx = await client.transfer({
    from: adminPublic,
    to: buyerAddress,
    token_id: BigInt(tokenId),
  });

  console.log("Transaction assembled — sending...");
  const sendResult = await tx.signAndSend();
  console.log(`Transfer confirmed: ${sendResult.hash}`);

  return { success: true, hash: sendResult.hash };
}

function createCustodialWallet() {
  const keypair = StellarSdk.Keypair.random();
  return { publicKey: keypair.publicKey(), secretKey: keypair.secret() };
}

async function fundTestnetAccount(publicKey) {
  const response = await fetch(
    `https://friendbot.stellar.org?addr=${publicKey}`,
  );
  if (!response.ok) throw new Error("Friendbot failed");
  return response.json();
}

async function sendConfirmationEmail({
  to,
  buyerName,
  pieceName,
  tokenId,
  txHash,
  walletAddress,
  isCustodial,
  custodialSecret,
  amountPaid,
  shippingAddress,
}) {
  const explorerUrl = `https://stellar.expert/explorer/testnet/tx/${txHash}`;
  const walletShort = walletAddress
    ? walletAddress.slice(0, 8) + "..." + walletAddress.slice(-6)
    : "—";

  const custodialSection = isCustodial
    ? `
    <div style="background:#1A1916;border:1px solid rgba(192,97,74,0.4);padding:24px;margin:24px 0;">
      <p style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#C0614A;margin-bottom:12px;">YOUR WALLET — SAVE THIS NOW</p>
      <p style="font-size:13px;color:#F5EFE0;line-height:1.8;margin-bottom:16px;">We created a Stellar wallet for you. Save your secret key — we will never show it again.</p>
      <p style="font-size:10px;color:#7A7060;margin-bottom:4px;">WALLET ADDRESS</p>
      <p style="font-family:monospace;font-size:11px;color:#D4AF6A;word-break:break-all;background:#0C0B09;padding:10px;margin-bottom:12px;">${walletAddress}</p>
      <p style="font-size:10px;color:#7A7060;margin-bottom:4px;">SECRET KEY — NEVER SHARE</p>
      <p style="font-family:monospace;font-size:11px;color:#F5EFE0;word-break:break-all;background:#0C0B09;padding:10px;">${custodialSecret}</p>
    </div>`
    : "";

  const shippingSection = shippingAddress
    ? `
    <div style="margin:24px 0;padding:20px;background:#1A1916;border:1px solid rgba(184,150,62,0.2);">
      <p style="font-size:10px;color:#B8963E;margin-bottom:8px;">SHIPPING ADDRESS</p>
      <p style="font-size:13px;color:#F5EFE0;line-height:1.8;white-space:pre-line;">${shippingAddress}</p>
    </div>`
    : "";

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0C0B09;font-family:Helvetica,Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
  <div style="text-align:center;padding:32px 0;border-bottom:1px solid rgba(184,150,62,0.2);">
    <p style="font-size:10px;letter-spacing:0.4em;text-transform:uppercase;color:#B8963E;">Michael By Christian</p>
    <h1 style="font-family:Georgia,serif;font-size:36px;color:#F5EFE0;margin:8px 0 0;">You now own</h1>
    <h1 style="font-family:Georgia,serif;font-size:36px;font-style:italic;font-weight:400;color:#D4AF6A;margin:4px 0 0;">${pieceName}</h1>
  </div>
  <div style="padding:32px 0;">
    <p style="font-size:14px;color:#9A8E7A;line-height:1.8;">${buyerName ? "Hi " + buyerName + "," : "Hi,"}<br><br>Your purchase is confirmed and your MBC NFT has been transferred to your Stellar wallet.</p>
    <div style="border:1px solid rgba(184,150,62,0.2);margin:24px 0;">
      <div style="padding:12px 20px;background:#1A1916;">
        <p style="font-size:9px;letter-spacing:0.3em;text-transform:uppercase;color:#B8963E;margin:0;">Purchase Summary</p>
      </div>
      <div>
        <div style="padding:10px 20px;border-bottom:1px solid rgba(184,150,62,0.1);"><span style="font-size:12px;color:#7A7060;">Piece: </span><span style="font-size:12px;color:#D4AF6A;">${pieceName}</span></div>
        <div style="padding:10px 20px;border-bottom:1px solid rgba(184,150,62,0.1);"><span style="font-size:12px;color:#7A7060;">Token: </span><span style="font-size:12px;color:#F5EFE0;">#${tokenId}</span></div>
        <div style="padding:10px 20px;border-bottom:1px solid rgba(184,150,62,0.1);"><span style="font-size:12px;color:#7A7060;">Amount: </span><span style="font-size:12px;color:#D4AF6A;">$${(amountPaid / 100).toFixed(0)} USD</span></div>
        <div style="padding:10px 20px;border-bottom:1px solid rgba(184,150,62,0.1);"><span style="font-size:12px;color:#7A7060;">Chain: </span><span style="font-size:12px;color:#F5EFE0;">Stellar · Soroban</span></div>
        <div style="padding:10px 20px;border-bottom:1px solid rgba(184,150,62,0.1);"><span style="font-size:12px;color:#7A7060;">Wallet: </span><span style="font-size:11px;color:#F5EFE0;font-family:monospace;">${walletShort}</span></div>
        <div style="padding:10px 20px;"><span style="font-size:12px;color:#7A7060;">Tx: </span><a href="${explorerUrl}" style="font-size:10px;color:#B8963E;font-family:monospace;word-break:break-all;text-decoration:none;">${txHash}</a></div>
      </div>
    </div>
    ${custodialSection}
    ${shippingSection}
    <div style="text-align:center;margin:32px 0;">
      <a href="${explorerUrl}" style="display:inline-block;padding:16px 36px;background:#B8963E;color:#0C0B09;font-size:10px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;text-decoration:none;">Verify on Stellar ↗</a>
    </div>
    <p style="font-size:12px;color:#7A7060;text-align:center;">Questions? <a href="mailto:youngcompltd@gmail.com" style="color:#B8963E;">youngcompltd@gmail.com</a></p>
  </div>
  <div style="border-top:1px solid rgba(184,150,62,0.2);padding-top:20px;text-align:center;">
    <p style="font-family:Georgia,serif;font-size:13px;color:#7A7060;font-style:italic;">Michael By Christian</p>
  </div>
</div></body></html>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "MBC Michael By Christian <onboarding@resend.dev>",
      to: [to],
      subject: `You now own ${pieceName} — MBC`,
      html,
    }),
  });

  const emailResult = await response.json();
  if (!response.ok)
    throw new Error("Resend error: " + JSON.stringify(emailResult));
  console.log(`Email sent to ${to}`);
  return emailResult;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const rawBody = await getRawBody(req);
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error("Webhook signature failed:", err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  if (event.type !== "checkout.session.completed")
    return res.status(200).json({ received: true });

  const session = event.data.object;
  if (session.payment_status !== "paid")
    return res.status(200).json({ received: true });

  const tokenId = session.metadata.token_id;
  const pieceName = session.metadata.piece_name || `MBC Token #${tokenId}`;
  const buyerEmail = session.customer_details?.email;
  const buyerName = session.customer_details?.name;
  const amountPaid = session.amount_total;

  let shippingAddress = null;
  if (session.shipping_details?.address) {
    const a = session.shipping_details.address;
    shippingAddress = [
      session.shipping_details.name,
      a.line1,
      a.line2,
      `${a.city}, ${a.state} ${a.postal_code}`,
      a.country,
    ]
      .filter(Boolean)
      .join("\n");
  }

  let buyerWallet = session.metadata.buyer_wallet || "";
  if (session.custom_fields) {
    const wf = session.custom_fields.find((f) => f.key === "stellar_wallet");
    if (wf?.text?.value) buyerWallet = wf.text.value.trim();
  }

  const adminPublicKey =
    StellarSdk.Keypair.fromSecret(ADMIN_SECRET).publicKey();
  let custodialWallet = null;

  if (
    !buyerWallet ||
    !buyerWallet.startsWith("G") ||
    buyerWallet === adminPublicKey
  ) {
    console.log(`Creating custodial wallet for ${buyerEmail}`);
    custodialWallet = createCustodialWallet();
    buyerWallet = custodialWallet.publicKey;
    try {
      await fundTestnetAccount(buyerWallet);
      console.log(`Funded: ${buyerWallet}`);
    } catch (e) {
      console.log("Friendbot note:", e.message);
    }
  }

  if (buyerWallet === adminPublicKey) {
    console.error("Cannot transfer to admin wallet");
    return res
      .status(200)
      .json({ received: true, error: "Cannot transfer to admin wallet" });
  }

  try {
    const transfer = await transferNFT(tokenId, buyerWallet);
    console.log(
      `Token ${tokenId} transferred to ${buyerWallet} | tx: ${transfer.hash}`,
    );

    if (buyerEmail) {
      try {
        await sendConfirmationEmail({
          to: buyerEmail,
          buyerName,
          pieceName,
          tokenId,
          txHash: transfer.hash,
          walletAddress: buyerWallet,
          isCustodial: !!custodialWallet,
          custodialSecret: custodialWallet?.secretKey || null,
          amountPaid,
          shippingAddress,
        });
      } catch (emailErr) {
        console.error("Email failed:", emailErr.message);
      }
    }

    return res
      .status(200)
      .json({
        received: true,
        transfer: {
          tokenId,
          buyerWallet,
          txHash: transfer.hash,
          custodial: !!custodialWallet,
        },
      });
  } catch (err) {
    console.error(`Transfer failed for token ${tokenId}:`, err.message);
    // Record failure in Stripe for success page to detect
    try {
      await stripe.paymentIntents.update(session.payment_intent, {
        metadata: {
          transfer_status: "failed",
          transfer_error: err.message.substring(0, 500),
        },
      });
    } catch (e) {
      console.log("Could not update payment intent:", e.message);
    }

    return res
      .status(200)
      .json({ received: true, transfer_failed: true, error: err.message });
  }
};
