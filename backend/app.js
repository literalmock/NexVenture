import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import Post from "./models/Post.js";
import apiRoutes from "./routes/index.js";
import { reconcileInvestmentInterestLifecycle } from "./services/investmentService.js";

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

export function createApp() {
  const app = express();
  const allowedOrigins = buildAllowedOrigins();

  app.use(
    cors({
      origin(origin, callback) {
        if (
          !origin ||
          allowedOrigins.has(origin) ||
          (env.NODE_ENV === "development" &&
            /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))
        ) {
          return callback(null, true);
        }

        return callback(null, false);
      },
      credentials: true,
    }),
  );
  app.use(express.json());

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
}
