import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  type: { type: String, required: true }, // add | send | receive
  amount: { type: Number, required: true },
  from: String,
  to: String,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Transaction", transactionSchema);

