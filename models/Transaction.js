import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    user: String,
    type: String, // send, receive, add, withdraw
    amount: Number,
    from: String,
    to: String,
  },
  { timestamps: true }
);

export default mongoose.model("Transaction", transactionSchema);
