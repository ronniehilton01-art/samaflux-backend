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
  try {
    const { email, amount } = req.body;

    if (!email || !amount) {
      return res.status(400).json({ error: "Missing fields" });
    }

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
    console.error("Payment initialization error:", err);
    res.status(500).json({ error: "Server error" });
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
  try {
    const tx = await Transaction.find({ email: req.params.email }).sort({ createdAt: -1 });
    res.json(tx);
  } catch (err) {
    console.error("Transaction history error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
