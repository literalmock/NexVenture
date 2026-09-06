import mongoose from "mongoose";
import { MEMBERSHIP_ROLES, MEMBERSHIP_STATUS } from "../utils/enums.js";

const startupMembershipSchema = new mongoose.Schema(
  {
    startupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Startup",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: Object.values(MEMBERSHIP_ROLES),
      default: MEMBERSHIP_ROLES.FOUNDER,
    },
    title: {
      type: String,
      trim: true,
      default: "Founder",
    },
    permissions: {
      type: [String],
      default: ["read", "write", "admin"],
    },
    status: {
      type: String,
      enum: Object.values(MEMBERSHIP_STATUS),
      default: MEMBERSHIP_STATUS.ACTIVE,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

startupMembershipSchema.index({ startupId: 1, userId: 1 }, { unique: true });

const StartupMembership =
  mongoose.models.StartupMembership || mongoose.model("StartupMembership", startupMembershipSchema);

export default StartupMembership;
