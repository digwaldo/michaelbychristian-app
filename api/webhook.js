// api/webhook.js
// Stripe payment webhook
// If buyer has MBC account with wallet → transfer NFT immediately + mark claimed
// If guest → mark sold only, send claim link email

const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const { markTokenSold, markTokenClaimed } = require("./sold");
const { fetchXLMPrice } = require("./xlm-price");
const { createClient } = require("@supabase/supabase-js");
const StellarSdk = require("@stellar/stellar-sdk");

const supabaseAdmin = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

module.exports.config = { api: { bodyParser: false } };

function cleanField(val) {
  if (!val) return null;
  const v = val.trim();
  if (!v) return null;
  if (v.toLowerCase().replace(/\s+/g, "").includes("pleaseselect")) return null;
  if (v === "N/A" || v === "n/a") return null;
  return v;
}

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

// ── Look up buyer's wallet from Supabase by email ─────────────
async function getBuyerWallet(email) {
  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("stellar_wallet_public")
      .eq("email", email.toLowerCase())
      .single();
    if (error || !data?.stellar_wallet_public) return null;
    return data.stellar_wallet_public;
  } catch (e) {
    console.log("getBuyerWallet error:", e.message);
    return null;
  }
}

// ── Transfer NFT on Stellar ───────────────────────────────────
async function transferNFT(tokenId, buyerWallet) {
  const STELLAR_CONTRACT =
    process.env.STELLAR_CONTRACT_ID ||
    "CB7GCGWAHWCF3SAJTYCR7JEFINLJBKA3LV7BZNAI46OXYPYZSTFZ6EMB";
  const STELLAR_RPC =
    process.env.STELLAR_RPC_URL || "https://soroban-testnet.stellar.org";
  const STELLAR_PASSPHRASE =
    process.env.STELLAR_NETWORK_PASSPHRASE ||
    "Test SDF Network ; September 2015";
  const ADMIN_SECRET = process.env.STELLAR_ADMIN_SECRET;

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

  // Use Address() for proper Soroban address encoding
  const fromVal = new StellarSdk.Address(adminPublic).toScVal();
  const toVal = new StellarSdk.Address(buyerWallet).toScVal();
  const tokenIdVal = StellarSdk.nativeToScVal(Number(tokenId), { type: "u64" });

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: "1000000",
    networkPassphrase: STELLAR_PASSPHRASE,
  })
    .addOperation(contract.call("transfer", fromVal, toVal, tokenIdVal))
    .setTimeout(60)
    .build();

  // Simulate to get sorobanData + auth entries
  const sim = await server.simulateTransaction(tx);
  if (!StellarSdk.rpc.Api.isSimulationSuccess(sim)) {
    const errStr = JSON.stringify(sim, (_, v) =>
      typeof v === "bigint" ? v.toString() : v,
    ).slice(0, 500);
    throw new Error(`Transfer simulation failed: ${errStr}`);
  }

  // Assemble + sign
  const preparedTx = StellarSdk.rpc.assembleTransaction(tx, sim).build();
  preparedTx.sign(adminKeypair);

  // Submit
  const sendResult = await server.sendTransaction(preparedTx);
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
    if (attempts++ > 30) throw new Error("Transaction confirmation timed out");
    await new Promise((r) => setTimeout(r, 1500));
    try {
      txResult = await server.getTransaction(sendResult.hash);
    } catch (e) {}
  }

  if (txResult.status !== "SUCCESS") {
    const errStr = JSON.stringify(txResult, (_, v) =>
      typeof v === "bigint" ? v.toString() : v,
    ).slice(0, 500);
    throw new Error(`Transfer not successful: ${txResult.status} — ${errStr}`);
  }

  console.log(
    `✓ Token ${tokenId} transferred to ${buyerWallet}: ${sendResult.hash}`,
  );
  return sendResult.hash;
}

// ── Build item rows for emails ────────────────────────────────
function buildItemRows(items) {
  return items
    .map(
      (item, i) => `
    <div style="padding:14px 20px;border-bottom:1px solid rgba(184,150,62,0.1);background:${i % 2 === 0 ? "#1A1916" : "#141210"};">
      <div style="margin-bottom:4px;">
        <span style="font-size:13px;color:#D4AF6A;font-weight:600;">${item.name}</span>
        <span style="font-size:11px;color:#5BAF85;float:right;">$${(item.amount / 100).toFixed(0)} USD</span>
      </div>
      <span style="font-size:11px;color:#7A7060;">Token #${item.tokenId}</span>
      ${item.txHash ? `<span style="font-size:10px;color:#5BAF85;margin-left:10px;">✦ NFT Transferred</span>` : ""}
    </div>
  `,
    )
    .join("");
}

// ── Build claim/view buttons per item ─────────────────────────
function buildActionButtons(items, hasWallet) {
  return items
    .map(
      (item) => `
    <div style="margin-bottom:12px;padding:16px;background:#1A1916;border:1px solid rgba(184,150,62,0.2);">
      <p style="font-size:11px;color:#B8963E;margin:0 0 4px;letter-spacing:0.15em;text-transform:uppercase;">
        ${item.name} · Token #${item.tokenId}
      </p>
      ${
        item.txHash
          ? `<p style="font-size:11px;color:#5BAF85;margin:0 0 10px;">✦ NFT transferred to your wallet</p>`
          : `<p style="font-size:11px;color:#9A8E7A;margin:0 0 10px;">Scan the NFC chip when your bag arrives to claim your NFT.</p>`
      }
      <a href="https://michaelbychristian-app.vercel.app/piece/${item.tokenId}"
         style="display:inline-block;padding:10px 20px;background:#B8963E;color:#0C0B09;font-size:9px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;text-decoration:none;">
        ${item.txHash ? `View Token #${item.tokenId} →` : `Claim Token #${item.tokenId} →`}
      </a>
    </div>
  `,
    )
    .join("");
}

// ── Buyer confirmation email ───────────────────────────────────
async function sendBuyerEmail({
  to,
  buyerName,
  items,
  totalPaid,
  shippingAddress,
  billingAddress,
  sameAsBilling,
  buyerWallet,
}) {
  const isMulti = items.length > 1;
  const allTransferred = items.every((i) => i.txHash);
  const someTransferred = items.some((i) => i.txHash);
  const orderTitle = isMulti ? `${items.length} Pieces Secured` : items[0].name;

  const walletSection = buyerWallet
    ? `<div style="margin:24px 0;padding:16px;background:#1A1916;border:1px solid rgba(91,175,133,0.3);">
        <p style="font-size:10px;color:#5BAF85;margin:0 0 6px;letter-spacing:0.2em;text-transform:uppercase;">Your Stellar Wallet</p>
        <p style="font-family:monospace;font-size:11px;color:#D4AF6A;margin:0;word-break:break-all;">${buyerWallet}</p>
       </div>`
    : "";

  const shippingSection = shippingAddress
    ? `<div style="margin:24px 0;padding:20px;background:#1A1916;border:1px solid rgba(184,150,62,0.2);">
        <p style="font-size:10px;color:#B8963E;margin-bottom:8px;">SHIPPING ADDRESS${sameAsBilling ? " (Same as Billing)" : ""}</p>
        <p style="font-size:13px;color:#F5EFE0;line-height:1.8;white-space:pre-line;">${shippingAddress}</p>
       </div>`
    : "";

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0C0B09;font-family:Helvetica,Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
  <div style="text-align:center;padding:32px 0;border-bottom:1px solid rgba(184,150,62,0.2);">
    <p style="font-size:10px;letter-spacing:0.4em;text-transform:uppercase;color:#B8963E;margin:0 0 8px;">Michael By Christian</p>
    <h1 style="font-family:Georgia,serif;font-size:32px;color:#F5EFE0;margin:0 0 6px;">Order Confirmed</h1>
    <h2 style="font-family:Georgia,serif;font-size:22px;font-style:italic;font-weight:400;color:#D4AF6A;margin:0;">${orderTitle}</h2>
  </div>

  <div style="padding:32px 0;">
    <p style="font-size:14px;color:#9A8E7A;line-height:1.8;">
      ${buyerName ? "Hi " + buyerName + "," : "Hi,"}<br><br>
      ${
        allTransferred
          ? `Your payment has been confirmed and your NFT${isMulti ? "s have" : " has"} been transferred directly to your wallet. Your ${isMulti ? "bags are" : "bag is"} being prepared for shipment.`
          : someTransferred
            ? `Your payment has been confirmed. Some NFTs have been transferred to your wallet. ${isMulti ? "Bags are" : "Your bag is"} being prepared for shipment.`
            : `Your payment has been confirmed. Your ${isMulti ? "bags are" : "bag is"} being prepared for shipment. Scan the NFC chip when ${isMulti ? "they arrive" : "it arrives"} to claim your NFT${isMulti ? "s" : ""}.`
      }
    </p>

    <!-- Order summary -->
    <div style="border:1px solid rgba(184,150,62,0.2);margin:24px 0;overflow:hidden;">
      <div style="padding:12px 20px;background:#1A1916;border-bottom:1px solid rgba(184,150,62,0.2);">
        <p style="font-size:9px;letter-spacing:0.3em;text-transform:uppercase;color:#B8963E;margin:0;">Order Summary${isMulti ? ` · ${items.length} Pieces` : ""}</p>
      </div>
      ${buildItemRows(items)}
      <div style="padding:12px 20px;background:#0C0B09;">
        <span style="font-size:12px;color:#7A7060;">Total Paid: </span>
        <span style="font-size:14px;color:#D4AF6A;font-weight:700;">$${(totalPaid / 100).toFixed(0)} USD</span>
      </div>
    </div>

    ${walletSection}
    ${shippingSection}

    <!-- Action buttons per item -->
    <div style="margin:24px 0;">
      <p style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#B8963E;margin-bottom:16px;">
        Your Authentication Contract${isMulti ? "s" : ""}
      </p>
      ${buildActionButtons(items, !!buyerWallet)}
    </div>

    <p style="font-size:12px;color:#7A7060;text-align:center;">
      Questions? <a href="mailto:youngcompltd@gmail.com" style="color:#B8963E;">youngcompltd@gmail.com</a>
    </p>
  </div>
  <div style="border-top:1px solid rgba(184,150,62,0.2);padding-top:20px;text-align:center;">
    <p style="font-family:Georgia,serif;font-size:13px;color:#7A7060;font-style:italic;">Michael By Christian</p>
  </div>
</div></body></html>`;

  const subject = isMulti
    ? `Order Confirmed — ${items.length} Pieces · MBC`
    : `Order Confirmed — ${items[0].name} · MBC`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "MBC Michael By Christian <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error("Resend error: " + JSON.stringify(result));
  console.log(`Buyer email sent to ${to}`);
}

// ── Owner notification email ──────────────────────────────────
async function sendOwnerEmail({
  items,
  totalPaid,
  buyerName,
  buyerEmail,
  shippingAddress,
  billingAddress,
  buyerWallet,
}) {
  const isMulti = items.length > 1;
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0C0B09;font-family:Helvetica,Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
  <div style="text-align:center;padding:32px 0;border-bottom:1px solid rgba(184,150,62,0.2);">
    <p style="font-size:10px;letter-spacing:0.4em;text-transform:uppercase;color:#B8963E;margin:0 0 8px;">MBC — New Sale</p>
    <h1 style="font-family:Georgia,serif;font-size:32px;color:#F5EFE0;margin:0 0 8px;">💰 ${isMulti ? `${items.length} Pieces Sold` : items[0].name}</h1>
    <h2 style="font-family:Georgia,serif;font-size:28px;color:#5BAF85;margin:0;">$${(totalPaid / 100).toFixed(0)} USD</h2>
  </div>
  <div style="padding:32px 0;">
    <div style="border:1px solid rgba(184,150,62,0.2);margin:0 0 24px;overflow:hidden;">
      <div style="padding:12px 20px;background:#1A1916;border-bottom:1px solid rgba(184,150,62,0.2);">
        <p style="font-size:9px;letter-spacing:0.3em;text-transform:uppercase;color:#B8963E;margin:0;">Items Sold</p>
      </div>
      ${buildItemRows(items)}
      <div style="padding:12px 20px;background:#0C0B09;">
        <span style="font-size:12px;color:#7A7060;">Total: </span>
        <span style="font-size:14px;color:#5BAF85;font-weight:700;">$${(totalPaid / 100).toFixed(0)} USD</span>
      </div>
    </div>
    <div style="border:1px solid rgba(184,150,62,0.2);overflow:hidden;">
      <div style="padding:12px 20px;background:#1A1916;border-bottom:1px solid rgba(184,150,62,0.2);">
        <p style="font-size:9px;letter-spacing:0.3em;text-transform:uppercase;color:#B8963E;margin:0;">Buyer Details</p>
      </div>
      <div style="padding:10px 20px;border-bottom:1px solid rgba(184,150,62,0.1);">
        <span style="font-size:12px;color:#7A7060;">Name: </span><span style="font-size:12px;color:#F5EFE0;">${buyerName || "—"}</span>
      </div>
      <div style="padding:10px 20px;border-bottom:1px solid rgba(184,150,62,0.1);">
        <span style="font-size:12px;color:#7A7060;">Email: </span><span style="font-size:12px;color:#F5EFE0;">${buyerEmail || "—"}</span>
      </div>
      <div style="padding:10px 20px;border-bottom:1px solid rgba(184,150,62,0.1);">
        <span style="font-size:12px;color:#7A7060;">Wallet: </span>
        <span style="font-size:11px;color:${buyerWallet ? "#5BAF85" : "#7A7060"};font-family:monospace;">${buyerWallet || "Guest — no wallet yet"}</span>
      </div>
      <div style="padding:10px 20px;border-bottom:1px solid rgba(184,150,62,0.1);">
        <span style="font-size:12px;color:#7A7060;">NFT Transfer: </span>
        <span style="font-size:12px;color:${items.some((i) => i.txHash) ? "#5BAF85" : "#C0614A"};">
          ${items.some((i) => i.txHash) ? "✦ Auto-transferred" : "Pending claim by buyer"}
        </span>
      </div>
      <div style="padding:10px 20px;border-bottom:1px solid rgba(184,150,62,0.1);">
        <span style="font-size:12px;color:#7A7060;">Shipping: </span>
        <span style="font-size:12px;color:#F5EFE0;white-space:pre-line;">${shippingAddress || "Not provided yet"}</span>
      </div>
      <div style="padding:10px 20px;">
        <span style="font-size:12px;color:#7A7060;">Billing: </span>
        <span style="font-size:12px;color:#F5EFE0;white-space:pre-line;">${billingAddress || "Not provided yet"}</span>
      </div>
    </div>
    <p style="font-size:12px;color:#7A7060;text-align:center;margin-top:24px;">
      View in <a href="https://dashboard.stripe.com/test/payments" style="color:#B8963E;">Stripe Dashboard</a>
    </p>
  </div>
</div></body></html>`;

  const subject = isMulti
    ? `💰 New Sale — ${items.length} Pieces · $${(totalPaid / 100).toFixed(0)} USD`
    : `💰 New Sale — ${items[0].name} · $${(totalPaid / 100).toFixed(0)} USD`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "MBC Store <onboarding@resend.dev>",
      to: ["digwaldo@gmail.com"],
      subject,
      html,
    }),
  });
  console.log("Owner notification sent");
}

// ── Main handler ──────────────────────────────────────────────
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

  // Parse token IDs and names
  const tokenIdsRaw = session.metadata?.token_ids || session.metadata?.token_id;
  const tokenIds = tokenIdsRaw
    ? String(tokenIdsRaw)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const bagNamesRaw =
    session.metadata?.bag_names || session.metadata?.bag_name || "";
  const bagNames = bagNamesRaw
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);

  const buyerEmail = session.customer_details?.email;
  const buyerName = session.customer_details?.name;
  const totalPaid = session.amount_total;
  const perItemAmount =
    tokenIds.length > 1 ? Math.round(totalPaid / tokenIds.length) : totalPaid;

  // Build address strings
  let shippingAddress = null;
  let shippingSameAsBilling = false;
  const shippingSrc =
    session.collected_information?.shipping_details ||
    session.shipping_details ||
    null;
  if (shippingSrc?.address) {
    const a = shippingSrc.address;
    const czp = [
      cleanField(a.city),
      cleanField(a.state),
      cleanField(a.postal_code),
    ]
      .filter(Boolean)
      .join(", ");
    shippingAddress = [
      cleanField(shippingSrc.name),
      cleanField(a.line1),
      cleanField(a.line2),
      czp || null,
      cleanField(a.country),
    ]
      .filter(Boolean)
      .join("\n");
  }
  let billingAddress = null;
  if (session.customer_details?.address) {
    const b = session.customer_details.address;
    const czp = [
      cleanField(b.city),
      cleanField(b.state),
      cleanField(b.postal_code),
    ]
      .filter(Boolean)
      .join(", ");
    const lines = [
      cleanField(session.customer_details.name),
      cleanField(b.line1),
      cleanField(b.line2),
      czp || null,
      cleanField(b.country),
    ].filter(Boolean);
    if (lines.length > 1) billingAddress = lines.join("\n");
  }
  if (shippingAddress && billingAddress && shippingAddress === billingAddress)
    shippingSameAsBilling = true;

  // Check if buyer has MBC account with wallet
  let buyerWallet = null;
  if (buyerEmail) {
    buyerWallet = await getBuyerWallet(buyerEmail);
    console.log(
      buyerWallet
        ? `Buyer ${buyerEmail} has wallet ${buyerWallet} — will auto-transfer`
        : `Buyer ${buyerEmail} is a guest — claim flow required`,
    );
  }

  // Fetch XLM price once
  let xlmPriceAtPurchase = null;
  try {
    xlmPriceAtPurchase = await fetchXLMPrice();
  } catch (e) {
    console.log("XLM price failed:", e.message);
  }

  // ── Process each token ───────────────────────────────────────
  const soldItems = [];
  for (let idx = 0; idx < tokenIds.length; idx++) {
    const tid = tokenIds[idx];
    const itemName = bagNames[idx] || `MBC Token #${tid}`;
    const xlmEquivalent = xlmPriceAtPurchase
      ? perItemAmount / 100 / xlmPriceAtPurchase
      : null;
    let txHash = null;

    // Mark sold in KV first
    try {
      await markTokenSold({
        tokenId: Number(tid),
        buyerEmail,
        buyerName,
        amount: perItemAmount,
        shippingAddress,
        pieceName: itemName,
        xlmPriceAtPurchase,
        xlmEquivalent,
        xlmPriceBaseline: xlmPriceAtPurchase,
      });
      console.log(`Token ${tid} marked as sold`);
    } catch (kvErr) {
      console.error(`KV mark-sold failed for token ${tid}:`, kvErr.message);
    }

    // If buyer has wallet → transfer NFT immediately
    if (buyerWallet) {
      try {
        txHash = await transferNFT(tid, buyerWallet);
        await markTokenClaimed({ tokenId: Number(tid), buyerWallet });
        console.log(`Token ${tid} auto-transferred to ${buyerWallet}`);
      } catch (transferErr) {
        console.error(
          `Auto-transfer failed for token ${tid}:`,
          transferErr.message,
        );
        // Don't block — item is marked sold, buyer can claim manually if transfer fails
      }
    }

    soldItems.push({
      tokenId: tid,
      name: itemName,
      amount: perItemAmount,
      txHash,
    });
  }

  // ── Send emails ──────────────────────────────────────────────
  const sendTo = buyerEmail || "digwaldo@gmail.com";
  try {
    await sendBuyerEmail({
      to: "digwaldo@gmail.com",
      buyerName,
      items: soldItems,
      totalPaid,
      shippingAddress,
      billingAddress,
      sameAsBilling: shippingSameAsBilling,
      buyerWallet,
    });
  } catch (emailErr) {
    console.error("Buyer email failed:", emailErr.message);
  }

  try {
    await sendOwnerEmail({
      items: soldItems,
      totalPaid,
      buyerName,
      buyerEmail,
      shippingAddress,
      billingAddress,
      buyerWallet,
    });
  } catch (ownerErr) {
    console.error("Owner email failed:", ownerErr.message);
  }

  return res.status(200).json({ received: true });
};
