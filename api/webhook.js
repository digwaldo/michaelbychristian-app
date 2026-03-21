// api/webhook.js
// Receives Stripe payment confirmations, sends confirmation email
// NFT transfer is skipped for now — will be added later

const Stripe = require("stripe");
const StellarSdk = require("@stellar/stellar-sdk");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
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

async function sendConfirmationEmail({
  to,
  buyerName,
  pieceName,
  tokenId,
  amountPaid,
  shippingAddress,
}) {
  const shippingSection = shippingAddress
    ? `<div style="margin:24px 0;padding:20px;background:#1A1916;border:1px solid rgba(184,150,62,0.2);">
        <p style="font-size:10px;color:#B8963E;margin-bottom:8px;">SHIPPING ADDRESS</p>
        <p style="font-size:13px;color:#F5EFE0;line-height:1.8;white-space:pre-line;">${shippingAddress}</p>
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
      Your payment has been confirmed. We are preparing your order and will be in touch shortly with shipping details.
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
    <div style="background:#1A1916;border:1px solid rgba(184,150,62,0.2);padding:20px;margin:24px 0;">
      <p style="font-size:12px;color:#9A8E7A;line-height:1.8;margin:0;">
        <strong style="color:#F5EFE0;">Next steps:</strong> Reply to this email with your shipping address and we will dispatch your bag. 
        Your Authentication Contract (NFT) will be transferred to your Stellar wallet upon shipment.
      </p>
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
      to: ["digwaldo@gmail.com"],
      subject: `Order Confirmed — ${pieceName} · MBC`,
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

  const tokenId = session.metadata?.token_id;
  const pieceName = session.metadata?.bag_name || `MBC Token #${tokenId}`;
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

  // ── Send confirmation email to buyer ──
  if (buyerEmail) {
    try {
      await sendConfirmationEmail({
        to: "digwaldo@gmail.com",
        buyerName,
        pieceName,
        tokenId,
        amountPaid,
        shippingAddress,
      });
    } catch (emailErr) {
      console.error("Buyer email failed:", emailErr.message);
    }
  } else {
    console.log("No buyer email found in session — skipping email");
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
        subject: `💰 New Sale — ${pieceName} · ${(amountPaid / 100).toFixed(0)} USD`,
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
        <div style="padding:10px 20px;border-bottom:1px solid rgba(184,150,62,0.1);">
          <span style="font-size:12px;color:#7A7060;">Piece: </span>
          <span style="font-size:12px;color:#D4AF6A;">${pieceName}</span>
        </div>
        <div style="padding:10px 20px;border-bottom:1px solid rgba(184,150,62,0.1);">
          <span style="font-size:12px;color:#7A7060;">Token ID: </span>
          <span style="font-size:12px;color:#F5EFE0;">#${tokenId}</span>
        </div>
        <div style="padding:10px 20px;border-bottom:1px solid rgba(184,150,62,0.1);">
          <span style="font-size:12px;color:#7A7060;">Amount: </span>
          <span style="font-size:12px;color:#5BAF85;">${(amountPaid / 100).toFixed(0)} USD</span>
        </div>
        <div style="padding:10px 20px;border-bottom:1px solid rgba(184,150,62,0.1);">
          <span style="font-size:12px;color:#7A7060;">Buyer: </span>
          <span style="font-size:12px;color:#F5EFE0;">${buyerName || "—"}</span>
        </div>
        <div style="padding:10px 20px;border-bottom:1px solid rgba(184,150,62,0.1);">
          <span style="font-size:12px;color:#7A7060;">Buyer Email: </span>
          <span style="font-size:12px;color:#F5EFE0;">${buyerEmail || "—"}</span>
        </div>
        <div style="padding:10px 20px;">
          <span style="font-size:12px;color:#7A7060;">Shipping: </span>
          <span style="font-size:12px;color:#F5EFE0;white-space:pre-line;">${shippingAddress || "Not provided yet"}</span>
        </div>
      </div>
    </div>
    <p style="font-size:12px;color:#7A7060;text-align:center;">
      View in <a href="https://dashboard.stripe.com/test/payments" style="color:#B8963E;">Stripe Dashboard</a>
    </p>
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
