import dotenv from "dotenv";

dotenv.config();

const DEFAULT_MONGODB_URI = "mongodb://127.0.0.1:27017/nexventure";
const DEFAULT_JWT_SECRET = "replace-this-local-development-secret";

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT) || 5050,
  API_PREFIX: process.env.API_PREFIX || "/api/v1",
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || "http://localhost:8080",
  MONGODB_URI: process.env.MONGODB_URI || DEFAULT_MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET || DEFAULT_JWT_SECRET,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || "",
};
