import Notification from "../models/Notification.js";
import Post from "../models/Post.js";
import mongoose from "mongoose";

const PAGE_SIZE = 20;
// Feed/list responses only ship the latest few comments per post — loading and
// populating an author for every comment on every post was the main source of
// slow feed loads. Older comments are fetched on demand via getPostComments.
const FEED_COMMENT_PREVIEW = 3;
const COMMENT_PAGE_SIZE = 10;

/**
 * POST /posts
 * Create a new post. Requires auth (req.userId set by requireAuth).
 */
export async function createPost(req, res, next) {
  try {
    const { content, mediaUrls = [], tags = [] } = req.body;

    if (!content || !String(content).trim()) {
      return res.status(400).json({ success: false, error: "Post content cannot be empty." });
    }

    const user = req.currentUser;
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    const post = await Post.create({
      author: user._id,
      authorRole: user.role,
      content: String(content).trim().slice(0, 2000),
      mediaUrls: Array.isArray(mediaUrls) ? mediaUrls.slice(0, 4) : [],
      tags: Array.isArray(tags) ? tags.slice(0, 10) : [],
    });

    const populated = await post.populate("author", "name avatarUrl role headline linkedStartupId");

    return res.status(201).json({ success: true, post: toPostDTO(populated, req.userId) });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /posts
 * Public paginated feed — newest first.
 * Query params: page (default 1)
 */
export async function getFeedPosts(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const skip = (page - 1) * PAGE_SIZE;

    const [posts, total] = await Promise.all([
      Post.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(PAGE_SIZE)
        // Only pull the newest FEED_COMMENT_PREVIEW comments per post from Mongo —
        // avoids loading (and populating an author for) every comment on every post.
        .slice("comments", -FEED_COMMENT_PREVIEW)
        .populate("author", "name avatarUrl role headline linkedStartupId")
        .populate("comments.author", "name avatarUrl role headline")
        .lean()
        .exec(),
      Post.countDocuments(),
    ]);

    const viewerUserId = req.userId || null;

    return res.json({
      success: true,
      posts: posts.map((p) => toPostDTO(p, viewerUserId, { preview: true })),
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.ceil(total / PAGE_SIZE),
        hasMore: skip + posts.length < total,
      },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /posts/user/:userId
 * Posts by a specific user.
 */
export async function getPostsByUser(req, res, next) {
  try {
    const { userId } = req.params;
    const page = Math.max(1, Number(req.query.page) || 1);
    const skip = (page - 1) * PAGE_SIZE;

    const [posts, total] = await Promise.all([
      Post.find({ author: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(PAGE_SIZE)
        .slice("comments", -FEED_COMMENT_PREVIEW)
        .populate("author", "name avatarUrl role headline linkedStartupId")
        .populate("comments.author", "name avatarUrl role headline")
        .lean()
        .exec(),
      Post.countDocuments({ author: userId }),
    ]);

    return res.json({
      success: true,
      posts: posts.map((p) => toPostDTO(p, req.userId || null, { preview: true })),
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        hasMore: skip + posts.length < total,
      },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * PATCH /posts/:id/like
 * Toggle like on a post. Requires auth.
 */
export async function likePost(req, res, next) {
  try {
    const post = await Post.findById(req.params.id).select("author content likes").exec();

    if (!post) {
      return res.status(404).json({ success: false, error: "Post not found." });
    }

    const userId = req.userId.toString();
    const alreadyLiked = post.likes.some((id) => id.toString() === userId);

    if (alreadyLiked) {
      post.likes = post.likes.filter((id) => id.toString() !== userId);
    } else {
      post.likes.push(req.userId);

      // Create notification for author if not liking own post
      if (post.author.toString() !== userId) {
        await Notification.create({
          recipient: post.author,
          sender: req.userId,
          type: "post_like",
          title: "New Post Like",
          message: `${req.currentUser?.name || "Someone"} liked your post: "${post.content.slice(0, 50)}..."`,
          status: "read",
        });
      }
    }

    await post.save();
    const preview = await getPostPreview(req.params.id, userId);

    return res.json({ success: true, post: preview });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /posts/:id/comments
 * Add a comment to a post. Requires auth.
 */
export async function addComment(req, res, next) {
  try {
    const { content } = req.body;
    if (!content || !String(content).trim()) {
      return res.status(400).json({ success: false, error: "Comment text cannot be empty." });
    }

    const post = await Post.findById(req.params.id).select("author content").lean().exec();
    if (!post) {
      return res.status(404).json({ success: false, error: "Post not found." });
    }

    const user = req.currentUser;
    const now = new Date();
    const trimmedContent = String(content).trim().slice(0, 1000);

    await Post.updateOne(
      { _id: req.params.id },
      {
        $push: {
          comments: {
            _id: new mongoose.Types.ObjectId(),
            author: user._id,
            authorRole: user.role,
            content: trimmedContent,
            createdAt: now,
            updatedAt: now,
          },
        },
        $inc: { commentCount: 1, commentsCount: 1 },
      },
    );

    // Create notification for post author if commenter is not author
    if (post.author.toString() !== req.userId.toString()) {
      await Notification.create({
        recipient: post.author,
        sender: user._id,
        type: "post_comment",
        title: "New Comment",
        message: `${user.name} commented: "${trimmedContent.slice(0, 60)}..."`,
        status: "read",
      });
    }

    const preview = await getPostPreview(req.params.id, req.userId);

    return res.status(201).json({ success: true, post: preview });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /posts/:id/comments
 * Paginated comment history for a single post, oldest-of-the-window first.
 * Query params: before (index counted from the end already shown by the client), limit
 */
export async function getPostComments(req, res, next) {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || COMMENT_PAGE_SIZE));
    const before = Math.max(0, Number(req.query.before) || 0);
    const total = await getCommentCount(req.params.id);

    if (total === null) {
      return res.status(404).json({ success: false, error: "Post not found." });
    }

    const endIndex = Math.max(0, total - before);
    const startIndex = Math.max(0, endIndex - limit);

    if (startIndex >= endIndex) {
      return res.json({ success: true, comments: [], hasMore: false });
    }

    // Server-side $slice keeps Mongo from sending the full embedded array.
    const sliced = await Post.findById(req.params.id)
      .select("comments")
      .slice("comments", [startIndex, endIndex - startIndex])
      .populate("comments.author", "name avatarUrl role headline")
      .lean()
      .exec();

    return res.json({
      success: true,
      comments: (sliced?.comments || []).map(toCommentDTO),
      hasMore: startIndex > 0,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * DELETE /posts/:id/comments/:commentId
 * Delete a comment from a post.
 */
export async function deleteComment(req, res, next) {
  try {
    const post = await Post.findOne({
      _id: req.params.id,
      "comments._id": req.params.commentId,
    })
      .select({
        author: 1,
        comments: { $elemMatch: { _id: req.params.commentId } },
      })
      .exec();

    if (!post || !post.comments?.length) {
      return res.status(404).json({ success: false, error: "Comment not found." });
    }

    const comment = post.comments[0];

    if (
      comment.author.toString() !== req.userId.toString() &&
      post.author.toString() !== req.userId.toString()
    ) {
      return res
        .status(403)
        .json({ success: false, error: "You can only delete your own comments." });
    }

    await Post.updateOne(
      { _id: req.params.id, "comments._id": req.params.commentId },
      {
        $pull: { comments: { _id: req.params.commentId } },
        $inc: { commentCount: -1, commentsCount: -1 },
      },
    );

    const preview = await getPostPreview(req.params.id, req.userId);

    return res.json({ success: true, post: preview });
  } catch (error) {
    return next(error);
  }
}

/**
 * DELETE /posts/:id
 * Delete own post. Requires auth.
 */
export async function deletePost(req, res, next) {
  try {
    const post = await Post.findById(req.params.id).exec();

    if (!post) {
      return res.status(404).json({ success: false, error: "Post not found." });
    }

    if (post.author.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, error: "You can only delete your own posts." });
    }

    await post.deleteOne();
    return res.json({ success: true, message: "Post deleted." });
  } catch (error) {
    return next(error);
  }
}

// ─── DTO ────────────────────────────────────────────────────────────────────

async function getPostPreview(postId, viewerUserId) {
  const post = await Post.findById(postId)
    .slice("comments", -FEED_COMMENT_PREVIEW)
    .populate("author", "name avatarUrl role headline linkedStartupId")
    .populate("comments.author", "name avatarUrl role headline")
    .lean()
    .exec();

  return toPostDTO(post, viewerUserId, { preview: true });
}

async function getCommentCount(postId) {
  if (!mongoose.isValidObjectId(postId)) return null;

  const [result] = await Post.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(postId) } },
    {
      $project: {
        commentCount: {
          $ifNull: [
            "$commentCount",
            {
              $ifNull: ["$commentsCount", { $size: { $ifNull: ["$comments", []] } }],
            },
          ],
        },
      },
    },
  ]);

  return result ? result.commentCount : null;
}

function toCommentDTO(c) {
  return {
    id: c._id.toString(),
    author: c.author
      ? {
          id: c.author._id ? c.author._id.toString() : c.author.toString(),
          name: c.author.name || "Member",
          avatarUrl: c.author.avatarUrl || "",
          role: c.author.role || c.authorRole,
          headline: c.author.headline || "",
        }
      : null,
    authorRole: c.authorRole,
    content: c.content,
    createdAt: c.createdAt,
  };
}

function toPostDTO(post, viewerUserId, { preview = false } = {}) {
  const likeIds = (post.likes || []).map((id) => id.toString());
  const allComments = post.comments || [];
  const commentCount = post.commentCount ?? post.commentsCount ?? allComments.length;
  // In preview mode we already only fetched the last few comments from Mongo
  // (see FEED_COMMENT_PREVIEW / .slice("comments", ...)), so this just formats
  // what's in memory — it never re-truncates a fully-loaded array.
  const visibleComments = preview ? allComments.slice(-FEED_COMMENT_PREVIEW) : allComments;

  return {
    id: post._id.toString(),
    author: post.author
      ? {
          id: post.author._id.toString(),
          name: post.author.name,
          avatarUrl: post.author.avatarUrl || "",
          role: post.author.role,
          headline: post.author.headline || "",
          linkedStartupId: post.author.linkedStartupId || null,
        }
      : null,
    authorRole: post.authorRole,
    content: post.content,
    mediaUrls: post.mediaUrls || [],
    tags: post.tags || [],
    likes: likeIds,
    likeCount: likeIds.length,
    likedByViewer: viewerUserId ? likeIds.includes(viewerUserId.toString()) : false,
    comments: visibleComments.map(toCommentDTO),
    commentCount,
    hasMoreComments: commentCount > visibleComments.length,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}
