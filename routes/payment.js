import auth from "../middleware/auth.js";
import express from "express";
import fetch from "node-fetch";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";

const router = express.Router();

/* =====================
   INIT PAYSTACK
===================== */
router.post("/init-paystack", auth, async (req, res) => {
  try {
    const { amount } = req.body;
    const email = req.user.email; // from auth middleware

    if (!amount) {
      return res.status(400).json({ error: "Amount required" });
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
          amount: amount * 100,
          callback_url: "https://samaflux.netlify.app", // YOUR FRONTEND URL
        }),
      }
    );

    const data = await response.json();
    res.json(data.data);
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
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${req.params.reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const data = await response.json();
    if (data.data.status !== "success") {
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

  await Transaction.create({ email: fromEmail, type: "send", amount });
  await Transaction.create({ email: toEmail, type: "receive", amount });

  res.json({ success: true });
});

/* =====================
   HISTORY
===================== */
router.get("/history/:email", async (req, res) => {
  const tx = await Transaction.find({ email: req.params.email })
    .sort({ createdAt: -1 })
    .limit(5);

  res.json(tx);
});

export default router;