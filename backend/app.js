import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import Post from "./models/Post.js";
import apiRoutes from "./routes/index.js";
import healthRoutes from "./routes/healthRoutes.js";
import { reconcileInvestmentInterestLifecycle } from "./services/investmentService.js";
import { ensureDefaultEvents, checkAndGenerateEventReminders } from "./services/eventService.js";

function buildAllowedOrigins() {
  return new Set([
    env.CLIENT_ORIGIN,
    ...(env.NODE_ENV === "development"
      ? [
          "http://localhost:8080",
          "http://127.0.0.1:8080",
          "http://localhost:8081",
          "http://127.0.0.1:8081",
          "http://localhost:5173",
          "http://127.0.0.1:5173",
        ]
      : []),
  ]);
}

function isOriginAllowed(origin, allowedOrigins) {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;
  if (origin.endsWith(".vercel.app")) return true;
  if (
    env.NODE_ENV === "development" &&
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
  ) {
    return true;
  }
  return false;
}

let startupTasksPromise = null;
let dbConnectPromise = null;

export async function ensureDbAndStartupTasks() {
  if (mongoose.connection.readyState !== 1) {
    if (!dbConnectPromise) {
      dbConnectPromise = connectDB().finally(() => {
        dbConnectPromise = null;
      });
    }
    await dbConnectPromise;
  }

  if (!startupTasksPromise) {
    startupTasksPromise = runStartupTasks().catch((err) => {
      console.error("Startup tasks error:", err);
      startupTasksPromise = null;
    });
  }
  return startupTasksPromise;
}

export function createApp() {
  const app = express();
  const allowedOrigins = buildAllowedOrigins();

  app.use(
    cors({
      origin(origin, callback) {
        if (isOriginAllowed(origin, allowedOrigins)) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      credentials: true,
    }),
  );
  app.use(express.json());

  // Automatically connect to DB and run startup tasks on demand (for serverless / Vercel lifecycle)
  app.use(async (req, res, next) => {
    try {
      await ensureDbAndStartupTasks();
      next();
    } catch (error) {
      if (req.path === "/health" || req.path.endsWith("/health")) {
        return next();
      }
      next(error);
    }
  });

  app.use("/health", healthRoutes);
  app.use(env.API_PREFIX, apiRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export async function runStartupTasks() {
  await reconcileInvestmentInterestLifecycle();
  await Post.updateMany(
    { commentCount: { $exists: false } },
    [{ $set: { commentCount: { $size: { $ifNull: ["$comments", []] } } } }],
    { updatePipeline: true },
  );
  await ensureDefaultEvents().catch((err) => console.error("Event init error:", err.message));
  await checkAndGenerateEventReminders().catch((err) =>
    console.error("Event reminder check error:", err.message),
  );
}
