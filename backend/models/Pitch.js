import mongoose from "mongoose";
import { PITCH_STATUS } from "../utils/enums.js";

const pitchSchema = new mongoose.Schema(
  {
    startupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Startup",
      required: true,
      index: true,
    },
    founderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Pitch title is required"],
      trim: true,
    },
    elevatorPitch: {
      type: String,
      required: [true, "Elevator pitch is required"],
      trim: true,
      maxlength: 500,
    },
    problem: {
      type: String,
      trim: true,
      default: "",
    },
    solution: {
      type: String,
      trim: true,
      default: "",
    },
    market: {
      type: String,
      trim: true,
      default: "",
    },
    businessModel: {
      type: String,
      trim: true,
      default: "",
    },
    traction: {
      type: String,
      trim: true,
      default: "",
    },
    competition: {
      type: String,
      trim: true,
      default: "",
    },
    competitiveAdvantage: {
      type: String,
      trim: true,
      default: "",
    },
    fundingAsk: {
      type: String,
      trim: true,
      default: "$500,000",
    },
    valuation: {
      type: String,
      trim: true,
      default: "",
    },
    pitchDeckUrl: {
      type: String,
      trim: true,
      default: "",
    },
    demoUrl: {
      type: String,
      trim: true,
      default: "",
    },
    videoUrl: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: Object.values(PITCH_STATUS),
      default: PITCH_STATUS.PUBLISHED,
      index: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    likesCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

const Pitch = mongoose.models.Pitch || mongoose.model("Pitch", pitchSchema);

export default Pitch;
