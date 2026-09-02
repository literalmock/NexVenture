import mongoose from "mongoose";
import { env } from "./env.js";

let lastError = null;

mongoose.connection.on("connected", () => {
  lastError = null;
});

mongoose.connection.on("error", (error) => {
  lastError = error.message;
});

export async function connectDB() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  lastError = null;

  try {
    const connection = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`MongoDB connected: ${connection.connection.host}/${connection.connection.name}`);
    return connection;
  } catch (error) {
    lastError = error.message;
    throw error;
  }
}

export function getDatabaseStatus() {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  const readyState = mongoose.connection.readyState;

  return {
    state: states[readyState] || "unknown",
    isConnected: readyState === 1,
    host: readyState === 1 ? mongoose.connection.host : null,
    database: readyState === 1 ? mongoose.connection.name : null,
    lastError,
  };
}
