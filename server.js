import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.js";
import walletRoutes from "./routes/wallet.js";
import paymentRoutes from "./routes/payment.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.use("/auth", authRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/payment", paymentRoutes);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(process.env.PORT || 3000, () =>
      console.log("Server running")
    );
  })
  .catch(err => console.error(err));
