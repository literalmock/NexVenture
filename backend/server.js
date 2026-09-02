import cors from "cors";
import express from "express";
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import apiRoutes from "./routes/index.js";

const app = express();
const allowedOrigins = new Set([
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

async function startServer() {
  try {
    await connectDB();
    app.listen(env.PORT, "0.0.0.0", () => {
      console.log(`NEXVENTURE API running at http://localhost:${env.PORT}${env.API_PREFIX}`);
      console.log(`Health check: http://localhost:${env.PORT}${env.API_PREFIX}/health`);
    });
  } catch (error) {
    console.error("Failed to start backend:", error.message);
    process.exit(1);
  }
}

startServer();

export default app;
