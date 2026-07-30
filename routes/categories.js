import { Router } from "express";
import Category from "../models/Category.js";
import Lead from "../models/Lead.js";
import Activity from "../models/Activity.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

async function withLeadCount(categories, orgId) {
  const leads = await Lead.find({ organization: orgId }).select("category customCategory");
  return categories.map(c => {
    const obj = c.toJSON();
    obj.leadCount = leads.filter(l => l.category === c.name || (c.name === "Other" && l.customCategory)).length;
    return obj;
  });
}

router.get("/:id", async (req, res) => {
  try {
    const orgId = req.user.organization;
    const cat = await Category.findOne({ _id: req.params.id, organization: orgId });
    if (!cat) return res.status(404).json({ error: "Category not found" });
    const [leads] = await Promise.all([
      Lead.find({ organization: orgId, category: cat.name }).sort({ createdAt: -1 }),
    ]);
    res.json({ ...cat.toJSON(), leads });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const orgId = req.user.organization;
    const categories = await Category.find({ organization: orgId }).sort({ createdAt: 1 });
    res.json(await withLeadCount(categories, orgId));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const orgId = req.user.organization;
    const { name, color, description } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "Category name is required" });
    const exists = await Category.findOne({ organization: orgId, name: { $regex: new RegExp(`^${name.trim()}$`, "i") } });
    if (exists) return res.status(400).json({ error: "Category name already exists." });
    const cat = await Category.create({ organization: orgId, name: name.trim(), color: color || "#60A5FA", description: description || "" });
    await Activity.create({ organization: orgId, type: "category", message: `Category "${cat.name}" created.`, user: req.user.username });
    res.status(201).json({ ...cat.toJSON(), leadCount: 0 });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const orgId = req.user.organization;
    const cat = await Category.findOne({ _id: req.params.id, organization: orgId });
    if (!cat) return res.status(404).json({ error: "Category not found" });
    if (req.body.name) {
      const exists = await Category.findOne({ organization: orgId, name: { $regex: new RegExp(`^${req.body.name}$`, "i") }, _id: { $ne: cat._id } });
      if (exists) return res.status(400).json({ error: "Category name already exists." });
    }
    const oldName = cat.name;
    Object.assign(cat, req.body);
    await cat.save();
    if (req.body.name && req.body.name !== oldName) {
      await Lead.updateMany({ organization: orgId, category: oldName }, { category: req.body.name });
    }
    await Activity.create({ organization: orgId, type: "category", message: `Category "${cat.name}" updated.`, user: req.user.username });
    const categories = await Category.find({ organization: orgId }).sort({ createdAt: 1 });
    res.json((await withLeadCount(categories, orgId)).find(c => c._id.toString() === cat._id.toString()));
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const orgId = req.user.organization;
    const cat = await Category.findOne({ _id: req.params.id, organization: orgId });
    if (!cat) return res.status(404).json({ error: "Category not found." });
    if (cat.name === "Other") return res.status(400).json({ error: 'The "Other" category cannot be deleted.' });
    const leadsUsing = await Lead.countDocuments({ organization: orgId, category: cat.name });
    if (leadsUsing > 0) return res.status(400).json({ error: `Cannot delete — ${leadsUsing} lead(s) use this category.` });
    await Category.deleteOne({ _id: cat._id });
    await Activity.create({ organization: orgId, type: "category", message: `Category "${cat.name}" deleted.`, user: req.user.username });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
