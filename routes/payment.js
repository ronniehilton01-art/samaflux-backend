import express from "express";
import fetch from "node-fetch";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";

const router = express.Router();

router.post("/add-money", async (req, res) => {
  const { email, amount } = req.body;

  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email,
      amount: amount * 100
    })
  });

  const data = await response.json();
  res.json(data);
});

export default router;
