import mongoose from "mongoose";

const activitySchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
  type: { type: String, required: true, enum: ["lead", "auth", "category", "user", "system"] },
  message: { type: String, required: true },
  user: { type: String, default: "System" },
}, { timestamps: { createdAt: "timestamp", updatedAt: false } });

activitySchema.index({ organization: 1, timestamp: -1 });

export default mongoose.model("Activity", activitySchema);
