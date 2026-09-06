import mongoose from "mongoose";
import { CONNECTION_STATUS } from "../utils/enums.js";

const connectionSchema = new mongoose.Schema(
  {
    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(CONNECTION_STATUS),
      default: CONNECTION_STATUS.PENDING,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

connectionSchema.index({ requesterId: 1, recipientId: 1 }, { unique: true });

const Connection = mongoose.models.Connection || mongoose.model("Connection", connectionSchema);

export default Connection;
