// api/webhook.js
// Receives Stripe payment confirmations, sends confirmation email
// NFT transfer is skipped for now — will be added later

const Stripe = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const { markTokenSold } = require("./sold");
const { fetchXLMPrice } = require("./xlm-price");

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

async function sendConfirmationEmail({
  to,
  buyerName,
  pieceName,
  tokenId,
  amountPaid,
  shippingAddress,
  billingAddress,
  sameAsBilling,
}) {
  const shippingSection = shippingAddress
    ? `<div style="margin:24px 0;padding:20px;background:#1A1916;border:1px solid rgba(184,150,62,0.2);">
        <p style="font-size:10px;color:#B8963E;margin-bottom:8px;">SHIPPING ADDRESS${sameAsBilling ? " (Same as Billing)" : ""}</p>
        <p style="font-size:13px;color:#F5EFE0;line-height:1.8;white-space:pre-line;">${shippingAddress}</p>
       </div>`
    : "";

  const billingSection = billingAddress
    ? `<div style="margin:24px 0;padding:20px;background:#1A1916;border:1px solid rgba(184,150,62,0.2);">
        <p style="font-size:10px;color:#B8963E;margin-bottom:8px;">BILLING ADDRESS</p>
        <p style="font-size:13px;color:#F5EFE0;line-height:1.8;white-space:pre-line;">${billingAddress}</p>
       </div>`
    : "";

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0C0B09;font-family:Helvetica,Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
  <div style="text-align:center;padding:32px 0;border-bottom:1px solid rgba(184,150,62,0.2);">
    <p style="font-size:10px;letter-spacing:0.4em;text-transform:uppercase;color:#B8963E;">Michael By Christian</p>
    <h1 style="font-family:Georgia,serif;font-size:36px;color:#F5EFE0;margin:8px 0 0;">Order Confirmed</h1>
    <h1 style="font-family:Georgia,serif;font-size:36px;font-style:italic;font-weight:400;color:#D4AF6A;margin:4px 0 0;">${pieceName}</h1>
  </div>
  <div style="padding:32px 0;">
    <p style="font-size:14px;color:#9A8E7A;line-height:1.8;">
      ${buyerName ? "Hi " + buyerName + "," : "Hi,"}<br><br>
      Your payment has been confirmed. Your bag is being prepared for shipment. Once it arrives, scan the NFC chip or use the claim link below to receive your Authentication Contract (NFT).
    </p>
    <div style="border:1px solid rgba(184,150,62,0.2);margin:24px 0;">
      <div style="padding:12px 20px;background:#1A1916;">
        <p style="font-size:9px;letter-spacing:0.3em;text-transform:uppercase;color:#B8963E;margin:0;">Order Summary</p>
      </div>
      <div>
        <div style="padding:10px 20px;border-bottom:1px solid rgba(184,150,62,0.1);">
          <span style="font-size:12px;color:#7A7060;">Piece: </span>
          <span style="font-size:12px;color:#D4AF6A;">${pieceName}</span>
        </div>
        <div style="padding:10px 20px;border-bottom:1px solid rgba(184,150,62,0.1);">
          <span style="font-size:12px;color:#7A7060;">Token: </span>
          <span style="font-size:12px;color:#F5EFE0;">#${tokenId}</span>
        </div>
        <div style="padding:10px 20px;border-bottom:1px solid rgba(184,150,62,0.1);">
          <span style="font-size:12px;color:#7A7060;">Amount Paid: </span>
          <span style="font-size:12px;color:#D4AF6A;">$${(amountPaid / 100).toFixed(0)} USD</span>
        </div>
        <div style="padding:10px 20px;">
          <span style="font-size:12px;color:#7A7060;">Status: </span>
          <span style="font-size:12px;color:#5BAF85;">Payment Confirmed ✓</span>
        </div>
      </div>
    </div>
    ${shippingSection}
    ${billingSection}
    <div style="background:#1A1916;border:1px solid rgba(184,150,62,0.2);padding:20px;margin:24px 0;">
      <p style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#B8963E;margin-bottom:8px;">Claim Your NFT</p>
      <p style="font-size:12px;color:#9A8E7A;line-height:1.8;margin:0 0 12px;">When your bag arrives, scan the NFC chip or click below to claim your Authentication Contract:</p>
      <a href="https://michaelbychristian-app.vercel.app/piece/${tokenId}" style="display:inline-block;padding:12px 24px;background:#B8963E;color:#0C0B09;font-size:9px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;text-decoration:none;">Claim Token #${tokenId} →</a>
    </div>
    <p style="font-size:12px;color:#7A7060;text-align:center;">
      Questions? <a href="mailto:youngcompltd@gmail.com" style="color:#B8963E;">youngcompltd@gmail.com</a>
    </p>
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
      to: "digwaldo@gmail.com", // hardcoded for now since buyer email can be unreliable
      subject:
        tokenIds.length > 1
          ? `Order Confirmed — ${tokenIds.length} Pieces · MBC`
          : `Order Confirmed — ${pieceName} · MBC`,
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

  // Support both single token_id and multi-item token_ids
  const tokenIdsRaw = session.metadata?.token_ids || session.metadata?.token_id;
  const tokenIds = tokenIdsRaw
    ? String(tokenIdsRaw)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const tokenId = tokenIds[0]; // primary token for backwards compat
  const bagNamesRaw =
    session.metadata?.bag_names || session.metadata?.bag_name || "";
  const bagNames = bagNamesRaw
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
  const pieceName = bagNames[0] || `MBC Token #${tokenId}`;
  const buyerEmail = session.customer_details?.email;
  const buyerName = session.customer_details?.name;
  const amountPaid = session.amount_total;
  // Per-item amount (split evenly if multi-item — Stripe doesn't break it out)
  const perItemAmount =
    tokenIds.length > 1 ? Math.round(amountPaid / tokenIds.length) : amountPaid;

  let shippingAddress = null;
  let shippingSameAsBilling = false;

  const shippingSrc =
    session.collected_information?.shipping_details ||
    session.shipping_details ||
    null;
  if (shippingSrc?.address) {
    const a = shippingSrc.address;
    const cityStateZip = [
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
      cityStateZip || null,
      cleanField(a.country),
    ]
      .filter(Boolean)
      .join("\n");
  }

  let billingAddress = null;
  if (session.customer_details?.address) {
    const b = session.customer_details.address;
    const cityStateZip2 = [
      cleanField(b.city),
      cleanField(b.state),
      cleanField(b.postal_code),
    ]
      .filter(Boolean)
      .join(", ");
    const billingLines = [
      cleanField(session.customer_details.name),
      cleanField(b.line1),
      cleanField(b.line2),
      cityStateZip2 || null,
      cleanField(b.country),
    ].filter(Boolean);
    if (billingLines.length > 1) billingAddress = billingLines.join("\n");
  }

  if (shippingAddress && billingAddress && shippingAddress === billingAddress) {
    shippingSameAsBilling = true;
  }

  // ── Mark ALL tokens as sold in KV + record XLM price ──
  let xlmPriceAtPurchase = null;
  try {
    xlmPriceAtPurchase = await fetchXLMPrice();
  } catch (priceErr) {
    console.log("XLM price fetch failed:", priceErr.message);
  }

  for (let idx = 0; idx < tokenIds.length; idx++) {
    const tid = tokenIds[idx];
    const itemAmount = perItemAmount;
    const xlmEquivalent = xlmPriceAtPurchase
      ? itemAmount / 100 / xlmPriceAtPurchase
      : null;
    const itemName = bagNames[idx] || `MBC Token #${tid}`;
    try {
      await markTokenSold({
        tokenId: Number(tid),
        buyerEmail,
        buyerName,
        amount: itemAmount,
        shippingAddress,
        pieceName: itemName,
        xlmPriceAtPurchase,
        xlmEquivalent,
        xlmPriceBaseline: xlmPriceAtPurchase,
      });
      console.log(`Marked token ${tid} as sold`);
    } catch (kvErr) {
      console.error(`KV mark-sold failed for token ${tid}:`, kvErr.message);
    }
  }

  // ── Send confirmation email to buyer ──
  const sendTo = buyerEmail || "digwaldo@gmail.com";
  try {
    await sendConfirmationEmail({
      to: ["digwaldo@gmail.com"], // hardcoded for now since buyer email can be unreliable
      buyerName,
      pieceName,
      tokenId,
      amountPaid,
      shippingAddress,
      billingAddress,
      sameAsBilling: shippingSameAsBilling,
    });
    console.log(`Confirmation email sent to ${sendTo}`);
  } catch (emailErr) {
    console.error("Buyer email failed:", emailErr.message);
  }

  // ── Send sale notification to owner ──
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "MBC Store <onboarding@resend.dev>",
        to: ["digwaldo@gmail.com"],
        subject:
          tokenIds.length > 1
            ? `💰 New Sale — ${tokenIds.length} Pieces · ${(amountPaid / 100).toFixed(0)} USD`
            : `💰 New Sale — ${pieceName} · ${(amountPaid / 100).toFixed(0)} USD`,
        html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0C0B09;font-family:Helvetica,Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
  <div style="text-align:center;padding:32px 0;border-bottom:1px solid rgba(184,150,62,0.2);">
    <p style="font-size:10px;letter-spacing:0.4em;text-transform:uppercase;color:#B8963E;">MBC — New Sale</p>
    <h1 style="font-family:Georgia,serif;font-size:36px;color:#F5EFE0;margin:8px 0 0;">💰 ${pieceName}</h1>
    <h2 style="font-family:Georgia,serif;font-size:28px;color:#5BAF85;margin:8px 0 0;">${(amountPaid / 100).toFixed(0)} USD</h2>
  </div>
  <div style="padding:32px 0;">
    <div style="border:1px solid rgba(184,150,62,0.2);margin:24px 0;">
      <div style="padding:12px 20px;background:#1A1916;">
        <p style="font-size:9px;letter-spacing:0.3em;text-transform:uppercase;color:#B8963E;margin:0;">Order Details</p>
      </div>
      <div>
        <div style="padding:10px 20px;border-bottom:1px solid rgba(184,150,62,0.1);"><span style="font-size:12px;color:#7A7060;">Piece: </span><span style="font-size:12px;color:#D4AF6A;">${pieceName}</span></div>
        <div style="padding:10px 20px;border-bottom:1px solid rgba(184,150,62,0.1);"><span style="font-size:12px;color:#7A7060;">Token ID: </span><span style="font-size:12px;color:#F5EFE0;">#${tokenId}</span></div>
        <div style="padding:10px 20px;border-bottom:1px solid rgba(184,150,62,0.1);"><span style="font-size:12px;color:#7A7060;">Amount: </span><span style="font-size:12px;color:#5BAF85;">${(amountPaid / 100).toFixed(0)} USD</span></div>
        <div style="padding:10px 20px;border-bottom:1px solid rgba(184,150,62,0.1);"><span style="font-size:12px;color:#7A7060;">Buyer: </span><span style="font-size:12px;color:#F5EFE0;">${buyerName || "—"}</span></div>
        <div style="padding:10px 20px;border-bottom:1px solid rgba(184,150,62,0.1);"><span style="font-size:12px;color:#7A7060;">Buyer Email: </span><span style="font-size:12px;color:#F5EFE0;">${buyerEmail || "—"}</span></div>
        <div style="padding:10px 20px;border-bottom:1px solid rgba(184,150,62,0.1);"><span style="font-size:12px;color:#7A7060;">Shipping${shippingSameAsBilling ? " (Same as Billing)" : ""}: </span><span style="font-size:12px;color:#F5EFE0;white-space:pre-line;">${shippingAddress || "Not provided yet"}</span></div>
        <div style="padding:10px 20px;"><span style="font-size:12px;color:#7A7060;">Billing: </span><span style="font-size:12px;color:#F5EFE0;white-space:pre-line;">${billingAddress || "Not provided yet"}</span></div>
      </div>
    </div>
    <p style="font-size:12px;color:#7A7060;text-align:center;">View in <a href="https://dashboard.stripe.com/test/payments" style="color:#B8963E;">Stripe Dashboard</a></p>
  </div>
</div></body></html>`,
      }),
    });
    console.log("Owner notification sent");
  } catch (ownerEmailErr) {
    console.error("Owner email failed:", ownerEmailErr.message);
  }

  return res.status(200).json({ received: true });
};
