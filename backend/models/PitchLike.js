import mongoose from "mongoose";

const pitchLikeSchema = new mongoose.Schema(
  {
    pitchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pitch",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

pitchLikeSchema.index({ pitchId: 1, userId: 1 }, { unique: true });

const PitchLike = mongoose.models.PitchLike || mongoose.model("PitchLike", pitchLikeSchema);

export default PitchLike;
