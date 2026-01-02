import mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  type: String,
  amount: Number,
  status: String
}, { timestamps: true });

export default mongoose.model("Transaction", TransactionSchema);
