import { env } from "../config/env.js";
import { getDatabaseStatus } from "../config/db.js";

export function healthCheck(req, res) {
  return res.json({
    success: true,
    service: "NEXVENTURE Backend API",
    apiVersion: env.API_PREFIX.replace("/api/", ""),
    database: getDatabaseStatus(),
    timestamp: new Date().toISOString(),
  });
}
