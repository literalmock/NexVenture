import { useCallback, useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  FiAward,
  FiBarChart2,
  FiBookOpen,
  FiCalendar,
  FiClock,
  FiDollarSign,
  FiFileText,
  FiMenu,
  FiMessageCircle,
  FiPieChart,
  FiSearch,
  FiStar,
  FiTarget,
  FiTrendingUp,
  FiUserCheck,
  FiUsers,
  FiZap,
} from "react-icons/fi";
import { NotificationBell } from "@/components/nex/NotificationBell";
import { PostComposer } from "@/components/nex/PostComposer";
import { PostFeed } from "@/components/nex/PostFeed";
import { WorkspaceSidebar } from "@/components/nex/WorkspaceSidebar";
import { rsvpEvent } from "@/lib/api/notificationClient";
import { fetchWorkspaceStats } from "@/lib/api/workspaceClient";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { USER_ROLE_BADGES } from "@/utils/enums";

// ─── Role Icons Map ──────────────────────────────────────────────────────────

const METRIC_ICONS = {
  views: { icon: FiTrendingUp, color: "bg-violet-500/10 text-violet-400" },
  investors: { icon: FiDollarSign, color: "bg-emerald-500/10 text-emerald-400" },
  applications: { icon: FiUsers, color: "bg-blue-500/10 text-blue-400" },
  progress: { icon: FiBarChart2, color: "bg-amber-500/10 text-amber-400" },
  matches: { icon: FiTarget, color: "bg-emerald-500/10 text-emerald-400" },
  watchlist: { icon: FiStar, color: "bg-amber-500/10 text-amber-400" },
  portfolio: { icon: FiPieChart, color: "bg-violet-500/10 text-violet-400" },
  capital: { icon: FiDollarSign, color: "bg-blue-500/10 text-blue-400" },
  teams: { icon: FiUsers, color: "bg-amber-500/10 text-amber-400" },
  sessions: { icon: FiCalendar, color: "bg-blue-500/10 text-blue-400" },
  rating: { icon: FiStar, color: "bg-violet-500/10 text-violet-400" },
  hours: { icon: FiClock, color: "bg-emerald-500/10 text-emerald-400" },
  connections: { icon: FiUsers, color: "bg-emerald-500/10 text-emerald-400" },
};

const ROLE_CONFIG = {
  founder: {
    headline: "Your raise is moving",
    summary: "Live ecosystem metrics, investor signals, and team applications.",
    quickActions: [
      {
        label: "Update Pitch Deck",
        icon: FiBookOpen,
        color: "bg-violet-500/10 text-violet-400",
        to: "/workspace/startup",
      },
      {
        label: "Connect Investors",
        icon: FiDollarSign,
        color: "bg-emerald-500/10 text-emerald-400",
        to: "/workspace/investors",
      },
      { label: "Post Update", icon: FiZap, color: "bg-blue-500/10 text-blue-400", action: "post" },
    ],
  },
  investor: {
    headline: "Your deal flow is live",
    summary: "Active startup matches, incoming founder pitches, and saved watchlist companies.",
    quickActions: [
      {
        label: "Browse Deal Flow",
        icon: FiTarget,
        color: "bg-emerald-500/10 text-emerald-400",
        to: "/startups",
      },
      {
        label: "Watchlist",
        icon: FiStar,
        color: "bg-amber-500/10 text-amber-400",
        to: "/workspace/bookmarks",
      },
      {
        label: "Send Intro",
        icon: FiMessageCircle,
        color: "bg-blue-500/10 text-blue-400",
        to: "/workspace/messages",
      },
    ],
  },
  mentor: {
    headline: "Your mentorship hub",
    summary: "Active team sessions, founder office hours, and ecosystem signals.",
    quickActions: [
      {
        label: "Schedule Session",
        icon: FiCalendar,
        color: "bg-amber-500/10 text-amber-400",
        to: "/workspace/events",
      },
      {
        label: "Explore Teams",
        icon: FiBookOpen,
        color: "bg-blue-500/10 text-blue-400",
        to: "/startups",
      },
      {
        label: "Review Requests",
        icon: FiUserCheck,
        color: "bg-emerald-500/10 text-emerald-400",
        to: "/workspace/messages",
      },
    ],
  },
  student: {
    headline: "Your career & startup launchpad",
    summary: "Hiring startups, internship applications, and mentor connections.",
    quickActions: [
      {
        label: "Explore Startups",
        icon: FiAward,
        color: "bg-blue-500/10 text-blue-400",
        to: "/startups",
      },
      {
        label: "Events & RSVPs",
        icon: FiCalendar,
        color: "bg-amber-500/10 text-amber-400",
        to: "/workspace/events",
      },
      {
        label: "Share Update",
        icon: FiZap,
        color: "bg-violet-500/10 text-violet-400",
        action: "post",
      },
    ],
  },
};

const UPCOMING_EVENTS = [
  { id: "demo-day", title: "Demo Day — Seed Cohort", when: "Sep 03 · 5:00 PM" },
  { id: "saas-ama", title: "Investor AMA: SaaS Metrics", when: "Sep 08 · 7:30 PM" },
  { id: "office-hours", title: "Founder Office Hours", when: "Sep 12 · 11:00 AM" },
];

// ─── Route ───────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — NEXVENTURE" },
      { name: "description", content: "Your NEXVENTURE workspace overview." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

// ─── Sub-components ───────────────────────────────────────────────────────────

function Panel({ title, action, onAction, className, children }) {
  return (
    <div className={cn("glass gradient-border rounded-3xl p-5", className)}>
      <div className="flex items-center justify-between">
        <p className="font-display text-sm font-bold">{title}</p>
        {action ? (
          <button
            type="button"
            onClick={onAction}
            className="cursor-pointer text-xs font-semibold text-primary hover:underline"
          >
            {action}
          </button>
        ) : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function MetricCard({ label, value, signal, iconType, index }) {
  const meta = METRIC_ICONS[iconType] || {
    icon: FiTrendingUp,
    color: "bg-primary/10 text-primary",
  };
  const Icon = meta.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 + index * 0.06 }}
      className="rounded-3xl border border-border/80 bg-card/80 p-4.5 shadow-[var(--shadow-soft)] backdrop-blur-md"
    >
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-bold tracking-[0.1em] text-muted-foreground uppercase">
          {label}
        </p>
        <span className={cn("flex size-8 items-center justify-center rounded-xl", meta.color)}>
          <Icon className="size-4" />
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <p className="font-display text-2xl font-bold tracking-tight">{value}</p>
        <span className="rounded-full bg-success/10 px-2 py-1 text-[10px] font-bold text-success">
          {signal}
        </span>
      </div>
    </motion.div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [latestPost, setLatestPost] = useState(null);
  const [liveStats, setLiveStats] = useState(null);
  const [rsvpdEvents, setRsvpdEvents] = useState(user?.workspace?.eventRsvps || []);

  const role = user?.role ?? "founder";
  const cfg = ROLE_CONFIG[role] ?? ROLE_CONFIG.founder;

  const loadStats = useCallback(async () => {
    try {
      const res = await fetchWorkspaceStats();
      if (res.success) {
        setLiveStats(res);
      }
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 8000);
    return () => clearInterval(interval);
  }, [loadStats]);

  async function handleRsvp(eventItem) {
    try {
      const res = await rsvpEvent(eventItem.id, eventItem.title);
      setRsvpdEvents(res.eventRsvps || []);
      loadStats();
    } catch {
      /* silent */
    }
  }

  // Calculate profile completion percentage
  const profileFields = [
    user?.name,
    user?.email,
    user?.role,
    user?.headline,
    user?.bio,
    user?.location,
    user?.avatarUrl,
    user?.skills?.length,
  ];
  const filledCount = profileFields.filter(Boolean).length;
  const completionPct = Math.min(100, Math.round((filledCount / profileFields.length) * 100));

  const initials = (user?.name ?? "N")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const metricsToDisplay = liveStats?.metrics || [
    { label: "Role matches", value: "8", signal: "+3", type: "matches" },
    { label: "Profile views", value: "34", signal: "+12%", type: "views" },
    { label: "Applications", value: "6", signal: "2 active", type: "applications" },
    { label: "Connections", value: "18", signal: "+4", type: "connections" },
  ];

  return (
    <div className="relative flex min-h-screen bg-background">
      <WorkspaceSidebar open={open} onClose={() => setOpen(false)} />

      <div className="relative flex-1 lg:pl-64">
        {/* Header */}
        <header className="glass sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 px-4 sm:px-6">
          <button
            type="button"
            aria-label="Toggle sidebar"
            onClick={() => setOpen((v) => !v)}
            className="flex size-9 items-center justify-center rounded-xl border border-border bg-card lg:hidden"
          >
            <FiMenu className="size-4" />
          </button>
          <label className="relative hidden flex-1 items-center sm:flex">
            <FiSearch className="absolute left-3 size-4 text-muted-foreground" />
            <input
              placeholder="Search startups, investors, mentors…"
              aria-label="Search"
              className="h-10 w-full max-w-md rounded-xl border border-border bg-card pr-3 pl-9 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/12"
            />
          </label>
          <div className="ml-auto flex items-center gap-2.5">
            <NotificationBell />
            <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card py-1.5 pr-3 pl-1.5">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="size-7 rounded-lg object-cover"
                />
              ) : (
                <span className="flex size-7 items-center justify-center rounded-lg [background-image:var(--gradient-brand)] text-[11px] font-bold text-primary-foreground">
                  {initials}
                </span>
              )}
              <div className="hidden flex-col sm:flex">
                <span className="text-xs font-semibold leading-tight">{user?.name}</span>
                <span className="text-[10px] text-muted-foreground capitalize leading-none">
                  {USER_ROLE_BADGES[role]}
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="relative space-y-5 p-4 sm:p-6">
          {/* Hero banner */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="glass gradient-border flex flex-wrap items-center justify-between gap-4 rounded-3xl p-6"
          >
            <div>
              <div
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary capitalize",
                )}
              >
                {USER_ROLE_BADGES[role]} Workspace
              </div>
              <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">
                {cfg.headline}, <span className="gradient-text">{user?.name}</span>
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground max-w-xl">{cfg.summary}</p>
            </div>
            <div className="w-full max-w-xs">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-muted-foreground">Profile completion</span>
                <span>{completionPct}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${completionPct}%` }}
                  transition={{ duration: 1.1, ease: "easeOut" }}
                  className="h-full rounded-full [background-image:var(--gradient-brand)]"
                />
              </div>
            </div>
          </motion.div>

          {/* Real-time Metric cards */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metricsToDisplay.map((m, i) => (
              <MetricCard
                key={m.label}
                label={m.label}
                value={m.value}
                signal={m.signal}
                iconType={m.type}
                index={i}
              />
            ))}
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-3 gap-3">
            {cfg.quickActions.map(({ label, icon: Icon, color, to, action }) => (
              <motion.button
                key={label}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  if (to) navigate({ to });
                  else if (action === "post") {
                    window.scrollTo({ top: 900, behavior: "smooth" });
                  }
                }}
                className="flex flex-col items-center gap-2 rounded-2xl border border-border/80 bg-card/80 px-4 py-4 text-center backdrop-blur hover:border-primary/30 transition-colors"
              >
                <span className={cn("flex size-10 items-center justify-center rounded-xl", color)}>
                  <Icon className="size-5" />
                </span>
                <span className="text-xs font-semibold leading-tight">{label}</span>
              </motion.button>
            ))}
          </div>

          {/* Main grid */}
          <div className="grid gap-5 lg:grid-cols-3">
            {/* Live Notifications Panel */}
            <Panel
              title="Notifications"
              action="View all"
              onAction={() => navigate({ to: "/workspace/messages" })}
            >
              <div className="space-y-2.5">
                {liveStats?.recentNotifications?.length > 0 ? (
                  liveStats.recentNotifications.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "flex gap-3 rounded-2xl p-3 text-xs leading-snug transition-colors",
                        !item.read ? "bg-primary/8 border border-primary/20" : "bg-secondary/60",
                      )}
                    >
                      <span className="text-base flex-shrink-0">
                        {item.type === "intro_request"
                          ? "🤝"
                          : item.type === "application"
                            ? "🎯"
                            : item.type === "rsvp"
                              ? "🎟️"
                              : item.type === "post_like"
                                ? "❤️"
                                : "🔔"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground">{item.title}</p>
                        <p className="mt-0.5 text-muted-foreground line-clamp-1">{item.message}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-4 text-center text-xs text-muted-foreground">
                    No new notifications. You are all caught up!
                  </div>
                )}
              </div>
            </Panel>

            {/* Live Activity */}
            <Panel
              title="Recent activity"
              action="Explore"
              onAction={() => navigate({ to: "/startups" })}
            >
              <div className="space-y-3 text-xs">
                <div className="flex items-start justify-between gap-3">
                  <p className="leading-snug">Synced with MongoDB live cluster</p>
                  <span className="shrink-0 text-[10px] text-emerald-500 font-bold">Live</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <p className="leading-snug">
                    {liveStats?.counts?.totalStartups || 12} startups indexed in dealroom
                  </p>
                  <span className="shrink-0 text-[10px] text-muted-foreground">Active</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <p className="leading-snug">
                    {liveStats?.counts?.userPostsCount || 0} community posts contributed
                  </p>
                  <span className="shrink-0 text-[10px] text-muted-foreground">Feed</span>
                </div>
              </div>
            </Panel>

            {/* Upcoming events with live RSVP */}
            <Panel
              title="Upcoming events"
              action="All Events"
              onAction={() => navigate({ to: "/workspace/events" })}
            >
              <div className="space-y-2.5">
                {UPCOMING_EVENTS.map((event) => {
                  const isGoing = rsvpdEvents.includes(event.id);
                  return (
                    <div
                      key={event.id}
                      className="flex items-center justify-between rounded-2xl border border-border/70 bg-card/70 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold leading-tight">{event.title}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">{event.when}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRsvp(event)}
                        className={cn(
                          "ml-2 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all active:scale-95",
                          isGoing
                            ? "bg-emerald-500/15 text-emerald-500"
                            : "bg-foreground text-background hover:opacity-90",
                        )}
                      >
                        {isGoing ? "Going ✓" : "RSVP"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </Panel>

            {/* Post Composer + Feed — full width */}
            <div className="space-y-4 lg:col-span-3">
              <p className="font-display text-sm font-bold px-1">Community Feed</p>
              <PostComposer
                onPostCreated={(post) => {
                  setLatestPost(post);
                  loadStats();
                }}
              />
              <PostFeed newPost={latestPost} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
