import express from "express";
import fetch from "node-fetch";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import auth from "../middleware/auth.js"; // ✅ IMPORTANT

const router = express.Router();

/* =====================
   INIT PAYSTACK
===================== */
router.post("/init-paystack", auth, async (req, res) => {
  try {
    const { amount } = req.body;
    const email = req.user.email; // ✅ NOW EXISTS

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const response = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          amount: amount * 100, // kobo
          callback_url: "https://samaflux.netlify.app", // frontend URL
        }),
      }
    );

    const data = await response.json();

    if (!data.status) {
      return res.status(400).json({ error: "Paystack init failed" });
    }

    res.json(data.data); // { authorization_url, reference }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Paystack init failed" });
  }
});

/* =====================
   VERIFY PAYSTACK
===================== */
router.get("/verify/:reference", async (req, res) => {
  try {
    const { reference } = req.params;

    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const data = await response.json();

    if (!data.status || data.data.status !== "success") {
      return res.status(400).json({ error: "Payment not successful" });
    }

    const email = data.data.customer.email;
    const amount = data.data.amount / 100;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    user.balance += amount;
    await user.save();

    await Transaction.create({
      email,
      type: "add",
      amount,
    });

    res.json({ success: true, amount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Verification failed" });
  }
});

/* =====================
   SEND MONEY
===================== */
router.post("/send", async (req, res) => {
  try {
    const { fromEmail, toEmail, amount } = req.body;

    if (!fromEmail || !toEmail || !amount) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const sender = await User.findOne({ email: fromEmail });
    const receiver = await User.findOne({ email: toEmail });

    if (!sender || !receiver) {
      return res.status(404).json({ error: "User not found" });
    }

    if (sender.balance < amount) {
      return res.status(400).json({ error: "Insufficient funds" });
    }

    sender.balance -= amount;
    receiver.balance += amount;

    await sender.save();
    await receiver.save();

    await Transaction.create({
      email: fromEmail,
      type: "send",
      amount,
      to: toEmail,
    });

    await Transaction.create({
      email: toEmail,
      type: "receive",
      amount,
      from: fromEmail,
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* =====================
   TRANSACTION HISTORY
===================== */
router.get("/history/:email", async (req, res) => {
  try {
    const tx = await Transaction.find({ email: req.params.email })
      .sort({ createdAt: -1 })
      .limit(5);

    res.json(tx);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;