import express from "express";
import fetch from "node-fetch";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";

const router = express.Router();

/* ======================
   ADD MONEY (PAYSTACK)
====================== */
router.post("/add-money", async (req, res) => {
  const { email, amount } = req.body;

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
        callback_url: `${process.env.BACKEND_URL}/api/payment/verify`
      })
    }
  );

  const data = await response.json();
  res.json(data);
});

/* ======================
   VERIFY PAYMENT
====================== */
router.get("/verify", async (req, res) => {
  const { reference } = req.query;

  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${reference}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET}`
      }
    }
  );

  const data = await response.json();
  if (!data.status) return res.redirect(process.env.FRONTEND_URL);

  const email = data.data.customer.email;
  const amount = data.data.amount / 100;

  const user = await User.findOne({ email });
  if (!user) return res.redirect(process.env.FRONTEND_URL);

  user.balance += amount;
  await user.save();

  await Transaction.create({
    type: "add",
    amount,
    to: email
  });

  res.redirect(process.env.FRONTEND_URL);
});

/* ======================
   SEND MONEY
====================== */
router.post("/send", async (req, res) => {
  const { fromEmail, toEmail, amount } = req.body;

  const sender = await User.findOne({ email: fromEmail });
  const receiver = await User.findOne({ email: toEmail });

  if (!sender || !receiver)
    return res.status(404).json({ error: "User not found" });

  if (sender.balance < amount)
    return res.status(400).json({ error: "Insufficient balance" });

  sender.balance -= amount;
  receiver.balance += amount;

  await sender.save();
  await receiver.save();

  await Transaction.create({ type: "send", amount, from: fromEmail, to: toEmail });
  await Transaction.create({ type: "receive", amount, from: fromEmail, to: toEmail });

  res.json({ message: "Transfer successful" });
});

/* ======================
   WITHDRAW (BANK)
====================== */
router.post("/withdraw", async (req, res) => {
  const { email, amount, bank_code, account_number } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: "User not found" });

  if (user.balance < amount)
    return res.status(400).json({ error: "Insufficient balance" });

  // 1. Create transfer recipient
  const recipientRes = await fetch(
    "https://api.paystack.co/transferrecipient",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        type: "nuban",
        name: email,
        account_number,
        bank_code,
        currency: "NGN"
      })
    }
  );

  const recipientData = await recipientRes.json();
  if (!recipientData.status)
    return res.status(400).json({ error: "Invalid bank details" });

  // 2. Initiate transfer
  const transferRes = await fetch("https://api.paystack.co/transfer", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      source: "balance",
      amount: amount * 100,
      recipient: recipientData.data.recipient_code
    })
  });

  const transferData = await transferRes.json();
  if (!transferData.status)
    return res.status(400).json({ error: "Transfer failed" });

  user.balance -= amount;
  await user.save();

  await Transaction.create({
    type: "withdraw",
    amount,
    from: email
  });

  res.json({ message: "Withdrawal successful" });
});

/* ======================
   HISTORY
====================== */
router.get("/history/:email", async (req, res) => {
  const tx = await Transaction.find({
    $or: [{ from: req.params.email }, { to: req.params.email }]
  }).sort({ createdAt: -1 });

  res.json(tx);
});

export default router;
