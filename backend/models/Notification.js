import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    type: {
      type: String,
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      default: "general",
    },
    entityId: {
      type: String,
      default: null,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    startupId: {
      type: String,
      default: null,
      trim: true,
    },
    startupName: {
      type: String,
      default: null,
      trim: true,
    },
    eventId: {
      type: String,
      default: null,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "read"],
      default: "pending",
      index: true,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

notificationSchema.pre("save", function () {
  if (!this.recipientId && this.recipient) {
    this.recipientId = this.recipient;
  }
  if (!this.recipient && this.recipientId) {
    this.recipient = this.recipientId;
  }
  if (!this.senderId && this.sender) {
    this.senderId = this.sender;
  }
  if (!this.sender && this.senderId) {
    this.sender = this.senderId;
  }
});

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, createdAt: -1 });

const Notification =
  mongoose.models.Notification || mongoose.model("Notification", notificationSchema);

export default Notification;
