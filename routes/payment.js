router.post("/webhook", async (req, res) => {
  const event = req.body;

  if (event.event === "charge.success") {
    const email = event.data.customer.email;
    const amount = event.data.amount / 100;

    const user = await User.findOne({ email });
    if (user) {
      user.balance += amount;
      await user.save();

      await Transaction.create({
        email,
        type: "credit",
        amount
      });
    }
  }

  res.sendStatus(200);
});
