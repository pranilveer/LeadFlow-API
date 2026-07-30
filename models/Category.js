import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
  name: { type: String, required: true, trim: true },
  color: { type: String, default: "#60A5FA" },
  description: { type: String, default: "" },
}, { timestamps: { createdAt: "createdAt", updatedAt: false } });

categorySchema.index({ organization: 1, name: 1 }, { unique: true });

export default mongoose.model("Category", categorySchema);
