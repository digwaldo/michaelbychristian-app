// api/atelier-notify.js — Atelier piece notification signup

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
    const { name, email, piece, colorway } = await parseBody(req);
    if (!name || !email || !piece) {
      return res
        .status(400)
        .json({ error: "Name, email, and piece are required" });
    }

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0C0B09;font-family:Helvetica,Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
  <div style="text-align:center;padding:32px 0;border-bottom:1px solid rgba(184,150,62,0.2);">
    <p style="font-size:10px;letter-spacing:0.4em;text-transform:uppercase;color:#B8963E;margin:0 0 8px;">The Atelier — MBC</p>
    <h1 style="font-family:Georgia,serif;font-size:28px;color:#F5EFE0;margin:0 0 6px;">New Drop Notification</h1>
    <h2 style="font-family:Georgia,serif;font-size:18px;font-style:italic;font-weight:400;color:#D4AF6A;margin:0;">${piece}${colorway ? ` · ${colorway}` : ""}</h2>
  </div>
  <div style="padding:32px 0;">
    <div style="border:1px solid rgba(184,150,62,0.2);overflow:hidden;">
      <div style="padding:10px 20px;border-bottom:1px solid rgba(184,150,62,0.1);background:#1A1916;">
        <span style="font-size:10px;color:#7A7060;text-transform:uppercase;letter-spacing:1px;">Name</span>
        <p style="font-size:14px;color:#F5EFE0;margin:4px 0 0;">${name}</p>
      </div>
      <div style="padding:10px 20px;border-bottom:1px solid rgba(184,150,62,0.1);background:#141210;">
        <span style="font-size:10px;color:#7A7060;text-transform:uppercase;letter-spacing:1px;">Email</span>
        <p style="font-size:14px;color:#D4AF6A;margin:4px 0 0;"><a href="mailto:${email}" style="color:#D4AF6A;">${email}</a></p>
      </div>
      <div style="padding:10px 20px;border-bottom:1px solid rgba(184,150,62,0.1);background:#1A1916;">
        <span style="font-size:10px;color:#7A7060;text-transform:uppercase;letter-spacing:1px;">Piece</span>
        <p style="font-size:14px;color:#F5EFE0;margin:4px 0 0;">${piece}</p>
      </div>
      ${
        colorway
          ? `
      <div style="padding:10px 20px;background:#141210;">
        <span style="font-size:10px;color:#7A7060;text-transform:uppercase;letter-spacing:1px;">Colorway</span>
        <p style="font-size:14px;color:#F5EFE0;margin:4px 0 0;">${colorway}</p>
      </div>`
          : ""
      }
    </div>
    <p style="font-size:12px;color:#7A7060;text-align:center;margin-top:24px;">
      Reply to <a href="mailto:${email}" style="color:#B8963E;">${email}</a> to follow up.
    </p>
  </div>
</div></body></html>`;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "MBC Store <store@mbcusa.co>",
        to: [ADMIN_EMAIL],
        reply_to: email,
        subject: `Atelier Notification — ${piece}${colorway ? ` · ${colorway}` : ""} · ${name}`,
        html,
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      console.error("Resend error:", result);
      return res.status(500).json({ error: "Failed to send email" });
    }

    console.log(`Atelier notify sent: ${name} <${email}> — ${piece}`);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Atelier notify error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
