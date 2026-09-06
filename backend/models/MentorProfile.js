import mongoose from "mongoose";

const mentorProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    expertise: {
      type: [String],
      default: [],
      index: true,
    },
    industries: {
      type: [String],
      default: [],
      index: true,
    },
    experience: {
      type: Number,
      default: 5,
    },
    bio: {
      type: String,
      trim: true,
      default: "",
    },
    availability: {
      type: String,
      default: "2-4 hrs / week",
    },
    sessionDuration: {
      type: String,
      default: "30 mins",
    },
    pricingType: {
      type: String,
      enum: ["free", "paid"],
      default: "free",
    },
    sessionPrice: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      default: 5.0,
    },
    isVerified: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

const MentorProfile =
  mongoose.models.MentorProfile || mongoose.model("MentorProfile", mentorProfileSchema);

export default MentorProfile;
