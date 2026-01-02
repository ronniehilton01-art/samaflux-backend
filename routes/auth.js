import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  const { email, password, name } = req.body;
  const hashed = await bcrypt.hash(password, 10);

  try {
    const user = await User.create({
      email,
      password: hashed,
      name
    });
    res.json({ success: true, userId: user._id });
  } catch {
    res.status(400).json({ error: "User exists" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user) return res.status(400).json({ error: "Invalid login" });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(400).json({ error: "Invalid login" });

  res.json({ success: true, userId: user._id, balance: user.balance });
});

export default router;
