import mongoose from "mongoose";
import { COMPENSATION_TYPES, OPPORTUNITY_TYPES } from "../utils/enums.js";

const opportunitySchema = new mongoose.Schema(
  {
    startupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Startup",
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Opportunity title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: Object.values(OPPORTUNITY_TYPES),
      default: OPPORTUNITY_TYPES.PROJECT,
      index: true,
    },
    skills: {
      type: [String],
      default: [],
      index: true,
    },
    compensationType: {
      type: String,
      enum: Object.values(COMPENSATION_TYPES),
      default: COMPENSATION_TYPES.PAID,
    },
    compensation: {
      type: String,
      default: "$20 - $40 / hr",
    },
    remote: {
      type: Boolean,
      default: true,
      index: true,
    },
    location: {
      type: String,
      default: "Remote",
    },
    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
      index: true,
    },
    applicantsCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

const Opportunity = mongoose.models.Opportunity || mongoose.model("Opportunity", opportunitySchema);

export default Opportunity;
