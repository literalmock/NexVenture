import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FiHeart,
  FiMessageCircle,
  FiMoreHorizontal,
  FiRefreshCw,
  FiSend,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import {
  addComment,
  deleteComment,
  deletePost,
  getFeedPosts,
  likePost,
} from "@/lib/api/postClient";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { USER_ROLE_BADGES } from "@/utils/enums";

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function PostCard({ post, currentUserId, onLike, onDelete, onCommentAdded, onCommentDeleted }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  const isOwn = currentUserId && post.author?.id === currentUserId;
  const initials = (post.author?.name ?? "?")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleAddComment(e) {
    e.preventDefault();
    if (!commentText.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      const res = await addComment(post.id, commentText.trim());
      setCommentText("");
      if (onCommentAdded) onCommentAdded(res.post);
    } catch (err) {
      console.error("Failed to add comment:", err);
    } finally {
      setSubmittingComment(false);
    }
  }

  async function handleDeleteComment(commentId) {
    try {
      const res = await deleteComment(post.id, commentId);
      if (onCommentDeleted) onCommentDeleted(res.post);
    } catch (err) {
      console.error("Failed to delete comment:", err);
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.25 }}
      className="rounded-3xl border border-border/80 bg-card/80 p-5 shadow-[var(--shadow-soft)] backdrop-blur-md"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {post.author?.avatarUrl ? (
            <img
              src={post.author.avatarUrl}
              alt={post.author.name}
              className="size-11 rounded-full object-cover ring-2 ring-border flex-shrink-0"
            />
          ) : (
            <span className="flex size-11 flex-shrink-0 items-center justify-center rounded-full [background-image:var(--gradient-brand)] text-[13px] font-bold text-primary-foreground">
              {initials}
            </span>
          )}
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold leading-tight">{post.author?.name ?? "Unknown"}</p>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary leading-tight">
                {USER_ROLE_BADGES[post.author?.role] ?? post.authorRole}
              </span>
            </div>
            {post.author?.headline && (
              <p className="mt-0.5 text-xs text-muted-foreground truncate max-w-sm">
                {post.author.headline}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[11px] text-muted-foreground">{timeAgo(post.createdAt)}</span>
          {isOwn && (
            <div className="relative">
              <button
                type="button"
                aria-label="Post actions"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex size-7 items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:bg-secondary transition-colors"
              >
                <FiMoreHorizontal className="size-4" />
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -4 }}
                    className="absolute right-0 top-full mt-1.5 z-50 min-w-[140px] rounded-xl border border-border bg-card p-1 shadow-xl"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onDelete(post.id);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <FiTrash2 className="size-4" /> Delete post
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <p className="mt-4 text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
        {post.content}
      </p>

      {/* Tags */}
      {post.tags?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => onLike(post.id)}
            className={cn(
              "flex items-center gap-1.5 text-sm font-semibold transition-all active:scale-90",
              post.likedByViewer
                ? "text-rose-500 hover:text-rose-600"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <FiHeart
              className={cn(
                "size-4 transition-all",
                post.likedByViewer && "fill-current scale-110",
              )}
            />
            <span>{post.likeCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowComments((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 text-sm font-semibold transition-colors",
              showComments ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <FiMessageCircle className="size-4" />
            <span>{post.commentCount > 0 ? `${post.commentCount} Comments` : "Comment"}</span>
          </button>
        </div>
      </div>

      {/* Expandable Comments Section */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 border-t border-border/50 pt-4 space-y-3"
          >
            {/* New Comment Input */}
            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment…"
                className="h-10 flex-1 rounded-xl border border-border bg-secondary/60 px-3.5 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
              <button
                type="submit"
                disabled={!commentText.trim() || submittingComment}
                className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40 hover:opacity-90 active:scale-95 transition-all"
              >
                <FiSend className="size-3.5" />
              </button>
            </form>

            {/* Comments List */}
            <div className="space-y-2.5">
              {post.comments?.map((comment) => {
                const commentInitials = (comment.author?.name || "M")
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                const canDelete =
                  currentUserId &&
                  (comment.author?.id === currentUserId || post.author?.id === currentUserId);

                return (
                  <div
                    key={comment.id}
                    className="flex items-start gap-2.5 rounded-2xl bg-secondary/50 p-3"
                  >
                    <span className="flex size-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                      {commentInitials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold">
                            {comment.author?.name || "Member"}
                          </span>
                          <span className="rounded-full bg-primary/10 px-1.5 py-0.2 text-[9px] font-semibold text-primary">
                            {USER_ROLE_BADGES[comment.author?.role] ?? comment.authorRole}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {timeAgo(comment.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap">
                        {comment.content}
                      </p>
                    </div>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDeleteComment(comment.id)}
                        className="p-1 text-muted-foreground hover:text-destructive"
                        title="Delete comment"
                      >
                        <FiTrash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function PostFeed({ newPost }) {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const seenIds = useRef(new Set());

  const loadPosts = useCallback(async (pageNum = 1, append = false) => {
    try {
      const res = await getFeedPosts(pageNum);
      const incoming = res.posts.filter((p) => {
        if (seenIds.current.has(p.id)) return false;
        seenIds.current.add(p.id);
        return true;
      });
      setPosts((prev) => (append ? [...prev, ...incoming] : incoming));
      setHasMore(res.pagination.hasMore);
    } catch (err) {
      setError(err.message || "Failed to load posts.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    setLoading(true);
    loadPosts(1);
  }, [loadPosts]);

  // Periodic polling every 12 seconds to sync new posts from other accounts
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await getFeedPosts(1);
        setPosts((currentPosts) => {
          const map = new Map(currentPosts.map((p) => [p.id, p]));
          res.posts.forEach((p) => {
            map.set(p.id, p);
            seenIds.current.add(p.id);
          });
          return Array.from(map.values()).sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
          );
        });
      } catch {
        /* silent */
      }
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  // Prepend newly created post from parent (PostComposer)
  useEffect(() => {
    if (!newPost) return;
    if (seenIds.current.has(newPost.id)) return;
    seenIds.current.add(newPost.id);
    setPosts((prev) => [newPost, ...prev]);
  }, [newPost]);

  async function handleLike(postId) {
    if (!user) return;
    try {
      const res = await likePost(postId);
      setPosts((prev) => prev.map((p) => (p.id === postId ? res.post : p)));
    } catch {
      /* silent */
    }
  }

  async function handleDelete(postId) {
    try {
      await deletePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      seenIds.current.delete(postId);
    } catch {
      /* silent */
    }
  }

  function handlePostUpdated(updatedPost) {
    setPosts((prev) => prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)));
  }

  async function loadMore() {
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    await loadPosts(nextPage, true);
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-3xl border border-border/60 bg-card/50"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-border bg-card/60 py-10 text-center">
        <p className="text-sm text-muted-foreground">{error}</p>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setLoading(true);
            loadPosts(1);
          }}
          className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors"
        >
          <FiRefreshCw className="size-4" /> Retry
        </button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-border bg-card/40 py-12 text-center">
        <span className="text-3xl">✍️</span>
        <p className="text-sm font-semibold">No posts yet</p>
        <p className="text-xs text-muted-foreground">
          Be the first to share an update, milestone, or question with the community!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence mode="popLayout">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            currentUserId={user?.id}
            onLike={handleLike}
            onDelete={handleDelete}
            onCommentAdded={handlePostUpdated}
            onCommentDeleted={handlePostUpdated}
          />
        ))}
      </AnimatePresence>

      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="flex items-center gap-2 rounded-xl border border-border bg-card/80 px-5 py-2.5 text-sm font-bold hover:bg-secondary transition-colors disabled:opacity-50"
          >
            {loadingMore ? (
              <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : null}
            {loadingMore ? "Loading…" : "Load more posts"}
          </button>
        </div>
      )}
    </div>
  );
}
