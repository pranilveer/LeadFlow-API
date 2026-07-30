import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
  username: { type: String, required: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["admin", "user"], default: "user" },
  name: { type: String, required: true, trim: true },
  email: { type: String, default: "" },
  phone: { type: String, default: "" },
  title: { type: String, default: "" },
  department: { type: String, default: "" },
  bio: { type: String, default: "" },
  avatarColor: { type: String, default: "#60A5FA" },
  lastLogin: { type: Date, default: null },
}, { timestamps: { createdAt: "createdAt", updatedAt: false } });

userSchema.index({ organization: 1, username: 1 }, { unique: true });
userSchema.index({ organization: 1, email: 1 }, { unique: true, sparse: true });

userSchema.set("toJSON", {
  transform(_doc, ret) {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("User", userSchema);
