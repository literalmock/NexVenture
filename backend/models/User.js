import mongoose from "mongoose";
import { USER_ROLES, USER_ROLE_VALUES } from "../utils/enums.js";

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
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    authProviders: {
      type: [String],
      enum: ["local", "google"],
      default: ["local"],
    },
    roles: {
      type: [String],
      enum: USER_ROLE_VALUES,
      default: [USER_ROLES.FOUNDER],
      index: true,
    },
    activeRole: {
      type: String,
      enum: USER_ROLE_VALUES,
      default: USER_ROLES.FOUNDER,
    },
    role: {
      type: String,
      enum: USER_ROLE_VALUES,
      default: USER_ROLES.FOUNDER,
    },
    avatarUrl: {
      type: String,
      trim: true,
      default: "",
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    headline: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },
    location: {
      type: String,
      trim: true,
      maxlength: 80,
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
    onboardingComplete: {
      type: Boolean,
      default: true,
    },
    linkedStartupId: {
      type: String,
      default: null,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
    workspace: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  },
);

userSchema.pre("save", function () {
  if (!this.roles || this.roles.length === 0) {
    this.roles = [this.role || USER_ROLES.FOUNDER];
  }
  if (!this.activeRole) {
    this.activeRole = this.roles[0];
  }
  this.role = this.activeRole;
});

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
