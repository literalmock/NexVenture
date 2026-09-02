import mongoose from "mongoose";

const startupSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    initials: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    industry: { type: String, required: true, trim: true, index: true },
    stage: { type: String, required: true, trim: true, index: true },
    location: { type: String, required: true, trim: true },
    founded: { type: Number, required: true },
    funding: { type: String, required: true },
    growth: { type: Number, default: 0 },
    team: { type: Number, default: 1 },
    founder: { type: String, required: true, trim: true },
    founderRole: { type: String, default: "" },
    hiring: { type: Boolean, default: false, index: true },
    top: { type: Boolean, default: false, index: true },
    color: { type: String, default: "#15191f" },
  },
  { timestamps: true },
);

const Startup = mongoose.models.Startup || mongoose.model("Startup", startupSchema);

export default Startup;
