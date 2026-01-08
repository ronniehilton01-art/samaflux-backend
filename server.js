import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

/* ROUTES */
import authRoutes from "./routes/auth.js";
import paymentRoutes from "./routes/payment.js";
import adminRoutes from "./routes/admin.js";

dotenv.config();

const app = express();

/* MIDDLEWARE */
app.use(cors());
app.use(express.json()); // REQUIRED for login/register to work

/* ROUTES */
app.use("/auth", authRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/admin", adminRoutes);

/* HEALTH CHECK */
app.get("/", (req, res) => {
  res.json({ status: "Samaflux backend running ✅" });
});

/* DATABASE */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected ✅"))
  .catch(err => console.error("Mongo error ❌", err));

/* SERVER */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} 🚀`);
});
