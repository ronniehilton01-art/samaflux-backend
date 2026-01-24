const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  password: String,
  name: String,
  phone: String,
  address: String,
  city: String,
  state: String,
  country: String,
  zip: String,
  balance: { type: Number, default: 0 }
}, { timestamps: true });
