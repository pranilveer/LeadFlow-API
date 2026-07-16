import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema({
  companyName: { type: String, default: "LeadFlow CRM" },
  timezone: { type: String, default: "America/New_York" },
  dateFormat: { type: String, default: "MMM D, YYYY" },
  leadsPerPage: { type: Number, default: 10 },
  defaultLeadStatus: { type: String, default: "New" },
  defaultLeadSource: { type: String, default: "Website" },
  emailNotifications: { type: Boolean, default: true },
  desktopNotifications: { type: Boolean, default: false },
  autoBackup: { type: Boolean, default: false },
});

export default mongoose.model("Settings", settingsSchema);
