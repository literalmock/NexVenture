import mongoose from "mongoose";
import { USER_ROLES, USER_ROLE_VALUES } from "../utils/enums.js";

const workspaceSchema = new mongoose.Schema(
  {
    startupProfile: {
      name: { type: String, trim: true, maxlength: 80, default: "" },
      tagline: { type: String, trim: true, maxlength: 180, default: "" },
      stage: { type: String, trim: true, maxlength: 40, default: "Pre-seed" },
      website: { type: String, trim: true, maxlength: 200, default: "" },
    },
    investorConnections: { type: [String], default: [] },
    eventRsvps: { type: [String], default: [] },
    bookmarkedStartupIds: { type: [String], default: [] },
    messages: {
      type: [
        new mongoose.Schema(
          {
            threadId: { type: String, required: true },
            body: { type: String, required: true, maxlength: 1000 },
            sentAt: { type: Date, default: Date.now },
          },
          { _id: true },
        ),
      ],
      default: [],
    },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      select: false,
    },
    googleSubject: {
      type: String,
      unique: true,
      sparse: true,
      select: false,
    },
    authProviders: {
      type: [String],
      enum: ["local", "google"],
      default: ["local"],
    },
    role: {
      type: String,
      enum: USER_ROLE_VALUES,
      default: USER_ROLES.FOUNDER,
    },
    roles: {
      type: [String],
      enum: USER_ROLE_VALUES,
      default: [USER_ROLES.FOUNDER],
    },
    onboardingComplete: {
      type: Boolean,
      default: true,
    },
    headline: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    location: {
      type: String,
      trim: true,
      maxlength: 80,
      default: "",
    },
    avatarUrl: {
      type: String,
      trim: true,
      default: "",
    },
    skills: {
      type: [String],
      default: [],
    },
    interests: {
      type: [String],
      default: [],
    },
    // For founders — links to their startup in the Startup collection
    linkedStartupId: {
      type: String,
      default: null,
    },
    workspace: {
      type: workspaceSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
