import express from "express";
import fetch from "node-fetch";

const router = express.Router();

router.post("/add-money", async (req, res) => {
  try {
    const { email, amount } = req.body;

    // ✅ VALIDATION (VERY IMPORTANT)
    if (!email || !amount) {
      return res.status(400).json({
        error: "Email and amount are required"
      });
    }

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
          amount: Number(amount) * 100,
          callback_url: "https://ronniehilton01-art.github.io/samaflux-frontend/"
        })
      }
    );

    const data = await response.json();

    // 🔥 DEBUG LOG (CHECK RENDER LOGS)
    console.log("PAYSTACK RESPONSE:", data);

    if (!data.status) {
      return res.status(400).json({
        error: data.message || "Paystack initialization failed"
      });
    }

    res.json(data);
  } catch (err) {
    console.error("PAYSTACK ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
