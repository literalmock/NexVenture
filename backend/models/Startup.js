import mongoose from "mongoose";
import { STARTUP_STATUS } from "../utils/enums.js";

const startupSchema = new mongoose.Schema(
  {
    id: { type: String, trim: true, sparse: true, index: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    logoUrl: { type: String, default: "", trim: true },
    initials: { type: String, default: "", trim: true },
    tagline: { type: String, default: "", trim: true },
    description: { type: String, required: true, trim: true },

    industry: { type: String, required: true, trim: true, index: true },
    categories: { type: [String], default: [] },
    stage: { type: String, required: true, trim: true, index: true },
    location: { type: String, required: true, trim: true, index: true },
    foundedYear: { type: Number, default: () => new Date().getFullYear() },
    founded: { type: Number, default: () => new Date().getFullYear() },

    website: { type: String, default: "", trim: true },
    linkedinUrl: { type: String, default: "", trim: true },
    twitterUrl: { type: String, default: "", trim: true },

    businessModel: { type: String, default: "B2B SaaS" },
    problem: { type: String, default: "" },
    solution: { type: String, default: "" },
    targetMarket: { type: String, default: "" },
    traction: { type: String, default: "" },
    revenue: { type: String, default: "Pre-revenue" },

    fundingRaised: { type: String, default: "$0" },
    fundingGoal: { type: String, default: "$500k" },
    funding: { type: String, default: "$0" },

    teamSize: { type: Number, default: 1 },
    team: { type: Number, default: 1 },
    growth: { type: Number, default: 0 },
    founder: { type: String, default: "", trim: true },
    founderRole: { type: String, default: "Founder & CEO" },

    status: {
      type: String,
      enum: Object.values(STARTUP_STATUS),
      default: STARTUP_STATUS.ACTIVE,
      index: true,
    },

    founderIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        index: true,
      },
    ],
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    hiring: { type: Boolean, default: false, index: true },
    top: { type: Boolean, default: false, index: true },
    color: { type: String, default: "#15191f" },
    isPublic: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

startupSchema.pre("validate", function () {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  if (!this.id && this.slug) {
    this.id = this.slug;
  }
  if (!this.initials && this.name) {
    this.initials = this.name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  if (this.ownerId && (!this.founderIds || this.founderIds.length === 0)) {
    this.founderIds = [this.ownerId];
  }
  if (this.fundingRaised && !this.funding) {
    this.funding = this.fundingRaised;
  }
  if (this.teamSize && !this.team) {
    this.team = this.teamSize;
  }
  if (this.foundedYear && !this.founded) {
    this.founded = this.foundedYear;
  }
});

const Startup = mongoose.models.Startup || mongoose.model("Startup", startupSchema);

export default Startup;
