// api/verify-payment.js
// Verifies Stripe payment — transfer status ignored until webhook is implemented

const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).end();

  const { session_id } = req.query;
  if (!session_id)
    return res.status(400).json({ error: "session_id required" });

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== "paid") {
      return res.status(400).json({ error: "Payment not completed" });
    }

    return res.status(200).json({
      paid: true,
      tokenId: session.metadata?.token_id,
      pieceName: session.metadata?.bag_name,
      buyerEmail: session.customer_details?.email,
      buyerWallet: null, // no transfer yet
      amount: session.amount_total,
      currency: session.currency,
      transferFailed: false, // not implemented yet
      transferError: null,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
