import express from "express";
import Transaction from "../models/Transaction.js";

const router = express.Router();

/**
 * ADMIN LOGIN
 */
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (
    email === process.env.ADMIN_EMAIL &&
    password === process.env.ADMIN_PASSWORD
  ) {
    return res.json({ success: true });
  }

  res.status(401).json({ success: false, error: "Invalid admin credentials" });
});

/**
 * GET ALL TRANSACTIONS
 */
router.get("/transactions", async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ createdAt: -1 });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

export default router;
