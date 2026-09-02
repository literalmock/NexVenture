import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    authorRole: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: [true, "Comment content is required."],
      trim: true,
      maxlength: [1000, "Comment cannot exceed 1000 characters."],
    },
  },
  {
    timestamps: true,
  },
);

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    authorRole: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: [true, "Post content is required."],
      trim: true,
      maxlength: [2000, "Post cannot exceed 2000 characters."],
    },
    mediaUrls: {
      type: [String],
      default: [],
    },
    likes: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    comments: {
      type: [commentSchema],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

// Index for feed queries (newest first)
postSchema.index({ createdAt: -1 });

const Post = mongoose.models.Post || mongoose.model("Post", postSchema);

export default Post;
