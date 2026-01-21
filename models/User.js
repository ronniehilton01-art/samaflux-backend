<<<<<<< HEAD
import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  password: String,
  name: String,
  balance: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model("User", UserSchema);
=======
import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  password: String,
  name: String,
  balance: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model("User", UserSchema);
>>>>>>> f65dadf (backend setup + jsonwebtoken installed)
