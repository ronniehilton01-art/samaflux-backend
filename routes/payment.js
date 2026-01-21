import express from "express";
import fetch from "node-fetch";
import crypto from "crypto";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";

const router = express.Router();

/* =========================
   INIT PAYSTACK PAYMENT (Add Money)
========================= */
router.post("/add", async (req, res) => {
  const { email, amount } = req.body;

  if (!email || !amount) return res.status(400).json({ error: "Missing fields" });

  try {
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
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
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* =========================
   SEND MONEY TO OTHER USER
========================= */
router.post("/send", async (req, res) => {
  const { fromEmail, toEmail, amount } = req.body;

  if (!fromEmail || !toEmail || !amount) return res.status(400).json({ error: "Missing fields" });
  if (fromEmail === toEmail) return res.status(400).json({ error: "Cannot send to yourself" });

  try {
    const sender = await User.findOne({ email: fromEmail });
    const receiver = await User.findOne({ email: toEmail });

    if (!sender || !receiver) return res.status(404).json({ error: "User not found" });
    if (sender.balance < amount) return res.status(400).json({ error: "Insufficient funds" });

    sender.balance -= amount;
    receiver.balance += amount;

    await sender.save();
    await receiver.save();

    await Transaction.create({ type: "send", amount, from: fromEmail, to: toEmail });
    await Transaction.create({ type: "receive", amount, from: fromEmail, to: toEmail });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* =========================
   TRANSACTION HISTORY
========================= */
router.get("/history/:email", async (req, res) => {
  const tx = await Transaction.find({ $or: [{ from: req.params.email }, { to: req.params.email }] }).sort({ createdAt: -1 });
  res.json(tx);
});

export default router;
