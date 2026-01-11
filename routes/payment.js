import express from "express";
import fetch from "node-fetch";
import crypto from "crypto";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";

const router = express.Router();

/* INIT PAYMENT */
router.post("/add", async (req, res) => {
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
        callback_url: process.env.CALLBACK_URL
      })
    }
  );

  const data = await response.json();
  res.json(data);
});

/* WEBHOOK */
router.post("/webhook", async (req, res) => {
  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET)
    .update(req.rawBody)
    .digest("hex");

  if (hash !== req.headers["x-paystack-signature"])
    return res.sendStatus(401);

  const event = req.body;

  if (event.event === "charge.success") {
    const email = event.data.customer.email;
    const amount = event.data.amount / 100;

    const user = await User.findOne({ email });
    if (user) {
      user.balance += amount;
      await user.save();

      await Transaction.create({
        email,
        amount,
        type: "credit"
      });
    }
  }

  res.sendStatus(200);
});

/* HISTORY */
router.get("/history/:email", async (req, res) => {
  const tx = await Transaction.find({ email: req.params.email });
  res.json(tx);
});

export default router;
