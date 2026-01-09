import express from "express";
import fetch from "node-fetch";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";

const router = express.Router();

/**
 * ADD MONEY (PAYSTACK INITIALIZE)
 */
router.post("/add", async (req, res) => {
  const { email, amount } = req.body;

  if (!email || !amount) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      amount: amount * 100,
      callback_url: process.env.PAYSTACK_CALLBACK,
    }),
  });

  const data = await response.json();
  res.json(data);
});

/**
 * VERIFY PAYSTACK PAYMENT
 */
router.get("/verify/:ref", async (req, res) => {
  const { ref } = req.params;

  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${ref}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET}`,
      },
    }
  );

  const data = await response.json();

  if (!data.status) {
    return res.status(400).json({ error: "Payment not verified" });
  }

  const email = data.data.customer.email;
  const amount = data.data.amount / 100;

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: "User not found" });

  user.balance += amount;
  await user.save();

  await Transaction.create({
    user: email,
    type: "add",
    amount,
    from: "Paystack",
    to: email,
  });

  res.redirect(process.env.FRONTEND_URL + "/dashboard.html");
});

/**
 * SEND MONEY
 */
router.post("/send", async (req, res) => {
  const { fromEmail, toEmail, amount } = req.body;

  const sender = await User.findOne({ email: fromEmail });
  const receiver = await User.findOne({ email: toEmail });

  if (!sender || !receiver) {
    return res.status(404).json({ error: "User not found" });
  }

  if (sender.balance < amount) {
    return res.status(400).json({ error: "Insufficient balance" });
  }

  sender.balance -= amount;
  receiver.balance += amount;

  await sender.save();
  await receiver.save();

  await Transaction.create({
    user: fromEmail,
    type: "send",
    amount,
    from: fromEmail,
    to: toEmail,
  });

  res.json({ success: true, message: "Money sent successfully" });
});

/**
 * TRANSACTION HISTORY
 */
router.get("/history/:email", async (req, res) => {
  const tx = await Transaction.find({ user: req.params.email }).sort({
    createdAt: -1,
  });
  res.json(tx);
});

export default router;
