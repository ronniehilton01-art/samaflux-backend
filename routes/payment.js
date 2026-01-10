import express from "express";
import fetch from "node-fetch";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";

const router = express.Router();

/* ============================
   INITIALIZE PAYMENT
============================ */
router.post("/add", async (req, res) => {
  try {
    const { email, amount } = req.body;

    if (!email || !amount) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        amount: amount * 100,
        callback_url: `${process.env.BASE_URL}/api/payment/verify`
      })
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Payment init failed" });
  }
});

/* ============================
   VERIFY PAYMENT
============================ */
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

    const result = await response.json();

    if (result.data.status !== "success") {
      return res.redirect("https://samaflux-frontend.onrender.com/?failed=true");
    }

    const email = result.data.customer.email;
    const amount = result.data.amount / 100;

    const user = await User.findOne({ email });
    if (!user) return res.redirect("https://samaflux-frontend.onrender.com");

    user.balance += amount;
    await user.save();

    await Transaction.create({
      email,
      amount,
      type: "credit",
      reference
    });

    res.redirect("https://samaflux-frontend.onrender.com/?success=true");
  } catch (err) {
    res.redirect("https://samaflux-frontend.onrender.com/?failed=true");
  }
});

/* ============================
   TRANSACTION HISTORY
============================ */
router.get("/history/:email", async (req, res) => {
  const tx = await Transaction.find({ email: req.params.email });
  res.json(tx);
});

export default router;
