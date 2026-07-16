import { Router } from "express";
import Lead from "../models/Lead.js";
import Counter from "../models/Counter.js";
import Activity from "../models/Activity.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

async function nextLeadId() {
  const now = new Date();
  const year = now.getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { name: "lead_seq" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `LD-${year}-${String(counter.seq).padStart(5, "0")}`;
}

router.use(requireAuth);

router.get("/stats", async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin";
    const match = isAdmin ? {} : { addedBy: req.user.username };
    const today = new Date().toISOString().slice(0, 10);

    const [total, todayCount, myCount] = await Promise.all([
      Lead.countDocuments(match),
      Lead.countDocuments({ ...match, addedDate: today }),
      Lead.countDocuments({ addedBy: req.user.username }),
    ]);

    const Category = (await import("../models/Category.js")).default;
    const categories = await Category.countDocuments();

    res.json({ total, today: todayCount, categories, myLeads: myCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin";
    const query = isAdmin ? {} : { addedBy: req.user.username };
    const leads = await Lead.find(query).sort({ createdAt: -1 });
    res.json(leads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const now = new Date();
    const id = await nextLeadId();
    const lead = await Lead.create({
      ...req.body,
      id,
      addedDate: now.toISOString().slice(0, 10),
      addedTime: [now.getHours(), now.getMinutes(), now.getSeconds()].map(n => String(n).padStart(2, "0")).join(":"),
      addedBy: req.user.username,
    });
    await Activity.create({ type: "lead", message: `Lead "${lead.leadName}" created (${lead.id}).`, user: req.user.username });
    res.status(201).json(lead);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const lead = await Lead.findOne({ id: req.params.id });
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    if (req.user.role !== "admin" && lead.addedBy !== req.user.username) {
      return res.status(403).json({ error: "Not authorized" });
    }
    Object.assign(lead, req.body, { id: lead.id, addedBy: lead.addedBy });
    await lead.save();
    await Activity.create({ type: "lead", message: `Lead "${lead.leadName}" updated.`, user: req.user.username });
    res.json(lead);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const lead = await Lead.findOne({ id: req.params.id });
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    if (req.user.role !== "admin" && lead.addedBy !== req.user.username) {
      return res.status(403).json({ error: "Not authorized" });
    }
    await Lead.deleteOne({ id: req.params.id });
    await Activity.create({ type: "lead", message: `Lead "${lead.leadName}" deleted.`, user: req.user.username });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/import", async (req, res) => {
  try {
    const { leads } = req.body;
    if (!Array.isArray(leads)) return res.status(400).json({ error: "leads array required" });
    const now = new Date();
    const results = [];
    for (const data of leads) {
      if (!data.leadName || !data.email) continue;
      const id = await nextLeadId();
      const lead = await Lead.create({
        ...data,
        id,
        addedDate: data.addedDate || now.toISOString().slice(0, 10),
        addedTime: data.addedTime || [now.getHours(), now.getMinutes(), now.getSeconds()].map(n => String(n).padStart(2, "0")).join(":"),
        addedBy: req.user.username,
      });
      results.push(lead);
    }
    if (results.length > 0) {
      await Activity.create({ type: "lead", message: `Imported ${results.length} lead(s) from CSV.`, user: req.user.username });
    }
    res.status(201).json({ imported: results.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
