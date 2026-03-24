// api/webhook.js
// Receives Stripe payment confirmations, sends confirmation emails
// Handles both single and multi-item cart purchases

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

// ── Build order rows HTML for a list of items ─────────────────
function buildItemRows(items) {
  return items
    .map(
      (item, i) => `
    <div style="padding:14px 20px;border-bottom:1px solid rgba(184,150,62,0.1);background:${i % 2 === 0 ? "#1A1916" : "#141210"};">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <span style="font-size:13px;color:#D4AF6A;font-weight:600;">${item.name}</span>
        <span style="font-size:12px;color:#5BAF85;">$${(item.amount / 100).toFixed(0)} USD</span>
      </div>
      <span style="font-size:11px;color:#7A7060;">Token #${item.tokenId}</span>
    </div>
  `,
    )
    .join("");
}

// ── Build claim buttons for each item ─────────────────────────
function buildClaimButtons(items) {
  return items
    .map(
      (item) => `
    <div style="margin-bottom:12px;padding:16px;background:#1A1916;border:1px solid rgba(184,150,62,0.2);">
      <p style="font-size:11px;color:#B8963E;margin:0 0 8px;letter-spacing:0.15em;text-transform:uppercase;">${item.name} · Token #${item.tokenId}</p>
      <a href="https://michaelbychristian-app.vercel.app/piece/${item.tokenId}"
         style="display:inline-block;padding:10px 20px;background:#B8963E;color:#0C0B09;font-size:9px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;text-decoration:none;">
        Claim Token #${item.tokenId} →
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
}) {
  const isMulti = items.length > 1;
  const orderTitle = isMulti ? `${items.length} Pieces Secured` : items[0].name;

  const shippingSection = shippingAddress
    ? `<div style="margin:24px 0;padding:20px;background:#1A1916;border:1px solid rgba(184,150,62,0.2);">
        <p style="font-size:10px;color:#B8963E;margin-bottom:8px;">SHIPPING ADDRESS${sameAsBilling ? " (Same as Billing)" : ""}</p>
        <p style="font-size:13px;color:#F5EFE0;line-height:1.8;white-space:pre-line;">${shippingAddress}</p>
       </div>`
    : "";

  const billingSection =
    billingAddress && !sameAsBilling
      ? `<div style="margin:24px 0;padding:20px;background:#1A1916;border:1px solid rgba(184,150,62,0.2);">
        <p style="font-size:10px;color:#B8963E;margin-bottom:8px;">BILLING ADDRESS</p>
        <p style="font-size:13px;color:#F5EFE0;line-height:1.8;white-space:pre-line;">${billingAddress}</p>
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
      Your payment has been confirmed. ${isMulti ? "Your bags are" : "Your bag is"} being prepared for shipment.
      Once ${isMulti ? "they arrive" : "it arrives"}, scan the NFC chip or use the claim links below to receive your Authentication Contract${isMulti ? "s" : ""} (NFT${isMulti ? "s" : ""}).
    </p>

    <!-- Order summary -->
    <div style="border:1px solid rgba(184,150,62,0.2);margin:24px 0;overflow:hidden;">
      <div style="padding:12px 20px;background:#1A1916;border-bottom:1px solid rgba(184,150,62,0.2);">
        <p style="font-size:9px;letter-spacing:0.3em;text-transform:uppercase;color:#B8963E;margin:0;">
          Order Summary${isMulti ? ` · ${items.length} Pieces` : ""}
        </p>
      </div>
      ${buildItemRows(items)}
      <div style="padding:12px 20px;background:#0C0B09;display:flex;justify-content:space-between;">
        <span style="font-size:12px;color:#7A7060;">Total Paid</span>
        <span style="font-size:14px;color:#D4AF6A;font-weight:700;">$${(totalPaid / 100).toFixed(0)} USD</span>
      </div>
    </div>

    ${shippingSection}
    ${billingSection}

    <!-- Claim section -->
    <div style="margin:24px 0;">
      <p style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#B8963E;margin-bottom:16px;">
        Claim Your NFT${isMulti ? "s" : ""}
      </p>
      <p style="font-size:12px;color:#9A8E7A;line-height:1.8;margin:0 0 16px;">
        When your ${isMulti ? "bags arrive" : "bag arrives"}, scan the NFC chip or click below to claim each Authentication Contract:
      </p>
      ${buildClaimButtons(items)}
    </div>

    <p style="font-size:12px;color:#7A7060;text-align:center;margin-top:24px;">
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
  return result;
}

// ── Owner sale notification email ─────────────────────────────
async function sendOwnerEmail({
  items,
  totalPaid,
  buyerName,
  buyerEmail,
  shippingAddress,
  billingAddress,
}) {
  const isMulti = items.length > 1;

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0C0B09;font-family:Helvetica,Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">

  <div style="text-align:center;padding:32px 0;border-bottom:1px solid rgba(184,150,62,0.2);">
    <p style="font-size:10px;letter-spacing:0.4em;text-transform:uppercase;color:#B8963E;margin:0 0 8px;">MBC — New Sale</p>
    <h1 style="font-family:Georgia,serif;font-size:32px;color:#F5EFE0;margin:0 0 8px;">
      💰 ${isMulti ? `${items.length} Pieces Sold` : items[0].name}
    </h1>
    <h2 style="font-family:Georgia,serif;font-size:28px;color:#5BAF85;margin:0;">
      $${(totalPaid / 100).toFixed(0)} USD
    </h2>
  </div>

  <div style="padding:32px 0;">

    <!-- Items sold -->
    <div style="border:1px solid rgba(184,150,62,0.2);margin:0 0 24px;overflow:hidden;">
      <div style="padding:12px 20px;background:#1A1916;border-bottom:1px solid rgba(184,150,62,0.2);">
        <p style="font-size:9px;letter-spacing:0.3em;text-transform:uppercase;color:#B8963E;margin:0;">
          Items Sold
        </p>
      </div>
      ${buildItemRows(items)}
      <div style="padding:12px 20px;background:#0C0B09;display:flex;justify-content:space-between;">
        <span style="font-size:12px;color:#7A7060;">Total</span>
        <span style="font-size:14px;color:#5BAF85;font-weight:700;">$${(totalPaid / 100).toFixed(0)} USD</span>
      </div>
    </div>

    <!-- Buyer details -->
    <div style="border:1px solid rgba(184,150,62,0.2);overflow:hidden;margin-bottom:24px;">
      <div style="padding:12px 20px;background:#1A1916;border-bottom:1px solid rgba(184,150,62,0.2);">
        <p style="font-size:9px;letter-spacing:0.3em;text-transform:uppercase;color:#B8963E;margin:0;">Buyer Details</p>
      </div>
      <div style="padding:10px 20px;border-bottom:1px solid rgba(184,150,62,0.1);">
        <span style="font-size:12px;color:#7A7060;">Name: </span>
        <span style="font-size:12px;color:#F5EFE0;">${buyerName || "—"}</span>
      </div>
      <div style="padding:10px 20px;border-bottom:1px solid rgba(184,150,62,0.1);">
        <span style="font-size:12px;color:#7A7060;">Email: </span>
        <span style="font-size:12px;color:#F5EFE0;">${buyerEmail || "—"}</span>
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

    <p style="font-size:12px;color:#7A7060;text-align:center;">
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

// ── Main webhook handler ───────────────────────────────────────
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

  console.log("FULL SESSION:", JSON.stringify(session, null, 2));

  // Parse token IDs and names — support multi-item
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
  if (shippingAddress && billingAddress && shippingAddress === billingAddress) {
    shippingSameAsBilling = true;
  }

  // Fetch XLM price once for all items
  let xlmPriceAtPurchase = null;
  try {
    xlmPriceAtPurchase = await fetchXLMPrice();
  } catch (e) {
    console.log("XLM price fetch failed:", e.message);
  }

  // ── Mark ALL tokens sold in KV ──────────────────────────────
  const soldItems = [];
  for (let idx = 0; idx < tokenIds.length; idx++) {
    const tid = tokenIds[idx];
    const itemName = bagNames[idx] || `MBC Token #${tid}`;
    const xlmEquivalent = xlmPriceAtPurchase
      ? perItemAmount / 100 / xlmPriceAtPurchase
      : null;
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
      soldItems.push({ tokenId: tid, name: itemName, amount: perItemAmount });
      console.log(`Marked token ${tid} as sold`);
    } catch (kvErr) {
      console.error(`KV mark-sold failed for token ${tid}:`, kvErr.message);
      soldItems.push({ tokenId: tid, name: itemName, amount: perItemAmount });
    }
  }

  // ── Send buyer confirmation email ──────────────────────────
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
    });
  } catch (emailErr) {
    console.error("Buyer email failed:", emailErr.message);
  }

  // ── Send owner sale notification ───────────────────────────
  try {
    await sendOwnerEmail({
      items: soldItems,
      totalPaid,
      buyerName,
      buyerEmail,
      shippingAddress,
      billingAddress,
    });
  } catch (ownerErr) {
    console.error("Owner email failed:", ownerErr.message);
  }

  return res.status(200).json({ received: true });
};
