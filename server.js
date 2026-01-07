import express from "express";
import cors from "cors";
import paymentRoutes from "./routes/payment.js";

const app = express();

app.use(cors());
app.use(express.json());

// 🔥 TEST ROUTE (VERY IMPORTANT)
app.get("/", (req, res) => {
  res.send("Samaflux backend running");
});

// 🔥 PAYMENT ROUTE
app.use("/api/payment", paymentRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
