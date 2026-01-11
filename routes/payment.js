router.post("/webhook", async (req, res) => {
  console.log("🔥 WEBHOOK HIT");

  const signature = req.headers["x-paystack-signature"];
  console.log("Signature:", signature);

  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET)
    .update(req.rawBody)
    .digest("hex");

  console.log("Computed Hash:", hash);

  if (hash !== signature) {
    console.log("❌ SIGNATURE MISMATCH");
    return res.sendStatus(401);
  }

  const event = req.body;
  console.log("EVENT:", event.event);

  if (event.event === "charge.success") {
    const email = event.data.customer.email;
    const amount = event.data.amount / 100;

    console.log("EMAIL:", email, "AMOUNT:", amount);

    const user = await User.findOne({ email });
    console.log("USER FOUND:", !!user);

    if (user) {
      user.balance += amount;
      await user.save();

      await Transaction.create({
        email,
        amount,
        type: "credit"
      });

      console.log("✅ BALANCE UPDATED");
    }
  }

  res.sendStatus(200);
});
