const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.createUser = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Email, password and role are required"
      });
    }

    // normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // 🔍 check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists with this email"
      });
    }

    // hash password
    const hashedPw = await bcrypt.hash(password, 10);

    // create user
    const user = await User.create({
      email: normalizedEmail,
      password: hashedPw,
      role
    });

    res.status(201).json({
      success: true,
      id: user._id,
      email: user.email,
      role: user.role
    });
  } catch (err) {
    // fallback for race conditions (unique index)
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "User already exists"
      });
    }

    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.login = async (req, res) => {
  try {
  const { email, password } = req.body;

  if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

  const user = await User.findOne({ email: email?.toLowerCase() });
  if (!user) return res.status(401).json({ success: false, message: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ success: false, message: "Invalid password" });

  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1d" });
  res.json({ success: true, token, role: user.role });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
