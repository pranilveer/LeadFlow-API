import { Router } from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Lead from "../models/Lead.js";
import Category from "../models/Category.js";
import Activity from "../models/Activity.js";
import Settings from "../models/Settings.js";
import Counter from "../models/Counter.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const DEFAULT_USERS = [
  { username: "Admin", password: "Admin@123", role: "admin", name: "Admin User", email: "admin@leadflow.io", phone: "+1 (555) 100-0001", title: "System Administrator", department: "Operations", bio: "Full access administrator for LeadFlow CRM.", avatarColor: "#60A5FA" },
  { username: "John", password: "John@123", role: "user", name: "John Mitchell", email: "john@leadflow.io", phone: "+1 (555) 200-0002", title: "Sales Executive", department: "Sales", bio: "Focused on enterprise pipeline growth and client relationships.", avatarColor: "#34D399" },
  { username: "Sarah", password: "Sarah@123", role: "user", name: "Sarah Chen", email: "sarah@leadflow.io", phone: "+1 (555) 300-0003", title: "Account Manager", department: "Sales", bio: "Manages mid-market accounts and inbound lead qualification.", avatarColor: "#C084FC" },
];

const DEFAULT_CATEGORIES = [
  { name: "Technology", color: "#60A5FA", description: "Software, IT services, and SaaS companies." },
  { name: "Healthcare", color: "#34D399", description: "Hospitals, clinics, and health-tech providers." },
  { name: "Finance", color: "#FBBF24", description: "Banks, fintech, and financial advisory firms." },
  { name: "Retail", color: "#F87171", description: "E-commerce and brick-and-mortar retail." },
  { name: "Education", color: "#C084FC", description: "Schools, universities, and ed-tech platforms." },
  { name: "Other", color: "#9AA3B5", description: "Miscellaneous or uncategorized leads." },
];

const DEFAULT_SETTINGS = {
  companyName: "LeadFlow CRM", timezone: "Asia/Kolkata", dateFormat: "MMM D, YYYY",
  leadsPerPage: 10, defaultLeadStatus: "New", defaultLeadSource: "Website",
  emailNotifications: true, desktopNotifications: false, autoBackup: false,
};

router.get("/export", requireAdmin, async (req, res) => {
  try {
    const orgId = req.user.organization;
    const [users, leads, categories, activities, settings, counter] = await Promise.all([
      User.find({ organization: orgId }), Lead.find({ organization: orgId }),
      Category.find({ organization: orgId }), Activity.find({ organization: orgId }).sort({ timestamp: -1 }).limit(500),
      Settings.findOne({ organization: orgId }), Counter.findOne({ name: `lead_seq_${orgId}` }),
    ]);
    res.json({
      version: "1.0", exportedAt: new Date().toISOString(),
      users, leads, categories, activities,
      settings: settings || DEFAULT_SETTINGS,
      leadSeq: counter ? counter.seq : 1,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/import", requireAdmin, async (req, res) => {
  try {
    const orgId = req.user.organization;
    const payload = req.body;
    if (!payload || !payload.leads || !payload.categories) {
      return res.status(400).json({ error: "Invalid backup file format." });
    }
    if (payload.users) {
      await User.deleteMany({ organization: orgId });
      for (const u of payload.users) {
        const userData = { ...u, organization: orgId };
        delete userData._id;
        delete userData.__v;
        if (userData.password) {
          const bcryptMod = await import("bcryptjs");
          userData.password = await bcryptMod.default.hash(userData.password, 10);
        }
        await User.create(userData);
      }
    }
    await Lead.deleteMany({ organization: orgId });
    for (const l of payload.leads) {
      const leadData = { ...l, organization: orgId };
      delete leadData._id;
      delete leadData.__v;
      await Lead.create(leadData);
    }
    await Category.deleteMany({ organization: orgId });
    for (const c of payload.categories) {
      const catData = { ...c, organization: orgId };
      delete catData._id;
      delete catData.__v;
      delete catData.leadCount;
      await Category.create(catData);
    }
    if (payload.activities) {
      await Activity.deleteMany({ organization: orgId });
      for (const a of payload.activities) {
        const actData = { ...a, organization: orgId };
        delete actData._id;
        delete actData.__v;
        await Activity.create(actData);
      }
    }
    if (payload.settings) {
      await Settings.deleteMany({ organization: orgId });
      await Settings.create({ ...payload.settings, organization: orgId });
    }
    if (payload.leadSeq) {
      await Counter.findOneAndUpdate({ name: `lead_seq_${orgId}` }, { seq: payload.leadSeq }, { upsert: true });
    }
    await Activity.create({ organization: orgId, type: "system", message: "Data restored from backup.", user: req.user.username });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/reset", requireAdmin, async (req, res) => {
  try {
    const orgId = req.user.organization;
    await Promise.all([
      Lead.deleteMany({ organization: orgId }), Category.deleteMany({ organization: orgId }),
      Activity.deleteMany({ organization: orgId }), Settings.deleteMany({ organization: orgId }),
      Counter.deleteMany({ name: `lead_seq_${orgId}` }),
    ]);
    await User.deleteMany({ organization: orgId });
    for (const u of DEFAULT_USERS) {
      const bcryptMod = await import("bcryptjs");
      const hashed = await bcryptMod.default.hash(u.password, 10);
      await User.create({ ...u, password: hashed, organization: orgId, createdAt: new Date("2024-01-01T08:00:00.000Z"), lastLogin: null });
    }
    for (const c of DEFAULT_CATEGORIES) {
      await Category.create({ ...c, organization: orgId, createdAt: new Date("2024-01-01T08:00:00.000Z") });
    }
    await Settings.create({ organization: orgId, ...DEFAULT_SETTINGS });
    await Counter.create({ name: `lead_seq_${orgId}`, seq: 1 });
    await Activity.create({ organization: orgId, type: "system", message: "All CRM data reset to defaults.", user: req.user.username });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
