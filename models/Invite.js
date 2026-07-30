import mongoose from "mongoose";
import crypto from "crypto";

function generateCode() {
  return crypto.randomBytes(4).toString("hex");
}

const inviteSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
  code: { type: String, required: true, unique: true, default: generateCode },
  createdBy: { type: String, required: true },
  expiresAt: { type: Date, default: null },
  useCount: { type: Number, default: 0 },
  maxUses: { type: Number, default: null },
  active: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model("Invite", inviteSchema);
