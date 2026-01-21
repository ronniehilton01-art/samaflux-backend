import express from "express";
import fetch from "node-fetch";
import crypto from "crypto";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";

const router = express.Router();

/* =========================
   INIT PAYSTACK PAYMENT
========================= */
router.post("/add", async (req, res) => {
  const { email, amount } = req.body;

  if (!email || !amount) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const response = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          amount: amount * 100,
          callback_url: process.env.CALLBACK_URL
        })
      }
    );

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Paystack error:", err);
    res.status(500).json({ error: "Payment initialization failed" });
  }
});

/* =========================
   SEND MONEY BETWEEN USERS
========================= */
router.post("/send", async (req, res) => {
  const { fromEmail, toEmail, amount } = req.body;

  if (!fromEmail || !toEmail || !amount) {
    return res.status(400).json({ error: "Missing fields" });
  }

  if (fromEmail === toEmail) {
    return res.status(400).json({ error: "Cannot send money to yourself" });
  }

  try {
    const sender = await User.findOne({ email: fromEmail });
    const recipient = await User.findOne({ email: toEmail });

    if (!sender) return res.status(404).json({ error: "Sender not found" });
    if (!recipient) return res.status(404).json({ error: "Recipient not found" });
    if (sender.balance < amount) return res.status(400).json({ error: "Insufficient balance" });

    // Deduct from sender
    sender.balance -= amount;
    await sender.save();

    // Credit to recipient
    recipient.balance += amount;
    await recipient.save();

    // Record transactions
    await Transaction.create({
      type: "send",
      amount,
      from: fromEmail,
      to: toEmail
    });

    res.json({ success: true, message: `Sent ₦${amount} to ${toEmail}` });
  } catch (err) {
    console.error("Send money error:", err);
    res.status(500).json({ error: "Transaction failed" });
  }
});

/* =========================
   PAYSTACK WEBHOOK
========================= */
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const signature = req.headers["x-paystack-signature"];

      const computedHash = crypto
        .createHmac("sha512", process.env.PAYSTACK_SECRET)
        .update(req.body)
        .digest("hex");

      if (computedHash !== signature) {
        console.log("❌ Invalid Paystack signature");
        return res.sendStatus(401);
      }

      const event = JSON.parse(req.body.toString());

      if (event.event === "charge.success") {
        const email = event.data.customer.email;
        const amount = event.data.amount / 100;

        const user = await User.findOne({ email });
        if (!user) {
          console.log("❌ User not found for webhook:", email);
          return res.sendStatus(200);
        }

        user.balance += amount;
        await user.save();

        await Transaction.create({
          email,
          amount,
          type: "credit",
          reference: event.data.reference
        });

        console.log("✅ Paystack credit applied:", email, amount);
      }

      res.sendStatus(200);
    } catch (err) {
      console.error("Webhook error:", err);
      res.sendStatus(500);
    }
  }
);

/* =========================
   TRANSACTION HISTORY
========================= */
router.get("/history/:email", async (req, res) => {
  const email = req.params.email;
  const tx = await Transaction.find({ $or: [{ from: email }, { to: email }] }).sort({ createdAt: -1 });
  res.json(tx);
});

export default router;
