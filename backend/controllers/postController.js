import Notification from "../models/Notification.js";
import Post from "../models/Post.js";
import User from "../models/User.js";

const PAGE_SIZE = 20;

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

    const user = await User.findById(req.userId).exec();
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

    const populated = await post.populate([
      { path: "author", select: "name avatarUrl role headline linkedStartupId" },
      { path: "comments.author", select: "name avatarUrl role headline" },
    ]);

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
        .populate("author", "name avatarUrl role headline linkedStartupId")
        .populate("comments.author", "name avatarUrl role headline")
        .exec(),
      Post.countDocuments(),
    ]);

    const viewerUserId = req.userId || null;

    return res.json({
      success: true,
      posts: posts.map((p) => toPostDTO(p, viewerUserId)),
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
        .populate("author", "name avatarUrl role headline linkedStartupId")
        .populate("comments.author", "name avatarUrl role headline")
        .exec(),
      Post.countDocuments({ author: userId }),
    ]);

    return res.json({
      success: true,
      posts: posts.map((p) => toPostDTO(p, req.userId || null)),
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
    const post = await Post.findById(req.params.id).exec();

    if (!post) {
      return res.status(404).json({ success: false, error: "Post not found." });
    }

    const userId = req.userId;
    const alreadyLiked = post.likes.some((id) => id.toString() === userId);

    if (alreadyLiked) {
      post.likes = post.likes.filter((id) => id.toString() !== userId);
    } else {
      post.likes.push(userId);

      // Create notification for author if not liking own post
      if (post.author.toString() !== userId) {
        const liker = await User.findById(userId).select("name").exec();
        await Notification.create({
          recipient: post.author,
          sender: userId,
          type: "post_like",
          title: "New Post Like",
          message: `${liker?.name || "Someone"} liked your post: "${post.content.slice(0, 50)}..."`,
          status: "read",
        });
      }
    }

    await post.save();
    await post.populate([
      { path: "author", select: "name avatarUrl role headline linkedStartupId" },
      { path: "comments.author", select: "name avatarUrl role headline" },
    ]);

    return res.json({ success: true, post: toPostDTO(post, userId) });
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

    const post = await Post.findById(req.params.id).exec();
    if (!post) {
      return res.status(404).json({ success: false, error: "Post not found." });
    }

    const user = await User.findById(req.userId).exec();
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    post.comments.push({
      author: user._id,
      authorRole: user.role,
      content: String(content).trim().slice(0, 1000),
    });

    await post.save();

    // Create notification for post author if commenter is not author
    if (post.author.toString() !== req.userId) {
      await Notification.create({
        recipient: post.author,
        sender: user._id,
        type: "post_comment",
        title: "New Comment",
        message: `${user.name} commented: "${String(content).trim().slice(0, 60)}..."`,
        status: "read",
      });
    }

    await post.populate([
      { path: "author", select: "name avatarUrl role headline linkedStartupId" },
      { path: "comments.author", select: "name avatarUrl role headline" },
    ]);

    return res.status(201).json({ success: true, post: toPostDTO(post, req.userId) });
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
    const post = await Post.findById(req.params.id).exec();
    if (!post) {
      return res.status(404).json({ success: false, error: "Post not found." });
    }

    const comment = post.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ success: false, error: "Comment not found." });
    }

    if (comment.author.toString() !== req.userId && post.author.toString() !== req.userId) {
      return res
        .status(403)
        .json({ success: false, error: "You can only delete your own comments." });
    }

    comment.deleteOne();
    await post.save();

    await post.populate([
      { path: "author", select: "name avatarUrl role headline linkedStartupId" },
      { path: "comments.author", select: "name avatarUrl role headline" },
    ]);

    return res.json({ success: true, post: toPostDTO(post, req.userId) });
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

    if (post.author.toString() !== req.userId) {
      return res.status(403).json({ success: false, error: "You can only delete your own posts." });
    }

    await post.deleteOne();
    return res.json({ success: true, message: "Post deleted." });
  } catch (error) {
    return next(error);
  }
}

// ─── DTO ────────────────────────────────────────────────────────────────────

function toPostDTO(post, viewerUserId) {
  const likeIds = (post.likes || []).map((id) => id.toString());
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
    comments: (post.comments || []).map((c) => ({
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
    })),
    commentCount: (post.comments || []).length,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}
