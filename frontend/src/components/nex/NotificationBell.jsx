import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FiBell,
  FiCheck,
  FiClock,
  FiInfo,
  FiRefreshCw,
  FiUserCheck,
  FiUserX,
  FiX,
  FiZap,
} from "react-icons/fi";
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  respondToNotification,
} from "@/lib/api/notificationClient";
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

export function NotificationBell({ className }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [filter, setFilter] = useState("all"); // 'all' | 'requests'
  const [loading, setLoading] = useState(false);
  const [respondingId, setRespondingId] = useState(null);
  const containerRef = useRef(null);

  async function loadNotifications(silent = false) {
    if (!silent) setLoading(true);
    try {
      const res = await getNotifications();
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
      setPendingCount(res.pendingRequestsCount || 0);
    } catch {
      // silent catch for polling
    } finally {
      if (!silent) setLoading(false);
    }
  }

  // Initial fetch and auto-polling every 10 seconds
  useEffect(() => {
    loadNotifications();
    const interval = setInterval(() => {
      loadNotifications(true);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsAsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      /* silent */
    }
  }

  async function handleNotificationClick(item) {
    if (!item.read) {
      try {
        await markNotificationAsRead(item.id);
        setUnreadCount((c) => Math.max(0, c - 1));
        setNotifications((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
      } catch {
        /* silent */
      }
    }
  }

  async function handleResponse(notificationId, action) {
    setRespondingId(notificationId);
    try {
      const res = await respondToNotification(notificationId, action);
      const updated = res.notification;
      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? updated : n)));
      setPendingCount((c) => Math.max(0, c - 1));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error("Failed to respond to notification:", err);
    } finally {
      setRespondingId(null);
    }
  }

  const displayedNotifications =
    filter === "requests"
      ? notifications.filter((n) => ["intro_request", "application", "mentorship"].includes(n.type))
      : notifications;

  return (
    <div ref={containerRef} className={cn("relative inline-block", className)}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ""}`}
        onClick={() => {
          setOpen((v) => !v);
          if (!open) loadNotifications(true);
        }}
        className={cn(
          "relative flex size-9 items-center justify-center rounded-xl border border-border bg-card transition-all hover:bg-secondary active:scale-95",
          open && "border-primary/50 bg-primary/8 text-primary shadow-sm",
        )}
      >
        <FiBell className="size-4" />
        {unreadCount > 0 ? (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground shadow-sm animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : pendingCount > 0 ? (
          <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-amber-500 shadow-sm" />
        ) : null}
      </button>

      {/* Notifications Dropdown Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute right-0 top-full mt-2.5 z-50 w-[360px] sm:w-[420px] max-w-[calc(100vw-2rem)] rounded-3xl border border-border/90 bg-card/95 p-4 shadow-2xl backdrop-blur-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <p className="font-display text-base font-bold">Notifications</p>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <FiX className="size-4" />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="mt-3 flex gap-1.5 border-b border-border/40 pb-2">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={cn(
                  "rounded-lg px-3 py-1 text-xs font-semibold transition-colors",
                  filter === "all"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                All ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter("requests")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-colors",
                  filter === "requests"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <span>Requests</span>
                {pendingCount > 0 && (
                  <span className="rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[10px] text-amber-500 font-bold">
                    {pendingCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => loadNotifications()}
                title="Refresh notifications"
                className="ml-auto flex size-6 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <FiRefreshCw className={cn("size-3.5", loading && "animate-spin")} />
              </button>
            </div>

            {/* Notifications List */}
            <div className="mt-2 max-h-[380px] space-y-2 overflow-y-auto pr-1">
              {displayedNotifications.length === 0 ? (
                <div className="py-12 text-center">
                  <span className="text-3xl">🔔</span>
                  <p className="mt-2 text-sm font-semibold">No notifications</p>
                  <p className="text-xs text-muted-foreground">You are all caught up!</p>
                </div>
              ) : (
                displayedNotifications.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={cn(
                      "group relative rounded-2xl border p-3.5 transition-all",
                      !item.read
                        ? "border-primary/30 bg-primary/5 shadow-xs"
                        : "border-border/60 bg-secondary/40 hover:bg-secondary/70",
                    )}
                  >
                    {/* Header */}
                    <div className="flex items-start gap-3">
                      {/* Sender Avatar */}
                      <div className="flex-shrink-0">
                        {item.sender?.avatarUrl ? (
                          <img
                            src={item.sender.avatarUrl}
                            alt={item.sender.name}
                            className="size-9 rounded-full object-cover ring-1 ring-border"
                          />
                        ) : (
                          <span className="flex size-9 items-center justify-center rounded-full [background-image:var(--gradient-brand)] text-[11px] font-bold text-primary-foreground">
                            {(item.sender?.name || "?")
                              .split(" ")
                              .map((p) => p[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Info & Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <p className="truncate text-xs font-bold leading-tight text-foreground">
                            {item.title}
                          </p>
                          <span className="flex-shrink-0 text-[10px] text-muted-foreground">
                            {timeAgo(item.createdAt)}
                          </span>
                        </div>

                        {item.sender && (
                          <div className="mt-0.5 flex items-center gap-1.5">
                            <span className="text-[11px] font-medium text-muted-foreground">
                              {item.sender.name}
                            </span>
                            <span className="rounded-full bg-primary/10 px-1.5 py-0.2 text-[9px] font-semibold text-primary capitalize">
                              {USER_ROLE_BADGES[item.sender.role] ?? item.sender.role}
                            </span>
                          </div>
                        )}

                        <p className="mt-1.5 text-xs leading-relaxed text-foreground/85 whitespace-pre-wrap">
                          {item.message}
                        </p>

                        {/* Action Buttons for Pending Requests */}
                        {item.status === "pending" && (
                          <div className="mt-3 flex items-center gap-2 pt-1 border-t border-border/40">
                            <button
                              type="button"
                              disabled={respondingId === item.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResponse(item.id, "approve");
                              }}
                              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500/15 py-1.5 text-xs font-bold text-emerald-500 transition-colors hover:bg-emerald-500/25 active:scale-95 disabled:opacity-50"
                            >
                              <FiCheck className="size-3.5" /> Approve
                            </button>
                            <button
                              type="button"
                              disabled={respondingId === item.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResponse(item.id, "disapprove");
                              }}
                              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-destructive/15 py-1.5 text-xs font-bold text-destructive transition-colors hover:bg-destructive/25 active:scale-95 disabled:opacity-50"
                            >
                              <FiX className="size-3.5" /> Disapprove
                            </button>
                          </div>
                        )}

                        {/* Status Badge if already responded */}
                        {item.status === "approved" && (
                          <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-emerald-500">
                            <FiCheck className="size-3.5" /> Approved
                          </div>
                        )}
                        {item.status === "rejected" && (
                          <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-destructive">
                            <FiX className="size-3.5" /> Declined
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
