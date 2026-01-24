import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },

    fullName: String,
    phone: String,
    address: String,
    city: String,
    state: String,
    country: String,
    zip: String,

    balance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("User", UserSchema);
