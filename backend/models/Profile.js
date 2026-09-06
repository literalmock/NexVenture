import mongoose from "mongoose";

const experienceSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: "" },
    company: { type: String, trim: true, default: "" },
    location: { type: String, trim: true, default: "" },
    startDate: { type: String, default: "" },
    endDate: { type: String, default: "" },
    current: { type: Boolean, default: false },
    description: { type: String, default: "" },
  },
  { _id: true },
);

const educationSchema = new mongoose.Schema(
  {
    school: { type: String, trim: true, default: "" },
    degree: { type: String, trim: true, default: "" },
    field: { type: String, trim: true, default: "" },
    startYear: { type: String, default: "" },
    endYear: { type: String, default: "" },
  },
  { _id: true },
);

const profileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    headline: {
      type: String,
      trim: true,
      maxlength: 150,
      default: "",
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    location: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },
    skills: {
      type: [String],
      default: [],
      index: true,
    },
    interests: {
      type: [String],
      default: [],
    },
    experience: {
      type: [experienceSchema],
      default: [],
    },
    education: {
      type: [educationSchema],
      default: [],
    },
    portfolioUrl: {
      type: String,
      trim: true,
      default: "",
    },
    githubUrl: {
      type: String,
      trim: true,
      default: "",
    },
    linkedinUrl: {
      type: String,
      trim: true,
      default: "",
    },
    twitterUrl: {
      type: String,
      trim: true,
      default: "",
    },
    availability: {
      type: String,
      default: "open_to_projects",
    },
    hourlyRate: {
      type: Number,
      default: 0,
    },
    investorProfile: {
      investmentRange: { type: String, default: "$25k - $100k" },
      preferredStages: { type: [String], default: [] },
      preferredIndustries: { type: [String], default: [] },
      accredited: { type: Boolean, default: false },
      thesis: { type: String, default: "" },
    },
    mentorProfile: {
      expertise: { type: [String], default: [] },
      yearsExperience: { type: Number, default: 0 },
      availability: { type: String, default: "2 hrs/week" },
      sessionPrice: { type: Number, default: 0 },
      pricingType: { type: String, enum: ["free", "paid"], default: "free" },
    },
  },
  {
    timestamps: true,
  },
);

const Profile = mongoose.models.Profile || mongoose.model("Profile", profileSchema);

export default Profile;
