import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  name: { type: String, required: true, trim: true },
  githubUrl: { type: String, default: "" },
  productionUrl: { type: String, default: "" },
  createdBy: { type: String, default: "" },
}, { timestamps: true });

projectSchema.index({ organization: 1, category: 1 });

export default mongoose.model("Project", projectSchema);
