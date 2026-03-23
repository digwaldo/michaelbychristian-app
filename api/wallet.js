// api/wallet.js
// POST /api/wallet — auto-create Stellar wallet for new user after signup
// GET  /api/wallet?user_id=xxx — get wallet for a user (used by profile page)
// Called automatically after user creates account

const StellarSdk = require("@stellar/stellar-sdk");
const { supabaseAdmin } = require("./supabase-admin");

function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
}

module.exports = async (req, res) => {
  setCORS(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  // ── GET — fetch wallet for user ───────────────────────────────
  if (req.method === "GET") {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: "user_id required" });

    try {
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("stellar_wallet_public, stellar_wallet_secret")
        .eq("id", user_id)
        .single();

      if (error) return res.status(500).json({ error: error.message });
      if (!data?.stellar_wallet_public)
        return res.status(200).json({ wallet: null });

      return res.status(200).json({
        wallet: {
          publicKey: data.stellar_wallet_public,
          secretKey: data.stellar_wallet_secret,
        },
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── POST — create wallet for user ────────────────────────────
  if (req.method === "POST") {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: "user_id required" });

    try {
      // Check if wallet already exists
      const { data: existing } = await supabaseAdmin
        .from("profiles")
        .select("stellar_wallet_public")
        .eq("id", user_id)
        .single();

      if (existing?.stellar_wallet_public) {
        return res.status(200).json({
          wallet: { publicKey: existing.stellar_wallet_public },
          existing: true,
        });
      }

      // Generate new Stellar keypair
      const keypair = StellarSdk.Keypair.random();
      const publicKey = keypair.publicKey();
      const secretKey = keypair.secret();

      // Fund on testnet via Friendbot
      try {
        await fetch(`https://friendbot.stellar.org?addr=${publicKey}`);
        console.log(`Funded testnet wallet: ${publicKey}`);
      } catch (e) {
        console.log("Friendbot note:", e.message);
      }

      // Save to Supabase profile
      const { error: updateErr } = await supabaseAdmin
        .from("profiles")
        .update({
          stellar_wallet_public: publicKey,
          stellar_wallet_secret: secretKey,
        })
        .eq("id", user_id);

      if (updateErr) throw new Error(updateErr.message);

      console.log(`Created wallet ${publicKey} for user ${user_id}`);
      return res.status(200).json({
        wallet: { publicKey, secretKey },
        existing: false,
      });
    } catch (err) {
      console.error("wallet create error:", err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
};
