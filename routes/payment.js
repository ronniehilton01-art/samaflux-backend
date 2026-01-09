import express from "express";
import axios from "axios";
import User from "../models/User.js";

const router = express.Router();

/* =========================
   ADD MONEY (INIT PAYMENT)
========================= */
router.post("/add", async (req, res) => {
  try {
    const { email, amount } = req.body;

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount: amount * 100,
        callback_url: "https://samaflux-backend.onrender.com/api/payment/verify"
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.json(response.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Payment initialization failed" });
  }
});

/* =========================
   VERIFY PAYMENT (IMPORTANT)
========================= */
router.get("/verify", async (req, res) => {
  try {
    const reference = req.query.reference;

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
        }
      }
    );

    const data = response.data.data;

    if (data.status !== "success") {
      return res.send("Payment not successful");
    }

    const email = data.customer.email;
    const amount = data.amount / 100;

    const user = await User.findOne({ email });
    if (!user) {
      return res.send("User not found");
    }

    user.balance += amount;
    user.transactions.push({
      type: "credit",
      amount
    });

    await user.save();

    /* REDIRECT BACK TO FRONTEND */
    res.redirect("https://samaflux-frontend.onrender.com");
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send("Verification failed");
  }
});

/* =========================
   SEND MONEY
========================= */
router.post("/send", async (req, res) => {
  const { fromEmail, toEmail, amount } = req.body;

  const sender = await User.findOne({ email: fromEmail });
  const receiver = await User.findOne({ email: toEmail });

  if (!sender || !receiver) {
    return res.status(400).json({ error: "User not found" });
  }

  if (sender.balance < amount) {
    return res.status(400).json({ error: "Insufficient balance" });
  }

  sender.balance -= amount;
  receiver.balance += amount;

  sender.transactions.push({ type: "sent", amount });
  receiver.transactions.push({ type: "received", amount });

  await sender.save();
  await receiver.save();

  res.json({ message: "Transfer successful" });
});

/* =========================
   TRANSACTION HISTORY
========================= */
router.get("/history/:email", async (req, res) => {
  const user = await User.findOne({ email: req.params.email });
  res.json(user?.transactions || []);
});

export default router;
