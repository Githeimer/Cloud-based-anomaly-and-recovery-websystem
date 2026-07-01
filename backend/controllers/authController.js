const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const { JWT_SECRET } = require("../middleware/authMiddleware");

const signToken = (id) => jwt.sign({ id }, JWT_SECRET, { expiresIn: "7d" });

async function register(req, res) {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: "All fields are required" });
  try {
    const existing = await User.findByEmail(email);
    if (existing) return res.status(409).json({ message: "Email already registered" });
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.createUser({ name, email, password: hashed });
    res.status(201).json({ token: signToken(user.id), user: User.publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Registration failed" });
  }
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email and password required" });
  try {
    const user = await User.findByEmail(email);
    if (!user) return res.status(401).json({ message: "Invalid credentials" });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Invalid credentials" });
    res.json({ token: signToken(user.id), user: User.publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login failed" });
  }
}

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(401).json({ message: "Current password is incorrect" });
    const hashed = await bcrypt.hash(newPassword, 10);
    await User.updatePassword(user.id, hashed);
    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to change password" });
  }
}

async function me(req, res) {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user: User.publicUser(user) });
  } catch {
    res.status(500).json({ message: "Failed to fetch user" });
  }
}

module.exports = { register, login, changePassword, me };