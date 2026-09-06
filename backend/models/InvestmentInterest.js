import mongoose from "mongoose";
import { INVESTMENT_STATUS } from "../utils/enums.js";

export const ACTIVE_INVESTMENT_INTEREST_STATUSES = Object.freeze([
  INVESTMENT_STATUS.PENDING,
  INVESTMENT_STATUS.ACCEPTED,
  INVESTMENT_STATUS.FOUNDER_REVIEW,
]);

const investmentInterestSchema = new mongoose.Schema(
  {
    investorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    startupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Startup",
      required: true,
      index: true,
    },
    pitchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pitch",
      default: null,
      index: true,
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      default: null,
      index: true,
    },
    amountRange: {
      type: String,
      required: true,
      default: "$25,000 - $50,000",
    },
    message: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    status: {
      type: String,
      enum: Object.values(INVESTMENT_STATUS),
      default: INVESTMENT_STATUS.PENDING,
      index: true,
    },
    founderNotes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

investmentInterestSchema.index(
  { investorId: 1, startupId: 1 },
  {
    unique: true,
    name: "unique_active_investment_interest_by_investor_startup",
    partialFilterExpression: {
      status: { $in: ACTIVE_INVESTMENT_INTEREST_STATUSES },
    },
  },
);
investmentInterestSchema.index({ investorId: 1, startupId: 1, createdAt: -1 });

const InvestmentInterest =
  mongoose.models.InvestmentInterest ||
  mongoose.model("InvestmentInterest", investmentInterestSchema);

export default InvestmentInterest;
