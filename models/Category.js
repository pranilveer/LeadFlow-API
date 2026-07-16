import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  color: { type: String, default: "#60A5FA" },
  description: { type: String, default: "" },
}, { timestamps: { createdAt: "createdAt", updatedAt: false } });

export default mongoose.model("Category", categorySchema);
