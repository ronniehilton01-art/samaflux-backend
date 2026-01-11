import express from "express";
import fetch from "node-fetch";
import crypto from "crypto";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";

const router = express.Router();

/* ======================================================
   PAYSTACK TEST ROUTE
====================================================== */
router.get("/test", (req, res) => {
  res.json({ ok: true });
});

/* ======================================================
   INITIALIZE PAYMENT (ADD MONEY)
====================================================== */
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
          callback_url: "https://ronniehilton01-art.github.io/samaflux-frontend/"
        })
      }
    );

    const data = await response.json();

    if (!data.status) {
      return res.status(400).json({ error: "Unable to initialize payment" });
    }

    res.json(data);
  } catch (err) {
    console.error("PAYMENT INIT ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ======================================================
   PAYSTACK WEBHOOK (UPDATES MONGODB)
====================================================== */
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const signature = req.headers["x-paystack-signature"];

      const hash = crypto
        .createHmac("sha512", process.env.PAYSTACK_SECRET)
        .update(req.body)
        .digest("hex");

      if (hash !== signature) {
        console.log("❌ Paystack signature mismatch");
        return res.sendStatus(401);
      }

      const event = JSON.parse(req.body.toString());

      console.log("📩 Paystack event:", event.event);

      if (event.event === "charge.success") {
        const email = event.data.customer.email;
        const amount = event.data.amount / 100;

        const user = await User.findOne({ email });
        if (!user) {
          console.log("❌ User not found:", email);
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

        console.log("✅ Balance updated:", email, amount);
      }

      res.sendStatus(200);
    } catch (err) {
      console.error("WEBHOOK ERROR:", err);
      res.sendStatus(500);
    }
  }
);

/* ======================================================
   TRANSACTION HISTORY
====================================================== */
router.get("/history/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const tx = await Transaction.find({ email }).sort({ createdAt: -1 });
    res.json(tx);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
