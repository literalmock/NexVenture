import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ["user", "startup", "pitch", "post", "opportunity", "application", "other"],
      required: true,
      index: true,
    },
    targetId: {
      type: String,
      required: true,
      index: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ["pending", "resolved", "dismissed"],
      default: "pending",
      index: true,
    },
    actionTaken: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

const Report = mongoose.models.Report || mongoose.model("Report", reportSchema);

export default Report;
