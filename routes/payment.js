import express from "express";
import fetch from "node-fetch";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";

const router = express.Router();

/* INITIALIZE PAYMENT */
router.post("/add", async (req, res) => {
  const { email, amount } = req.body;

  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email,
      amount: amount * 100,
      callback_url: `${process.env.FRONTEND_URL}/index.html`
    })
  });

  const data = await response.json();
  res.json(data);
});

/* VERIFY PAYMENT */
router.get("/verify/:reference", async (req, res) => {
  const ref = req.params.reference;

  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${ref}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET}`
      }
    }
  );

  const data = await response.json();

  if (!data.status) {
    return res.status(400).json({ error: "Verification failed" });
  }

  const email = data.data.customer.email;
  const amount = data.data.amount / 100;

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: "User not found" });

  user.balance += amount;
  await user.save();

  await Transaction.create({
    email,
    type: "credit",
    amount
  });

  res.json({ success: true });
});

/* TRANSACTION HISTORY */
router.get("/history/:email", async (req, res) => {
  const tx = await Transaction.find({ email: req.params.email });
  res.json(tx);
});

export default router;
