import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  FiArrowUpRight,
  FiBookmark,
  FiCalendar,
  FiCheck,
  FiClock,
  FiMapPin,
  FiMenu,
  FiMessageSquare,
  FiSend,
  FiTrendingUp,
  FiUsers,
} from "react-icons/fi";
import { WorkspaceSidebar } from "@/components/nex/WorkspaceSidebar";
import { NotificationBell } from "@/components/nex/NotificationBell";
import { Field } from "@/components/nex/AuthShell";
import { NexButton } from "@/components/nex/primitives";
import { fetchStartups } from "@/lib/api/startupClient";
import { fetchWorkspace, patchWorkspace } from "@/lib/api/workspaceClient";
import { rsvpEvent, sendIntroRequest } from "@/lib/api/notificationClient";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { USER_ROLE_LABELS, USER_ROLE_VALUES } from "@/utils/enums";

const SECTION_META = {
  startup: ["My Startup", "Keep your company signal sharp and investor-ready."],
  investors: ["Investors", "Build warm, thesis-aligned relationships."],
  events: ["Events", "Show up where the ecosystem is moving."],
  messages: ["Messages", "Turn signals into useful conversations."],
  bookmarks: ["Bookmarks", "Your private shortlist of companies worth revisiting."],
  settings: ["Settings", "Control your profile and workspace identity."],
};

const INVESTORS = [
  {
    id: "northstar",
    name: "Northstar Ventures",
    focus: "Seed · B2B SaaS",
    cheque: "$250K–$1.5M",
    partner: "Maya Rao",
  },
  {
    id: "firstmile",
    name: "First Mile Capital",
    focus: "Pre-seed · Climate",
    cheque: "$100K–$750K",
    partner: "Arjun Mehta",
  },
  {
    id: "operator",
    name: "Operator Circle",
    focus: "Seed · Fintech",
    cheque: "$500K–$2M",
    partner: "Nora Feld",
  },
];

const EVENTS = [
  {
    id: "demo-day",
    day: "03",
    month: "SEP",
    name: "NEX Demo Day — Seed Cohort",
    location: "Bengaluru · The Foundry",
    time: "5:00 PM",
  },
  {
    id: "saas-ama",
    day: "08",
    month: "SEP",
    name: "Investor AMA: SaaS Metrics",
    location: "Online · Live room",
    time: "7:30 PM",
  },
  {
    id: "office-hours",
    day: "12",
    month: "SEP",
    name: "Founder Office Hours",
    location: "Mumbai · BKC",
    time: "11:00 AM",
  },
];

const THREADS = [
  {
    id: "maya",
    name: "Maya Rao",
    label: "Northstar Ventures",
    message: "Your retention curve stood out. Open to a quick conversation?",
  },
  {
    id: "ishan",
    name: "Ishan Shah",
    label: "Founder · Lattice",
    message: "Happy to make that product introduction.",
  },
  {
    id: "community",
    name: "NEX Community",
    label: "Ecosystem team",
    message: "You have been selected for the September founder circle.",
  },
];

export const Route = createFileRoute("/_authenticated/workspace/$section")({
  head: () => ({
    meta: [{ title: "Workspace — NEXVENTURE" }, { name: "robots", content: "noindex" }],
  }),
  component: WorkspacePage,
});

function WorkspacePage() {
  const { section } = Route.useParams();
  const activeSection = SECTION_META[section] ? section : "startup";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [workspace, setWorkspace] = useState(null);
  const [startups, setStartups] = useState([]);
  const [status, setStatus] = useState("loading");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setNotice("");
  }, [activeSection]);

  useEffect(() => {
    let active = true;
    setStatus("loading");
    Promise.all([fetchWorkspace(), fetchStartups()])
      .then(([workspaceResponse, startupResponse]) => {
        if (!active) return;
        setWorkspace(workspaceResponse.workspace);
        setStartups(startupResponse.startups);
        setStatus("ready");
      })
      .catch((error) => {
        if (!active) return;
        setNotice(error instanceof Error ? error.message : "Could not load this workspace.");
        setStatus("error");
      });
    return () => {
      active = false;
    };
  }, []);

  async function persist(field, value, successMessage) {
    setNotice("");
    try {
      const response = await patchWorkspace(field, value);
      setWorkspace(response.workspace);
      setNotice(successMessage);
      return response.workspace;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save that change.");
      throw error;
    }
  }

  const [title, description] = SECTION_META[activeSection];
  return (
    <div className="min-h-screen bg-background">
      <WorkspaceSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-64">
        <header className="glass sticky top-0 z-20 flex h-16 items-center border-b border-border/60 px-4 sm:px-7">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="mr-3 flex size-9 items-center justify-center rounded-xl border border-border lg:hidden"
            aria-label="Open navigation"
          >
            <FiMenu />
          </button>
          <div>
            <p className="font-display text-sm font-bold">{title}</p>
            <p className="hidden text-xs text-muted-foreground sm:block">{description}</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <NotificationBell />
            <span className="flex items-center gap-2 rounded-full bg-success/10 px-3 py-1 text-[11px] font-bold text-success">
              <span className="size-1.5 rounded-full bg-success" /> Mongo connected
            </span>
          </div>
        </header>

        <main className="mx-auto max-w-6xl p-4 sm:p-7">
          {notice ? (
            <button
              type="button"
              onClick={() => setNotice("")}
              className="mb-5 w-full rounded-xl border border-primary/20 bg-primary/7 px-4 py-3 text-left text-sm text-foreground"
            >
              {notice}
            </button>
          ) : null}
          {status === "loading" ? <WorkspaceSkeleton /> : null}
          {status === "error" ? (
            <EmptyState
              title="Workspace unavailable"
              body={notice || "Check the backend connection and try again."}
            />
          ) : null}
          {status === "ready" ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                {activeSection === "startup" ? (
                  <StartupSection workspace={workspace} persist={persist} />
                ) : null}
                {activeSection === "investors" ? (
                  <InvestorsSection workspace={workspace} persist={persist} />
                ) : null}
                {activeSection === "events" ? (
                  <EventsSection workspace={workspace} persist={persist} />
                ) : null}
                {activeSection === "messages" ? (
                  <MessagesSection workspace={workspace} persist={persist} />
                ) : null}
                {activeSection === "bookmarks" ? (
                  <BookmarksSection workspace={workspace} startups={startups} persist={persist} />
                ) : null}
                {activeSection === "settings" ? <SettingsSection /> : null}
              </motion.div>
            </AnimatePresence>
          ) : null}
        </main>
      </div>
    </div>
  );
}

function StartupSection({ workspace, persist }) {
  const [form, setForm] = useState({
    name: "",
    tagline: "",
    stage: "Pre-seed",
    website: "",
    ...workspace.startupProfile,
  });
  const [saving, setSaving] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await persist("startupProfile", form, "Startup profile saved to MongoDB.");
    } catch {
      /* notice is rendered above */
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <Panel eyebrow="Company signal" title="Make the first 30 seconds count">
        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field
            label="Company name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Your startup"
            required
          />
          <Field
            label="One-line pitch"
            value={form.tagline}
            onChange={(e) => setForm({ ...form, tagline: e.target.value })}
            placeholder="What you do, for whom, and why now"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Stage
              </span>
              <select
                value={form.stage}
                onChange={(e) => setForm({ ...form, stage: e.target.value })}
                className="mt-2 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
              >
                <option>Idea</option>
                <option>Pre-seed</option>
                <option>Seed</option>
                <option>Series A</option>
              </select>
            </label>
            <Field
              label="Website"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              placeholder="https://"
            />
          </div>
          <NexButton type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save company profile"}
          </NexButton>
        </form>
      </Panel>
      <Panel eyebrow="Live preview" title={form.name || "Your company"} dark>
        <p className="mt-5 min-h-16 text-sm leading-6 text-white/65">
          {form.tagline ||
            "Add a crisp one-line pitch so the right people understand the opportunity immediately."}
        </p>
        <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-white/10">
          <Metric label="Stage" value={form.stage} dark />
          <Metric label="Readiness" value={form.name && form.tagline ? "80%" : "35%"} dark />
        </div>
        <div className="mt-5 flex items-center gap-2 text-xs text-white/55">
          <FiArrowUpRight /> {form.website || "Website not added"}
        </div>
      </Panel>
    </div>
  );
}

function InvestorsSection({ workspace, persist }) {
  const connected = workspace.investorConnections || [];
  async function toggle(id) {
    const isAdding = !connected.includes(id);
    const next = isAdding ? [...connected, id] : connected.filter((item) => item !== id);
    const targetInvestor = INVESTORS.find((i) => i.id === id);

    try {
      if (isAdding) {
        await sendIntroRequest({
          type: "intro_request",
          message: `Introduction request sent to ${targetInvestor?.name || "investor"} (${targetInvestor?.focus || ""}).`,
        }).catch(() => {});
      }
      await persist(
        "investorConnections",
        next,
        isAdding ? "Introduction request sent to partner." : "Connection removed.",
      );
    } catch {
      /* notice above */
    }
  }
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {INVESTORS.map((investor, index) => (
        <motion.article
          key={investor.id}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]"
        >
          <span className="flex size-11 items-center justify-center rounded-2xl bg-foreground text-sm font-bold text-background">
            {investor.name
              .split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2)}
          </span>
          <p className="mt-5 text-lg font-bold">{investor.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">{investor.focus}</p>
          <div className="mt-6 space-y-2 border-y border-border py-4 text-xs">
            <p className="flex justify-between">
              <span className="text-muted-foreground">Typical cheque</span>
              <strong>{investor.cheque}</strong>
            </p>
            <p className="flex justify-between">
              <span className="text-muted-foreground">Partner</span>
              <strong>{investor.partner}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={() => toggle(investor.id)}
            className={cn(
              "mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold transition-colors",
              connected.includes(investor.id)
                ? "bg-success/10 text-success"
                : "bg-foreground text-background",
            )}
          >
            {connected.includes(investor.id) ? (
              <>
                <FiCheck /> Requested
              </>
            ) : (
              <>
                <FiTrendingUp /> Request intro
              </>
            )}
          </button>
        </motion.article>
      ))}
    </div>
  );
}

function EventsSection({ workspace, persist }) {
  const rsvps = workspace.eventRsvps || [];
  async function toggle(id) {
    const isRsvping = !rsvps.includes(id);
    const next = isRsvping ? [...rsvps, id] : rsvps.filter((item) => item !== id);
    const targetEvent = EVENTS.find((e) => e.id === id);

    try {
      await rsvpEvent(id, targetEvent?.name).catch(() => {});
      await persist(
        "eventRsvps",
        next,
        isRsvping ? "Your seat is confirmed! RSVP recorded." : "RSVP cancelled.",
      );
    } catch {
      /* notice above */
    }
  }
  return (
    <div className="space-y-3">
      {EVENTS.map((event) => (
        <article
          key={event.id}
          className="grid gap-4 rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:grid-cols-[72px_1fr_auto] sm:items-center"
        >
          <div className="rounded-2xl bg-secondary py-3 text-center">
            <p className="text-[10px] font-bold tracking-widest text-primary">{event.month}</p>
            <p className="font-display text-2xl font-bold">{event.day}</p>
          </div>
          <div>
            <h2 className="text-base font-bold">{event.name}</h2>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <FiMapPin />
                {event.location}
              </span>
              <span className="flex items-center gap-1.5">
                <FiClock />
                {event.time}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => toggle(event.id)}
            className={cn(
              "h-10 rounded-xl px-5 text-sm font-bold",
              rsvps.includes(event.id)
                ? "bg-success/10 text-success"
                : "bg-foreground text-background",
            )}
          >
            {rsvps.includes(event.id) ? "Going ✓" : "RSVP"}
          </button>
        </article>
      ))}
    </div>
  );
}

function MessagesSection({ workspace, persist }) {
  const [active, setActive] = useState(THREADS[0].id);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const thread = THREADS.find((item) => item.id === active);
  const sent = (workspace.messages || []).filter((item) => item.threadId === active);
  async function send(event) {
    event.preventDefault();
    if (!draft.trim()) return;
    setSending(true);
    try {
      await persist("message", { threadId: active, body: draft }, "Message sent and saved.");
      setDraft("");
    } catch {
      /* notice above */
    } finally {
      setSending(false);
    }
  }
  return (
    <div className="grid min-h-[620px] overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-soft)] md:grid-cols-[280px_1fr]">
      <aside className="border-b border-border bg-secondary/45 p-3 md:border-r md:border-b-0">
        <p className="px-3 py-2 text-xs font-bold tracking-wider text-muted-foreground uppercase">
          Conversations
        </p>
        {THREADS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActive(item.id)}
            className={cn(
              "mt-1 w-full rounded-2xl p-3 text-left",
              active === item.id ? "bg-card shadow-sm" : "hover:bg-card/60",
            )}
          >
            <p className="text-sm font-bold">{item.name}</p>
            <p className="text-[11px] text-muted-foreground">{item.label}</p>
          </button>
        ))}
      </aside>
      <section className="flex min-h-[500px] flex-col">
        <header className="border-b border-border p-5">
          <p className="font-bold">{thread.name}</p>
          <p className="text-xs text-muted-foreground">{thread.label}</p>
        </header>
        <div className="flex-1 space-y-4 overflow-auto p-5">
          <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-secondary p-3 text-sm leading-6">
            {thread.message}
          </div>
          {sent.map((message) => (
            <div
              key={message._id || message.sentAt}
              className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-primary p-3 text-sm leading-6 text-primary-foreground"
            >
              {message.body}
            </div>
          ))}
        </div>
        <form onSubmit={send} className="flex gap-2 border-t border-border p-4">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Message ${thread.name}`}
            className="h-11 flex-1 rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="flex size-11 items-center justify-center rounded-xl bg-foreground text-background disabled:opacity-40"
            aria-label="Send message"
          >
            <FiSend />
          </button>
        </form>
      </section>
    </div>
  );
}

function BookmarksSection({ workspace, startups, persist }) {
  const saved = workspace.bookmarkedStartupIds || [];
  const visible = useMemo(() => startups.slice(0, 8), [startups]);
  async function toggle(id) {
    const next = saved.includes(id) ? saved.filter((item) => item !== id) : [...saved, id];
    try {
      await persist(
        "bookmarkedStartupIds",
        next,
        saved.includes(id) ? "Removed from bookmarks." : "Startup bookmarked.",
      );
    } catch {
      /* notice above */
    }
  }
  return (
    <div>
      <div className="mb-5 flex items-end justify-between">
        <div>
          <p className="text-3xl font-semibold">{saved.length}</p>
          <p className="text-sm text-muted-foreground">companies on your shortlist</p>
        </div>
        <FiBookmark className="size-6 text-primary" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {visible.map((startup) => (
          <article key={startup.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-xs font-bold">
                {startup.initials}
              </span>
              <div className="min-w-0">
                <p className="font-bold">{startup.name}</p>
                <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {startup.description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggle(startup.id)}
                aria-label={`Toggle ${startup.name} bookmark`}
                className={cn(
                  "ml-auto flex size-9 shrink-0 items-center justify-center rounded-xl border",
                  saved.includes(startup.id)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border",
                )}
              >
                <FiBookmark />
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function SettingsSection() {
  const { user, completeOnboarding, isLoading } = useAuth();
  const [roles, setRoles] = useState(user.roles || [user.role]);
  const [headline, setHeadline] = useState(user.headline || "");
  const [location, setLocation] = useState(user.location || "");
  const [saved, setSaved] = useState(false);
  function toggle(role) {
    setSaved(false);
    setRoles((current) =>
      current.includes(role) ? current.filter((item) => item !== role) : [...current, role],
    );
  }
  async function submit(event) {
    event.preventDefault();
    if (!roles.length) return;
    await completeOnboarding({ roles, headline, location });
    setSaved(true);
  }
  return (
    <Panel eyebrow="Account identity" title="Shape your NEXVENTURE experience">
      <form onSubmit={submit} className="mt-6 max-w-2xl space-y-5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {USER_ROLE_VALUES.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => toggle(role)}
              className={cn(
                "rounded-xl border p-3 text-sm font-bold capitalize",
                roles.includes(role)
                  ? "border-primary bg-primary/8 text-primary"
                  : "border-border bg-card",
              )}
            >
              {roles.includes(role) ? "✓ " : ""}
              {USER_ROLE_LABELS[role]}
            </button>
          ))}
        </div>
        <Field
          label="Headline"
          value={headline}
          onChange={(e) => {
            setSaved(false);
            setHeadline(e.target.value);
          }}
        />
        <Field
          label="Location"
          value={location}
          onChange={(e) => {
            setSaved(false);
            setLocation(e.target.value);
          }}
        />
        <div className="flex items-center gap-3">
          <NexButton type="submit" disabled={isLoading || !roles.length}>
            {isLoading ? "Saving…" : "Save settings"}
          </NexButton>
          {saved ? (
            <span className="flex items-center gap-1 text-sm font-bold text-success">
              <FiCheck /> Saved to account
            </span>
          ) : null}
        </div>
      </form>
    </Panel>
  );
}

function Panel({ eyebrow, title, dark = false, children }) {
  return (
    <section
      className={cn(
        "rounded-3xl border p-5 sm:p-7",
        dark
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-card shadow-[var(--shadow-soft)]",
      )}
    >
      <p
        className={cn(
          "text-[10px] font-bold tracking-[0.18em] uppercase",
          dark ? "text-white/45" : "text-primary",
        )}
      >
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}
function Metric({ label, value, dark }) {
  return (
    <div className={cn("p-4", dark ? "bg-white/[0.06]" : "bg-secondary")}>
      <p
        className={cn(
          "text-[10px] font-bold uppercase",
          dark ? "text-white/40" : "text-muted-foreground",
        )}
      >
        {label}
      </p>
      <p className="mt-1 text-sm font-bold">{value}</p>
    </div>
  );
}
function WorkspaceSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="h-72 animate-pulse rounded-3xl bg-card" />
      <div className="h-72 animate-pulse rounded-3xl bg-card" />
    </div>
  );
}
function EmptyState({ title, body }) {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-card p-16 text-center">
      <FiMessageSquare className="mx-auto size-7 text-muted-foreground" />
      <h2 className="mt-4 text-xl font-bold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
