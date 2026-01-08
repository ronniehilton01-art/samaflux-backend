import express from "express";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";

const router = express.Router();

/* ADMIN LOGIN */
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (
    email === process.env.ADMIN_EMAIL &&
    password === process.env.ADMIN_PASSWORD
  ) {
    return res.json({ success: true });
  }

  res.status(401).json({ error: "Invalid admin credentials" });
});

/* GET ALL USERS */
router.get("/users", async (req, res) => {
  const users = await User.find().select("-password");
  res.json(users);
});

/* FREEZE USER */
router.post("/freeze", async (req, res) => {
  const { email } = req.body;
  await User.updateOne({ email }, { blocked: true });
  res.json({ message: "User frozen" });
});

/* UNFREEZE USER */
router.post("/unfreeze", async (req, res) => {
  const { email } = req.body;
  await User.updateOne({ email }, { blocked: false });
  res.json({ message: "User unfrozen" });
});

/* ALL TRANSACTIONS */
router.get("/transactions", async (req, res) => {
  const tx = await Transaction.find().sort({ createdAt: -1 });
  res.json(tx);
});

export default router;
