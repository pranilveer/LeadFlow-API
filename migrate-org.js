import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";
import Organization from "./models/Organization.js";
import Lead from "./models/Lead.js";
import Category from "./models/Category.js";
import Activity from "./models/Activity.js";
import Settings from "./models/Settings.js";
import Counter from "./models/Counter.js";

dotenv.config();

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const existingOrg = await Organization.findOne();
    if (existingOrg) {
      console.log(`Organization "${existingOrg.name}" already exists. Data may already be migrated.`);
      const userCount = await User.countDocuments({ organization: existingOrg._id });
      console.log(`${userCount} users already assigned to this organization.`);
      process.exit(0);
    }

    const org = await Organization.create({ name: "Default Organization" });
    console.log(`Created default organization: ${org.name}`);

    const userResult = await User.updateMany({}, { $set: { organization: org._id } });
    console.log(`Updated ${userResult.modifiedCount} users`);

    const leadResult = await Lead.updateMany({}, { $set: { organization: org._id } });
    console.log(`Updated ${leadResult.modifiedCount} leads`);

    const catResult = await Category.updateMany({}, { $set: { organization: org._id } });
    console.log(`Updated ${catResult.modifiedCount} categories`);

    const actResult = await Activity.updateMany({}, { $set: { organization: org._id } });
    console.log(`Updated ${actResult.modifiedCount} activities`);

    const settingsDoc = await Settings.findOne();
    if (settingsDoc) {
      settingsDoc.organization = org._id;
      await settingsDoc.save();
      console.log("Updated settings");
    }

    const counter = await Counter.findOne({ name: "lead_seq" });
    if (counter) {
      await Counter.create({ name: `lead_seq_${org._id}`, seq: counter.seq });
      await Counter.deleteOne({ name: "lead_seq" });
      console.log("Migrated lead counter");
    }

    console.log("\nMigration complete! All existing data is now under the default organization.");
    process.exit(0);
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
}

migrate();
