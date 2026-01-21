import express from "express";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";

const router = express.Router();

/* =====================
   ADD MONEY
===================== */
router.post("/add", async (req, res) => {
  try {
    const { email, amount } = req.body;
    if (!email || !amount) return res.status(400).json({ error: "Missing fields" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    user.balance += Number(amount);
    await user.save();

    await Transaction.create({ email, type: "add", amount: Number(amount) });

    res.json({ success: true, balance: user.balance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* =====================
   SEND MONEY TO ANOTHER USER
===================== */
router.post("/send", async (req, res) => {
  try {
    const { fromEmail, toEmail, amount } = req.body;
    if (!fromEmail || !toEmail || !amount) return res.status(400).json({ error: "Missing fields" });

    const sender = await User.findOne({ email: fromEmail });
    const receiver = await User.findOne({ email: toEmail });

    if (!sender || !receiver) return res.status(404).json({ error: "User not found" });
    if (sender.balance < amount) return res.status(400).json({ error: "Insufficient funds" });

    sender.balance -= Number(amount);
    receiver.balance += Number(amount);

    await sender.save();
    await receiver.save();

    await Transaction.create({ email: fromEmail, type: "send", amount: Number(amount), to: toEmail });
    await Transaction.create({ email: toEmail, type: "receive", amount: Number(amount), from: fromEmail });

    res.json({ success: true, senderBalance: sender.balance, receiverBalance: receiver.balance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/* =====================
   TRANSACTION HISTORY
===================== */
router.get("/history/:email", async (req, res) => {
  try {
    const tx = await Transaction.find({ email: req.params.email }).sort({ createdAt: -1 });
    res.json(tx);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
