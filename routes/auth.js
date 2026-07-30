import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Organization from "../models/Organization.js";
import Invite from "../models/Invite.js";
import Activity from "../models/Activity.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

const AVATAR_COLORS = ["#60A5FA", "#34D399", "#C084FC", "#FBBF24", "#F87171"];

function signToken(user) {
  return jwt.sign(
    { userId: user._id, username: user.username, role: user.role, name: user.name, email: user.email, avatarColor: user.avatarColor, organization: user.organization },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
  );
}

router.post("/register", async (req, res) => {
  try {
    const { orgName, username, password, name, email } = req.body;
    if (!username || !username.trim()) return res.status(400).json({ error: "Username is required." });
    if (!password || password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters." });
    if (!name || !name.trim()) return res.status(400).json({ error: "Full name is required." });

    const org = await Organization.create({ name: (orgName || `${name.trim()}'s Workspace`).trim() });

    const exists = await User.findOne({ organization: org._id, username: { $regex: new RegExp(`^${username.trim()}$`, "i") } });
    if (exists) {
      await Organization.deleteOne({ _id: org._id });
      return res.status(400).json({ error: "Username already exists." });
    }

    if (email) {
      const emailTaken = await User.findOne({ organization: org._id, email: { $regex: new RegExp(`^${email.trim()}$`, "i") } });
      if (emailTaken) {
        await Organization.deleteOne({ _id: org._id });
        return res.status(400).json({ error: "Email already exists." });
      }
    }

    const count = await User.countDocuments({ organization: org._id });
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      organization: org._id,
      username: username.trim(),
      password: hashed,
      role: "admin",
      name: name.trim(),
      email: email || "",
      avatarColor: AVATAR_COLORS[count % AVATAR_COLORS.length],
    });

    const token = signToken(user);
    await Activity.create({ organization: org._id, type: "auth", message: `${user.username} created organization "${org.name}".`, user: user.username });

    res.status(201).json({
      token,
      user: { userId: user._id, username: user.username, role: user.role, name: user.name, email: user.email, avatarColor: user.avatarColor, loggedInAt: new Date().toISOString(), organization: org._id, organizationName: org.name },
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

    const user = await User.findOne({
      $or: [
        { username: { $regex: new RegExp(`^${username.trim()}$`, "i") } },
        { email: { $regex: new RegExp(`^${username.trim()}$`, "i") } },
      ],
    }).select("+password");

    if (!user) return res.status(401).json({ error: "Invalid username or password" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Invalid username or password" });

    user.lastLogin = new Date();
    await user.save();

    const org = await Organization.findById(user.organization);
    if (!org) return res.status(401).json({ error: "Organization not found" });

    const token = signToken(user);

    await Activity.create({ organization: user.organization, type: "auth", message: `${user.username} signed in.`, user: user.username });

    res.json({
      token,
      user: { userId: user._id, username: user.username, role: user.role, name: user.name, email: user.email, avatarColor: user.avatarColor, loggedInAt: new Date().toISOString(), organization: org._id, organizationName: org.name },
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
    const org = await Organization.findById(user.organization);
    res.json({
      userId: user._id, username: user.username, role: user.role, name: user.name,
      email: user.email, phone: user.phone, title: user.title, department: user.department,
      bio: user.bio, avatarColor: user.avatarColor, createdAt: user.createdAt, lastLogin: user.lastLogin,
      organization: user.organization, organizationName: org ? org.name : "",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/invite", requireAuth, requireAdmin, async (req, res) => {
  try {
    const orgId = req.user.organization;
    const invite = await Invite.create({
      organization: orgId,
      createdBy: req.user.username,
      expiresAt: null,
      maxUses: null,
    });
    await Activity.create({ organization: orgId, type: "user", message: `Invite link created by ${req.user.username}.`, user: req.user.username });
    res.status(201).json({ code: invite.code });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/invite/:code", async (req, res) => {
  try {
    const invite = await Invite.findOne({ code: req.params.code, active: true });
    if (!invite) return res.status(404).json({ error: "Invalid or expired invite link." });
    if (invite.expiresAt && invite.expiresAt < new Date()) return res.status(410).json({ error: "Invite link has expired." });
    if (invite.maxUses && invite.useCount >= invite.maxUses) return res.status(410).json({ error: "Invite link has been used too many times." });

    const org = await Organization.findById(invite.organization);
    if (!org) return res.status(404).json({ error: "Organization not found." });

    res.json({ organizationName: org.name, code: invite.code });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/join/:code", async (req, res) => {
  try {
    const { username, password, name, email } = req.body;
    if (!username || !username.trim()) return res.status(400).json({ error: "Username is required." });
    if (!password || password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters." });
    if (!name || !name.trim()) return res.status(400).json({ error: "Full name is required." });

    const invite = await Invite.findOne({ code: req.params.code, active: true });
    if (!invite) return res.status(404).json({ error: "Invalid or expired invite link." });
    if (invite.expiresAt && invite.expiresAt < new Date()) return res.status(410).json({ error: "Invite link has expired." });
    if (invite.maxUses && invite.useCount >= invite.maxUses) return res.status(410).json({ error: "Invite link has been used too many times." });

    const orgId = invite.organization;

    const exists = await User.findOne({ organization: orgId, username: { $regex: new RegExp(`^${username.trim()}$`, "i") } });
    if (exists) return res.status(400).json({ error: "Username already exists." });

    if (email) {
      const emailTaken = await User.findOne({ organization: orgId, email: { $regex: new RegExp(`^${email.trim()}$`, "i") } });
      if (emailTaken) return res.status(400).json({ error: "Email already exists." });
    }

    const count = await User.countDocuments({ organization: orgId });
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      organization: orgId,
      username: username.trim(),
      password: hashed,
      role: "user",
      name: name.trim(),
      email: email || "",
      avatarColor: AVATAR_COLORS[count % AVATAR_COLORS.length],
    });

    invite.useCount += 1;
    await invite.save();

    const org = await Organization.findById(orgId);
    const token = signToken(user);
    await Activity.create({ organization: orgId, type: "auth", message: `${user.username} joined via invite link.`, user: user.username });

    res.status(201).json({
      token,
      user: { userId: user._id, username: user.username, role: user.role, name: user.name, email: user.email, avatarColor: user.avatarColor, loggedInAt: new Date().toISOString(), organization: orgId, organizationName: org.name },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
