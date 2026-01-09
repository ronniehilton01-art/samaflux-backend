import express from "express";
import fetch from "node-fetch";
import User from "../models/User.js";

const router = express.Router();

/* ==========================
   TEST
========================== */
router.get("/test", (req, res) => {
  res.json({ ok: true });
});

/* ==========================
   ADD MONEY (INITIALIZE)
========================== */
router.post("/add-money", async (req, res) => {
  try {
    const { email, amount } = req.body;

    if (!email || !amount) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

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
  } catch (err) {
    res.status(500).json({ error: "Payment init failed" });
  }
});

/* ==========================
   VERIFY PAYMENT
========================== */
router.get("/verify", async (req, res) => {
  try {
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

    if (!data.status) {
      return res.redirect(process.env.FRONTEND_URL);
    }

    const email = data.data.customer.email;
    const amount = data.data.amount / 100;

    const user = await User.findOne({ email });
    if (!user) return res.redirect(process.env.FRONTEND_URL);

    user.balance += amount;
    await user.save();

    res.redirect(process.env.FRONTEND_URL);
  } catch (err) {
    res.redirect(process.env.FRONTEND_URL);
  }
});

export default router;
