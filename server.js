import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.js";
import leadRoutes from "./routes/leads.js";
import categoryRoutes from "./routes/categories.js";
import userRoutes from "./routes/users.js";
import activityRoutes from "./routes/activities.js";
import settingsRoutes from "./routes/settings.js";
import backupRoutes from "./routes/backup.js";
import projectRoutes from "./routes/projects.js";

dotenv.config();

const app = express();

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map(s => s.trim().replace(/\/+$/, ""))
  : [];

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin.replace(/\/+$/, ""))) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));

const CONN_OPTS = {
  serverSelectionTimeoutMS: Number(process.env.MONGO_TIMEOUT_MS) || 15000,
  bufferCommands: false,
  maxPoolSize: 10,
};

let cached = global.mongoose || (global.mongoose = { conn: null, promise: null });

async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGO_URI, CONN_OPTS).then((m) => {
      console.log("MongoDB connected");
      return m;
    });
  }
  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }
  return cached.conn;
}

app.use(async (_req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    res.status(503).json({
      error: "Database is unreachable. Check your MONGO_URI and ensure your MongoDB Atlas network access allows all IPs (0.0.0.0/0).",
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/users", userRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/backup", backupRoutes);
app.use("/api/projects", projectRoutes);

app.get("/api/health", async (_req, res) => {
  try {
    await connectDB();
    res.json({ status: mongoose.connection.readyState === 1 ? "ok" : "connecting" });
  } catch (err) {
    res.status(503).json({ status: "error", error: err.message });
  }
});

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

const PORT = process.env.PORT || 5000;

if (process.env.VERCEL) {
  console.log("Running on Vercel");
} else {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    connectDB().catch((err) => {
      console.error("MongoDB connection error:", err.message);
      process.exit(1);
    });
  });
}

export default app;
