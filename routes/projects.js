import { Router } from "express";
import Project from "../models/Project.js";
import Category from "../models/Category.js";
import Activity from "../models/Activity.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/:categoryId", async (req, res) => {
  try {
    const orgId = req.user.organization;
    const cat = await Category.findOne({ _id: req.params.categoryId, organization: orgId });
    if (!cat) return res.status(404).json({ error: "Category not found" });
    const projects = await Project.find({ organization: orgId, category: cat._id }).sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/:categoryId", requireAdmin, async (req, res) => {
  try {
    const orgId = req.user.organization;
    const cat = await Category.findOne({ _id: req.params.categoryId, organization: orgId });
    if (!cat) return res.status(404).json({ error: "Category not found" });
    const { name, githubUrl, productionUrl } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "Project name is required" });
    const project = await Project.create({
      organization: orgId,
      category: cat._id,
      name: name.trim(),
      githubUrl: githubUrl || "",
      productionUrl: productionUrl || "",
      createdBy: req.user.username,
    });
    await Activity.create({ organization: orgId, type: "project", message: `Project "${project.name}" added to "${cat.name}".`, user: req.user.username });
    res.status(201).json(project);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

router.put("/:categoryId/:id", requireAdmin, async (req, res) => {
  try {
    const orgId = req.user.organization;
    const cat = await Category.findOne({ _id: req.params.categoryId, organization: orgId });
    if (!cat) return res.status(404).json({ error: "Category not found" });
    const project = await Project.findOne({ _id: req.params.id, organization: orgId, category: cat._id });
    if (!project) return res.status(404).json({ error: "Project not found" });
    if (req.body.name !== undefined) project.name = req.body.name.trim();
    if (req.body.githubUrl !== undefined) project.githubUrl = req.body.githubUrl;
    if (req.body.productionUrl !== undefined) project.productionUrl = req.body.productionUrl;
    await project.save();
    await Activity.create({ organization: orgId, type: "project", message: `Project "${project.name}" updated.`, user: req.user.username });
    res.json(project);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:categoryId/:id", requireAdmin, async (req, res) => {
  try {
    const orgId = req.user.organization;
    const cat = await Category.findOne({ _id: req.params.categoryId, organization: orgId });
    if (!cat) return res.status(404).json({ error: "Category not found" });
    const project = await Project.findOne({ _id: req.params.id, organization: orgId, category: cat._id });
    if (!project) return res.status(404).json({ error: "Project not found" });
    await Activity.create({ organization: orgId, type: "project", message: `Project "${project.name}" removed from "${cat.name}".`, user: req.user.username });
    await Project.deleteOne({ _id: project._id });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
