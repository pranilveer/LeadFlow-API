import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Activity from "../models/Activity.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const AVATAR_COLORS = ["#60A5FA", "#34D399", "#C084FC", "#FBBF24", "#F87171"];

function signToken(user) {
  return jwt.sign(
    { userId: user._id, username: user.username, role: user.role, name: user.name, email: user.email, avatarColor: user.avatarColor },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
  );
}

router.post("/register", async (req, res) => {
  try {
    const { username, password, name, email } = req.body;
    if (!username || !username.trim()) return res.status(400).json({ error: "Username is required." });
    if (!password || password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters." });
    if (!name || !name.trim()) return res.status(400).json({ error: "Full name is required." });

    const exists = await User.findOne({ username: { $regex: new RegExp(`^${username.trim()}$`, "i") } });
    if (exists) return res.status(400).json({ error: "Username already exists." });

    if (email) {
      const emailTaken = await User.findOne({ email: { $regex: new RegExp(`^${email.trim()}$`, "i") } });
      if (emailTaken) return res.status(400).json({ error: "Email already exists." });
    }

    const count = await User.countDocuments();
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      username: username.trim(),
      password: hashed,
      role: "user",
      name: name.trim(),
      email: email || "",
      avatarColor: AVATAR_COLORS[count % AVATAR_COLORS.length],
    });

    const token = signToken(user);
    await Activity.create({ type: "auth", message: `${user.username} signed up.`, user: user.username });

    res.status(201).json({
      token,
      user: { userId: user._id, username: user.username, role: user.role, name: user.name, email: user.email, avatarColor: user.avatarColor, loggedInAt: new Date().toISOString() },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username/email and password are required" });

    const query = { $or: [
      { username: { $regex: new RegExp(`^${username.trim()}$`, "i") } },
      { email: { $regex: new RegExp(`^${username.trim()}$`, "i") } },
    ]};
    const user = await User.findOne(query).select("+password");
    if (!user) return res.status(401).json({ error: "Invalid username or password" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Invalid username or password" });

    user.lastLogin = new Date();
    await user.save();

    const token = signToken(user);

    await Activity.create({ type: "auth", message: `${user.username} signed in.`, user: user.username });

    res.json({
      token,
      user: { userId: user._id, username: user.username, role: user.role, name: user.name, email: user.email, avatarColor: user.avatarColor, loggedInAt: new Date().toISOString() },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({
      userId: user._id, username: user.username, role: user.role, name: user.name,
      email: user.email, phone: user.phone, title: user.title, department: user.department,
      bio: user.bio, avatarColor: user.avatarColor, createdAt: user.createdAt, lastLogin: user.lastLogin,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
