import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    type: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    size: {
      type: Number,
      required: true,
      min: 0,
    },
    storageKey: {
      type: String,
      required: true,
      select: false,
    },
  },
  { _id: true },
);

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    content: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

messageSchema.pre("validate", function validateContentOrAttachment() {
  if (!this.content?.trim() && !this.attachments?.length) {
    throw new Error("Message content or attachment is required.");
  }
});

messageSchema.index({ conversationId: 1, createdAt: 1 });

const Message = mongoose.models.Message || mongoose.model("Message", messageSchema);

export default Message;
