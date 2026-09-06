import mongoose from "mongoose";
import { APPLICATION_STATUS } from "../utils/enums.js";

const applicationSchema = new mongoose.Schema(
  {
    opportunityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Opportunity",
      required: true,
      index: true,
    },
    startupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Startup",
      required: true,
      index: true,
    },
    applicantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    coverMessage: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    portfolioUrl: {
      type: String,
      trim: true,
      default: "",
    },
    resumeUrl: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: Object.values(APPLICATION_STATUS),
      default: APPLICATION_STATUS.PENDING,
      index: true,
    },
    feedback: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

applicationSchema.index({ opportunityId: 1, applicantId: 1 }, { unique: true });

const Application = mongoose.models.Application || mongoose.model("Application", applicationSchema);

export default Application;
