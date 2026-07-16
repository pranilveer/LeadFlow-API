import { Router } from "express";
import Activity from "../models/Activity.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const query = {};
    if (req.query.type) query.type = req.query.type;
    if (req.query.user) query.user = req.query.user;
    const activities = await Activity.find(query).sort({ timestamp: -1 }).limit(500);
    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
