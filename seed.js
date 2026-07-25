import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "./models/User.js";
import Lead from "./models/Lead.js";
import Category from "./models/Category.js";
import Activity from "./models/Activity.js";
import Settings from "./models/Settings.js";
import Counter from "./models/Counter.js";

dotenv.config();

const USERS = [
  { username: "Admin", password: "Admin@123", role: "admin", name: "Admin User", email: "admin@leadflow.io", phone: "+1 (555) 100-0001", title: "System Administrator", department: "Operations", bio: "Full access administrator for LeadFlow CRM.", avatarColor: "#60A5FA", createdAt: new Date("2024-01-01T08:00:00.000Z"), lastLogin: null },
  { username: "John", password: "John@123", role: "user", name: "John Mitchell", email: "john@leadflow.io", phone: "+1 (555) 200-0002", title: "Sales Executive", department: "Sales", bio: "Focused on enterprise pipeline growth and client relationships.", avatarColor: "#34D399", createdAt: new Date("2024-02-15T09:30:00.000Z"), lastLogin: null },
  { username: "Sarah", password: "Sarah@123", role: "user", name: "Sarah Chen", email: "sarah@leadflow.io", phone: "+1 (555) 300-0003", title: "Account Manager", department: "Sales", bio: "Manages mid-market accounts and inbound lead qualification.", avatarColor: "#C084FC", createdAt: new Date("2024-03-01T10:00:00.000Z"), lastLogin: null },
];

const CATEGORIES = [
  { name: "Technology", color: "#60A5FA", description: "Software, IT services, and SaaS companies.", createdAt: new Date("2024-01-01T08:00:00.000Z") },
  { name: "Healthcare", color: "#34D399", description: "Hospitals, clinics, and health-tech providers.", createdAt: new Date("2024-01-01T08:00:00.000Z") },
  { name: "Finance", color: "#FBBF24", description: "Banks, fintech, and financial advisory firms.", createdAt: new Date("2024-01-01T08:00:00.000Z") },
  { name: "Retail", color: "#F87171", description: "E-commerce and brick-and-mortar retail.", createdAt: new Date("2024-01-01T08:00:00.000Z") },
  { name: "Education", color: "#C084FC", description: "Schools, universities, and ed-tech platforms.", createdAt: new Date("2024-01-01T08:00:00.000Z") },
  { name: "Other", color: "#9AA3B5", description: "Miscellaneous or uncategorized leads.", createdAt: new Date("2024-01-01T08:00:00.000Z") },
];

const LEADS = [
  { id: "LD-2024-00001", leadName: "Michael Torres", businessName: "NovaTech Solutions", email: "michael@novatech.io", phone: "+1 (555) 401-2200", website: "https://novatech.io", category: "Technology", customCategory: "", city: "San Francisco", state: "CA", country: "USA", address: "100 Market Street, Suite 400", description: "Interested in enterprise CRM integration for 200+ sales reps.", leadSource: "LinkedIn", leadStatus: "Qualified", addedDate: "2024-07-16", addedTime: "09:15:00", addedBy: "John", updatedAt: new Date() },
  { id: "LD-2024-00002", leadName: "Emily Watson", businessName: "GreenLeaf Health", email: "emily@greenleaf.health", phone: "+1 (555) 402-3300", website: "https://greenleaf.health", category: "Healthcare", customCategory: "", city: "Boston", state: "MA", country: "USA", address: "45 Harbor View Blvd", description: "Looking for patient outreach automation tools.", leadSource: "Referral", leadStatus: "Contacted", addedDate: "2024-07-16", addedTime: "10:42:00", addedBy: "Sarah", updatedAt: new Date() },
  { id: "LD-2024-00003", leadName: "David Kim", businessName: "Summit Finance Group", email: "david@summitfinance.com", phone: "+1 (555) 403-4400", website: "https://summitfinance.com", category: "Finance", customCategory: "", city: "New York", state: "NY", country: "USA", address: "200 Wall Street, Floor 18", description: "Evaluating lead scoring for wealth management division.", leadSource: "Website", leadStatus: "New", addedDate: "2024-07-16", addedTime: "11:08:00", addedBy: "Admin", updatedAt: new Date() },
  { id: "LD-2024-00004", leadName: "Lisa Anderson", businessName: "Urban Style Retail", email: "lisa@urbanstyle.com", phone: "+1 (555) 404-5500", website: "https://urbanstyle.com", category: "Retail", customCategory: "", city: "Chicago", state: "IL", country: "USA", address: "88 Michigan Avenue", description: "Needs omnichannel lead capture for 40 store locations.", leadSource: "Event", leadStatus: "Proposal", addedDate: "2024-07-10", addedTime: "14:20:00", addedBy: "John", updatedAt: new Date() },
  { id: "LD-2024-00005", leadName: "Robert Patel", businessName: "BrightPath Academy", email: "robert@brightpath.edu", phone: "+1 (555) 405-6600", website: "https://brightpath.edu", category: "Education", customCategory: "", city: "Austin", state: "TX", country: "USA", address: "12 University Drive", description: "Enrollment lead management for online programs.", leadSource: "Cold Call", leadStatus: "Negotiation", addedDate: "2024-07-08", addedTime: "16:55:00", addedBy: "Sarah", updatedAt: new Date() },
];

const SETTINGS = {
  companyName: "LeadFlow CRM", timezone: "Asia/Kolkata", dateFormat: "MMM D, YYYY",
  leadsPerPage: 10, defaultLeadStatus: "New", defaultLeadSource: "Website",
  emailNotifications: true, desktopNotifications: false, autoBackup: false,
};

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    await Promise.all([
      User.deleteMany({}), Lead.deleteMany({}), Category.deleteMany({}),
      Activity.deleteMany({}), Settings.deleteMany({}), Counter.deleteMany({}),
    ]);
    console.log("Cleared existing data");

    for (const u of USERS) {
      const hashed = await bcrypt.hash(u.password, 10);
      await User.create({ ...u, password: hashed });
    }
    console.log(`Created ${USERS.length} users`);

    await Category.insertMany(CATEGORIES);
    console.log(`Created ${CATEGORIES.length} categories`);

    await Lead.insertMany(LEADS);
    console.log(`Created ${LEADS.length} leads`);

    await Settings.create(SETTINGS);
    console.log("Created settings");

    await Counter.create({ name: "lead_seq", seq: 6 });
    console.log("Created lead counter");

    await Activity.create({ type: "system", message: "LeadFlow CRM initialized with sample data.", user: "System" });
    console.log("Created initial activity");

    console.log("\nSeed complete! Demo accounts:");
    console.log("  Admin / Admin@123 (admin)");
    console.log("  John / John@123 (user)");
    console.log("  Sarah / Sarah@123 (user)");

    process.exit(0);
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  }
}

seed();
