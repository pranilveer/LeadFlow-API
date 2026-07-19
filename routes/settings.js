import { Router } from "express";
import Settings from "../models/Settings.js";
import Activity from "../models/Activity.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const DEFAULTS = {
  companyName: "LeadFlow CRM", timezone: "America/New_York", dateFormat: "MMM D, YYYY",
  leadsPerPage: 10, defaultLeadStatus: "New", defaultLeadSource: "Website",
  emailNotifications: true, desktopNotifications: false, autoBackup: false,
};

router.get("/", async (_req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) settings = await Settings.create(DEFAULTS);
    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.put("/", async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) settings = new Settings(DEFAULTS);
    Object.assign(settings, req.body);
    await settings.save();
    await Activity.create({ type: "system", message: "Settings updated.", user: req.user.username });
    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

router.put("/profile", async (req, res) => {
  try {
    const User = (await import("../models/User.js")).default;
    const bcrypt = (await import("bcryptjs")).default;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    const { name, email, phone, department, title, bio, password } = req.body;
    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (department !== undefined) user.department = department;
    if (title !== undefined) user.title = title;
    if (bio !== undefined) user.bio = bio;
    if (password && password.length >= 6) user.password = await bcrypt.hash(password, 10);
    await user.save();
    await Activity.create({ type: "user", message: "Profile updated.", user: req.user.username });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

export default router;
