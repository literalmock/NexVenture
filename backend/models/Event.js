import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },
    category: {
      type: String,
      default: "General",
      trim: true,
    },
    location: {
      type: String,
      default: "Online · Live room",
      trim: true,
    },
    startTime: {
      type: Date,
      required: true,
      index: true,
    },
    endTime: {
      type: Date,
      required: true,
      index: true,
    },
    rsvpDeadline: {
      type: Date,
      required: true,
      index: true,
    },
    organizerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    attendees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    remindersSent: [
      {
        type: String, // e.g. "24_HOUR", "1_HOUR", "DEADLINE"
      },
    ],
  },
  {
    timestamps: true,
  },
);

const Event = mongoose.models.Event || mongoose.model("Event", eventSchema);
export default Event;
