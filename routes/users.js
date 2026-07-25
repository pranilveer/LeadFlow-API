import { Router } from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Lead from "../models/Lead.js";
import Activity from "../models/Activity.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);
router.use(requireAdmin);

router.get("/", async (_req, res) => {
  try {
    const users = await User.find().sort({ createdAt: 1 });
    const leads = await Lead.find().select("addedBy");
    const result = users.map(u => {
      const obj = u.toJSON();
      obj.leadCount = leads.filter(l => l.addedBy === u.username).length;
      return obj;
    });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const AVATAR_COLORS = ["#60A5FA", "#34D399", "#C084FC", "#FBBF24", "#F87171"];

router.post("/", async (req, res) => {
  try {
    const { username, password, name, email, phone, role, title, department, bio } = req.body;
    if (!username || !name) return res.status(400).json({ error: "Username and full name are required." });
    if (!password || password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters." });
    const exists = await User.findOne({ username: { $regex: new RegExp(`^${username.trim()}$`, "i") } });
    if (exists) return res.status(400).json({ error: "Username already exists." });
    if (email) {
      const emailTaken = await User.findOne({ email: { $regex: new RegExp(`^${email.trim()}$`, "i") } });
      if (emailTaken) return res.status(400).json({ error: "Email already exists." });
    }
    const count = await User.countDocuments();
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      username: username.trim(), password: hashed, name: name.trim(),
      email: email || "", phone: phone || "", role: role || "user",
      title: title || "", department: department || "", bio: bio || "",
      avatarColor: AVATAR_COLORS[count % AVATAR_COLORS.length],
    });
    await Activity.create({ type: "user", message: `User "${user.name}" created.`, user: req.user.username });
    res.status(201).json(user);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    const { username, name, email, phone, role, title, department, bio, password } = req.body;

    if (role && role !== user.role) {
      if (user._id.toString() === req.user.userId && role !== "admin") {
        return res.status(400).json({ error: "Cannot revoke your own administrator privileges." });
      }
      if (user.role === "admin" && role !== "admin") {
        const adminCount = await User.countDocuments({ role: "admin" });
        if (adminCount <= 1) return res.status(400).json({ error: "Cannot remove the only administrator role." });
      }
      user.role = role;
    }

    if (username) user.username = username.trim();
    if (name) user.name = name.trim();
    if (email !== undefined && email !== user.email) {
      const emailTaken = await User.findOne({ _id: { $ne: user._id }, email: { $regex: new RegExp(`^${email.trim()}$`, "i") } });
      if (emailTaken) return res.status(400).json({ error: "Email already exists." });
      user.email = email;
    }
    if (phone !== undefined) user.phone = phone;
    if (title !== undefined) user.title = title;
    if (department !== undefined) user.department = department;
    if (bio !== undefined) user.bio = bio;
    if (password && password.length >= 6) user.password = await bcrypt.hash(password, 10);
    await user.save();
    await Activity.create({ type: "user", message: `User "${user.name}" updated.`, user: req.user.username });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user._id.toString() === req.user.userId) {
      return res.status(400).json({ error: "Cannot delete your own account." });
    }
    if (user.role === "admin") {
      const adminCount = await User.countDocuments({ role: "admin" });
      if (adminCount <= 1) return res.status(400).json({ error: "Cannot delete the only administrator." });
    }
    await User.deleteOne({ _id: user._id });
    await Activity.create({ type: "user", message: `User "${user.name}" deleted.`, user: req.user.username });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
