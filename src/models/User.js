const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true }, // hashed
    role: { type: String, enum: ["creator", "user"], required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
