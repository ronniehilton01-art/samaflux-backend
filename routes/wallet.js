import express from "express";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";

const router = express.Router();

/* SEND MONEY */
router.post("/send", async (req, res) => {
  const { fromEmail, toEmail, amount } = req.body;

  try {
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

    await sender.save();
    await receiver.save();

    await Transaction.create({
      type: "send",
      from: fromEmail,
      to: toEmail,
      amount,
    });

    res.json({ message: "Money sent successfully" });
  } catch (err) {
    res.status(500).json({ error: "Transfer failed" });
  }
});

/* TRANSACTION HISTORY */
router.get("/history/:email", async (req, res) => {
  const tx = await Transaction.find({
    $or: [{ from: req.params.email }, { to: req.params.email }],
  }).sort({ createdAt: -1 });

  res.json(tx);
});

export default router;
