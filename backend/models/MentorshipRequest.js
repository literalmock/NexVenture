import mongoose from "mongoose";
import { MENTORSHIP_INITIATORS, MENTORSHIP_STATUS } from "../utils/enums.js";

const mentorshipRequestSchema = new mongoose.Schema(
  {
    mentorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    startupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Startup",
      default: null,
      index: true,
    },
    founderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    initiatedBy: {
      type: String,
      enum: Object.values(MENTORSHIP_INITIATORS),
      default: MENTORSHIP_INITIATORS.FOUNDER,
      index: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    goals: {
      type: [String],
      default: [],
    },
    focusAreas: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: Object.values(MENTORSHIP_STATUS),
      default: MENTORSHIP_STATUS.PENDING,
      index: true,
    },
    scheduledAt: {
      type: Date,
      default: null,
    },
    meetingNotes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

const MentorshipRequest =
  mongoose.models.MentorshipRequest || mongoose.model("MentorshipRequest", mentorshipRequestSchema);

export default MentorshipRequest;
