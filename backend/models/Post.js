import mongoose from "mongoose";
import { POST_TYPES } from "../utils/enums.js";

const commentSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    authorRole: {
      type: String,
      default: "founder",
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
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    authorRole: {
      type: String,
      default: "founder",
      trim: true,
    },
    type: {
      type: String,
      enum: Object.values(POST_TYPES),
      default: POST_TYPES.TEXT,
      index: true,
    },
    content: {
      type: String,
      required: [true, "Post content is required."],
      trim: true,
      maxlength: [2000, "Post cannot exceed 2000 characters."],
    },
    startupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Startup",
      default: null,
      index: true,
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
    likesCount: {
      type: Number,
      default: 0,
    },
    comments: {
      type: [commentSchema],
      default: [],
    },
    commentsCount: {
      type: Number,
      default: 0,
    },
    commentCount: {
      type: Number,
      default: 0,
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

postSchema.pre("save", function () {
  if (!this.authorId && this.author) {
    this.authorId = this.author;
  }
  if (!this.author && this.authorId) {
    this.author = this.authorId;
  }
  if (this.likes) {
    this.likesCount = this.likes.length;
  }
  if (this.comments) {
    this.commentsCount = this.comments.length;
    this.commentCount = this.comments.length;
  }
});

postSchema.index({ createdAt: -1 });

const Post = mongoose.models.Post || mongoose.model("Post", postSchema);

export default Post;
