import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
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

userSchema.set("toJSON", {
  transform(_doc, ret) {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("User", userSchema);
