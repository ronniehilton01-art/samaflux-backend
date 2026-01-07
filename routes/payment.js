import express from "express";
import fetch from "node-fetch";

const router = express.Router();

// 🔥 TEST ROUTE
router.get("/test", (req, res) => {
  console.log("PAYMENT ROUTE HIT");
  res.json({ ok: true });
});

router.post("/add-money", async (req, res) => {
  console.log("ADD MONEY BODY:", req.body);

  try {
    const { email, amount } = req.body;

    if (!email || !amount) {
      return res.status(400).json({ error: "Email and amount required" });
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
          amount: Number(amount) * 100
        })
      }
    );

    const data = await response.json();
    console.log("PAYSTACK RESPONSE:", data);

    res.json(data);
  } catch (err) {
    console.error("PAYSTACK ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
