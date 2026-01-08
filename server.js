import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import paymentRoutes from "./routes/payment.js";

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.send("Samaflux backend running");
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/payment", paymentRoutes);

// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
