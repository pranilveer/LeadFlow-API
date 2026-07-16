import mongoose from "mongoose";

const activitySchema = new mongoose.Schema({
  type: { type: String, required: true, enum: ["lead", "auth", "category", "user", "system"] },
  message: { type: String, required: true },
  user: { type: String, default: "System" },
}, { timestamps: { createdAt: "timestamp", updatedAt: false } });

export default mongoose.model("Activity", activitySchema);
