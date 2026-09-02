import mongoose from "mongoose";
import { COMPANIES } from "../../frontend/src/data/companies.js";
import { connectDB } from "../config/db.js";
import Startup from "../models/Startup.js";

try {
  await connectDB();
  const result = await Startup.bulkWrite(
    COMPANIES.map((company) => ({
      updateOne: {
        filter: { id: company.id },
        update: { $set: company },
        upsert: true,
      },
    })),
  );
  console.log(
    `Startup catalog imported: ${result.upsertedCount} inserted, ${result.modifiedCount} updated.`,
  );
} finally {
  await mongoose.disconnect();
}
