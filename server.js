import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.js";
import paymentRoutes from "./routes/payment.js";

dotenv.config();

const app = express();

/* NORMAL JSON FOR MOST ROUTES */
app.use(cors());
app.use(express.json());

/* ROUTES */
app.use("/auth", authRoutes);
app.use("/api/payment", paymentRoutes);

/* HEALTH CHECK */
app.get("/", (req, res) => {
  res.json({ status: "Samaflux backend running" });
});

/* DATABASE */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(console.error);

/* SERVER */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running on", PORT));
