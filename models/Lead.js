import mongoose from "mongoose";

const leadSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
  id: { type: String, required: true },
  leadName: { type: String, trim: true },
  businessName: { type: String, required: true, trim: true },
  email: { type: String, trim: true },
  phone: { type: String, required: true, default: "" },
  website: { type: String, default: "" },
  category: { type: String, required: true },
  customCategory: { type: String, default: "" },
  city: { type: String, default: "" },
  state: { type: String, default: "" },
  country: { type: String, default: "" },
  address: { type: String, default: "" },
  description: { type: String, default: "" },
  leadSource: { type: String, default: "Website" },
  leadStatus: { type: String, default: "New" },
  addedDate: { type: String, required: true },
  addedTime: { type: String, required: true },
  addedBy: { type: String, required: true },
}, { timestamps: { createdAt: false, updatedAt: "updatedAt" } });

leadSchema.index({ organization: 1, id: 1 }, { unique: true });

export default mongoose.model("Lead", leadSchema);
