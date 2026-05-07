// api/fragrance-inquiry.js
// Handles fragrance inquiry form submissions — sends email via Resend

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ADMIN_EMAIL = "youngcompltd@gmail.com";

function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

module.exports = async (req, res) => {
  setCORS(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const { name, email, phone, fragrance, volume, message } =
      await parseBody(req);

    if (!name || !email || !fragrance) {
      return res
        .status(400)
        .json({ error: "Name, email, and fragrance are required" });
    }

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0C0B09;font-family:Helvetica,Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">

  <div style="text-align:center;padding:32px 0;border-bottom:1px solid rgba(184,150,62,0.2);">
    <p style="font-size:10px;letter-spacing:0.4em;text-transform:uppercase;color:#B8963E;margin:0 0 8px;">Michael Christian Fragrances</p>
    <h1 style="font-family:Georgia,serif;font-size:28px;color:#F5EFE0;margin:0 0 6px;">New Fragrance Inquiry</h1>
    <h2 style="font-family:Georgia,serif;font-size:18px;font-style:italic;font-weight:400;color:#D4AF6A;margin:0;">${fragrance}${volume ? ` · ${volume}` : ""}</h2>
  </div>

  <div style="padding:32px 0;">
    <div style="border:1px solid rgba(184,150,62,0.2);overflow:hidden;margin-bottom:24px;">
      <div style="padding:12px 20px;background:#1A1916;border-bottom:1px solid rgba(184,150,62,0.2);">
        <p style="font-size:9px;letter-spacing:0.3em;text-transform:uppercase;color:#B8963E;margin:0;">Inquiry Details</p>
      </div>

      <div style="padding:10px 20px;border-bottom:1px solid rgba(184,150,62,0.1);background:#141210;">
        <span style="font-size:10px;color:#7A7060;text-transform:uppercase;letter-spacing:1px;">Name</span>
        <p style="font-size:14px;color:#F5EFE0;margin:4px 0 0;">${name}</p>
      </div>

      <div style="padding:10px 20px;border-bottom:1px solid rgba(184,150,62,0.1);background:#1A1916;">
        <span style="font-size:10px;color:#7A7060;text-transform:uppercase;letter-spacing:1px;">Email</span>
        <p style="font-size:14px;color:#D4AF6A;margin:4px 0 0;">
          <a href="mailto:${email}" style="color:#D4AF6A;">${email}</a>
        </p>
      </div>

      ${
        phone
          ? `
      <div style="padding:10px 20px;border-bottom:1px solid rgba(184,150,62,0.1);background:#141210;">
        <span style="font-size:10px;color:#7A7060;text-transform:uppercase;letter-spacing:1px;">Phone</span>
        <p style="font-size:14px;color:#F5EFE0;margin:4px 0 0;">${phone}</p>
      </div>`
          : ""
      }

      <div style="padding:10px 20px;border-bottom:1px solid rgba(184,150,62,0.1);background:#1A1916;">
        <span style="font-size:10px;color:#7A7060;text-transform:uppercase;letter-spacing:1px;">Fragrance</span>
        <p style="font-size:14px;color:#F5EFE0;margin:4px 0 0;">${fragrance}${volume ? ` · ${volume}` : ""}</p>
      </div>

      ${
        message
          ? `
      <div style="padding:10px 20px;background:#141210;">
        <span style="font-size:10px;color:#7A7060;text-transform:uppercase;letter-spacing:1px;">Message</span>
        <p style="font-size:14px;color:#F5EFE0;margin:4px 0 0;line-height:1.6;">${message}</p>
      </div>`
          : ""
      }
    </div>

    <p style="font-size:12px;color:#7A7060;text-align:center;margin-top:8px;">
      Reply directly to <a href="mailto:${email}" style="color:#B8963E;">${email}</a> to respond.
    </p>
  </div>

  <div style="border-top:1px solid rgba(184,150,62,0.2);padding-top:20px;text-align:center;">
    <p style="font-family:Georgia,serif;font-size:13px;color:#7A7060;font-style:italic;">Michael By Christian · Phygital Luxury</p>
  </div>
</div></body></html>`;

    // Send to admin
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Michael Christian Fragrances <hello@mbcusa.co>",
        to: [ADMIN_EMAIL],
        reply_to: email,
        subject: `Fragrance Inquiry — ${fragrance}${volume ? ` · ${volume}` : ""} · ${name}`,
        html,
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      console.error("Resend error:", JSON.stringify(result));
      console.error("Resend status:", response.status);
      console.error("RESEND_API_KEY set:", !!RESEND_API_KEY);
      return res.status(500).json({
        error: "Failed to send email",
        detail: result?.message || result?.name || JSON.stringify(result),
      });
    }

    console.log(`Fragrance inquiry sent: ${name} <${email}> — ${fragrance}`);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Inquiry error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
