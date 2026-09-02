import { useState } from "react";
import { motion } from "framer-motion";
import { FiSend, FiImage, FiX } from "react-icons/fi";
import { useAuth } from "@/lib/auth";
import { USER_ROLE_BADGES } from "@/utils/enums";
import { cn } from "@/lib/utils";

const ROLE_PLACEHOLDERS = {
  founder: "Share a startup update, milestone, or insight…",
  mentor: "Share advice, a lesson learned, or a win from your mentees…",
  student: "Share your learning journey, project, or an opportunity…",
  investor: "Share a market insight, thesis, or portfolio update…",
};

export function PostComposer({ onPostCreated }) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const placeholder = ROLE_PLACEHOLDERS[user?.role] ?? "What's on your mind?";
  const initials = (user?.name ?? "N")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handlePost() {
    if (!content.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const { createPost } = await import("@/lib/api/postClient");
      const res = await createPost({ content: content.trim() });
      setContent("");
      if (onPostCreated) onPostCreated(res.post);
    } catch (err) {
      setError(err.message || "Failed to post. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handlePost();
    }
  }

  const charCount = content.length;
  const maxChars = 2000;
  const isOverLimit = charCount > maxChars;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass gradient-border rounded-3xl p-5"
    >
      <div className="flex gap-3.5">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="size-10 rounded-full object-cover ring-2 ring-border"
            />
          ) : (
            <span className="flex size-10 items-center justify-center rounded-full [background-image:var(--gradient-brand)] text-[13px] font-bold text-primary-foreground">
              {initials}
            </span>
          )}
        </div>

        {/* Composer */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{user?.name}</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
              {USER_ROLE_BADGES[user?.role] ?? "Member"}
            </span>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={3}
            maxLength={maxChars + 50}
            className={cn(
              "w-full resize-none rounded-2xl border border-border bg-secondary/60 px-4 py-3 text-sm outline-none transition-all",
              "placeholder:text-muted-foreground/60 focus:border-primary focus:ring-4 focus:ring-primary/10",
              isOverLimit && "border-destructive focus:ring-destructive/10",
            )}
          />

          {/* Error */}
          {error && (
            <div className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <span>{error}</span>
              <button onClick={() => setError(null)}>
                <FiX className="size-3.5" />
              </button>
            </div>
          )}

          {/* Actions row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-[11px] font-medium",
                  charCount > maxChars * 0.9 ? "text-amber-400" : "text-muted-foreground",
                  isOverLimit && "text-destructive",
                )}
              >
                {charCount}/{maxChars}
              </span>
              <span className="text-[11px] text-muted-foreground/60">· ⌘ Enter to post</span>
            </div>

            <button
              onClick={handlePost}
              disabled={!content.trim() || isSubmitting || isOverLimit}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all",
                "bg-primary text-primary-foreground hover:opacity-90 active:scale-95",
                "disabled:pointer-events-none disabled:opacity-40",
              )}
            >
              {isSubmitting ? (
                <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <FiSend className="size-4" />
              )}
              {isSubmitting ? "Posting…" : "Post"}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
