import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  FiActivity,
  FiArchive,
  FiArrowUpRight,
  FiBookmark,
  FiCheck,
  FiClock,
  FiDollarSign,
  FiExternalLink,
  FiEye,
  FiFileText,
  FiHeart,
  FiMapPin,
  FiMenu,
  FiMessageSquare,
  FiPaperclip,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiSend,
  FiTrash2,
  FiUserCheck,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { NotificationBell } from "@/components/nex/NotificationBell";
import { WorkspaceSidebar } from "@/components/nex/WorkspaceSidebar";
import { Field } from "@/components/nex/AuthShell";
import { NexButton } from "@/components/nex/primitives";
import { INDUSTRIES, STAGES } from "@/data/companies";
import {
  applyToOpportunity,
  createConversation,
  createOpportunity,
  createPitch,
  expressInvestmentInterest,
  fetchApplications,
  fetchConversationMessages,
  fetchConversationAttachmentBlob,
  fetchConversations,
  fetchInvestmentDealRooms,
  fetchInvestmentInterests,
  fetchMentors,
  fetchMentorshipRequests,
  fetchMentorshipWorkspaces,
  fetchOpportunities,
  fetchPitches,
  fetchUsers,
  requestMentorship,
  requestStartupMentorship,
  sendConversationMessage,
  updateApplication,
  updateInvestmentDealRoom,
  updateInvestmentInterest,
  updateMentorshipRequest,
  updateMentorshipWorkspace,
  updateOpportunity,
  updatePitch,
} from "@/lib/api/ecosystemClient";
import { createMessageSocket } from "@/lib/api/messageSocketClient";
import {
  addStartupMember,
  fetchMyStartup,
  fetchStartupMembers,
  fetchStartups,
  publishStartup,
  removeStartupMember,
} from "@/lib/api/startupClient";
import { fetchWorkspace, fetchWorkspaceStats, patchWorkspace } from "@/lib/api/workspaceClient";
import { rsvpEvent, sendIntroRequest } from "@/lib/api/notificationClient";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { USER_ROLE_LABELS, USER_ROLE_VALUES } from "@/utils/enums";

const SECTION_META = {
  startup: ["My Startup", "Keep your company signal sharp and investor-ready."],
  pitch: ["Pitch", "Package the problem, solution, market, traction, and funding ask."],
  investors: ["Investors", "Build warm, thesis-aligned relationships."],
  mentors: ["Mentors", "Find operating advisors and manage mentorship requests."],
  opportunities: ["Opportunities", "Create startup roles and manage applicants."],
  applications: ["Applications", "Track startup projects where you offered to help."],
  analytics: ["Analytics", "Track startup, pitch, investor, mentor, hiring, and team signals."],
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
    preference: "Product-led SaaS with retention proof",
  },
  {
    id: "firstmile",
    name: "First Mile Capital",
    focus: "Pre-seed · Climate",
    cheque: "$100K–$750K",
    partner: "Arjun Mehta",
    preference: "Climate infrastructure and applied AI",
  },
  {
    id: "operator",
    name: "Operator Circle",
    focus: "Seed · Fintech",
    cheque: "$500K–$2M",
    partner: "Nora Feld",
    preference: "Regulated fintech with founder-market fit",
  },
];

const OPPORTUNITY_TYPES = [
  ["project", "Project"],
  ["internship", "Internship"],
  ["freelance", "Freelance"],
  ["part_time", "Part-time"],
  ["full_time", "Full-time"],
];

const COMPENSATION_TYPES = [
  ["paid", "Paid"],
  ["equity", "Equity"],
  ["negotiable", "Negotiable"],
  ["unpaid", "Unpaid"],
];

const MENTORSHIP_FOCUS_AREAS = [
  "Business strategy",
  "Product/PMF",
  "Fundraising and pitch preparation",
  "Marketing/growth",
  "Technology",
  "Sales",
  "Hiring",
  "Networking",
  "Industry expertise",
  "Problem solving and accountability",
];

const MENTORSHIP_WORKSPACE_STATUS_OPTIONS = [
  ["active", "Active"],
  ["in_progress", "In Progress"],
  ["on_track", "On Track"],
  ["at_risk", "At Risk"],
  ["completed", "Completed"],
];

const INVESTMENT_DEAL_STATUS_OPTIONS = [
  ["accepted", "Accepted"],
  ["discussion", "Discussion"],
  ["due_diligence", "Due Diligence"],
  ["negotiation", "Negotiation"],
  ["terms_agreed", "Terms Agreed"],
  ["completed", "Completed"],
];

const PIPELINE_STATUS_LABELS = {
  pending: "Pending",
  founder_review: "Ignored",
  accepted: "Accepted",
  discussion: "Discussion",
  due_diligence: "Due Diligence",
  negotiation: "Negotiation",
  terms_agreed: "Terms Agreed",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  shortlisted: "Shortlisted",
  completed: "Completed",
  cancelled: "Cancelled",
  active: "Active",
  in_progress: "In Progress",
  on_track: "On Track",
  at_risk: "At Risk",
  todo: "To Do",
  open: "Open",
  closed: "Closed",
  draft: "Draft",
  published: "Published",
  archived: "Archived",
  founder: "Founder",
  cofounder: "Co-founder",
  employee: "Employee",
  contributor: "Contributor",
  project: "Project",
  internship: "Internship",
  freelance: "Freelance",
  part_time: "Part-time",
  full_time: "Full-time",
};

const ACTIVE_INVESTMENT_STATUSES = new Set(["pending", "accepted", "founder_review"]);
const INVESTMENT_INTEREST_STATUS_WEIGHT = {
  accepted: 4,
  pending: 3,
  founder_review: 2,
  rejected: 1,
  withdrawn: 0,
};
const MESSAGE_ATTACHMENT_ACCEPT = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".txt",
  ".csv",
  ".rtf",
  ".odt",
  ".ods",
  ".odp",
].join(",");

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

export const Route = createFileRoute("/_authenticated/workspace/$section")({
  head: () => ({
    meta: [{ title: "Workspace — NEXVENTURE" }, { name: "robots", content: "noindex" }],
  }),
  component: WorkspacePage,
});

function WorkspacePage() {
  const { user } = useAuth();
  const { section } = Route.useParams();
  const navigate = useNavigate();
  const activeRole = user?.activeRole || user?.role || "founder";
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

  async function openConversation(
    targetUserId,
    type = "direct",
    relatedStartupId = null,
    conversationId = null,
    options = {},
  ) {
    if (
      !targetUserId &&
      !conversationId &&
      !options.investmentInterestId &&
      !options.mentorshipRequestId
    ) {
      setNotice("This profile is not connected to a user account yet.");
      return null;
    }

    try {
      const payload = {
        ...options,
        targetUserId,
        type,
        relatedStartupId,
        conversationId,
      };
      const response = await createConversation(payload);
      const openedConversationId = response.data?._id || conversationId;
      if (openedConversationId) {
        sessionStorage.setItem("nexventure.activeConversationId", openedConversationId);
      }
      setNotice("Conversation opened in Messages.");
      navigate({ to: "/workspace/messages" });
      return response.data;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not open that conversation.");
      return null;
    }
  }

  const [title, description] = getSectionMeta(activeSection, activeRole);
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
                {activeSection === "startup" ? <StartupSection /> : null}
                {activeSection === "pitch" ? <PitchSection /> : null}
                {activeSection === "investors" ? (
                  activeRole === "student" ? (
                    <StudentOpportunitiesSection
                      initialView="open"
                      onOpenConversation={openConversation}
                    />
                  ) : activeRole === "investor" ? (
                    <InvestorDealFlowSection onOpenConversation={openConversation} />
                  ) : (
                    <InvestorsSection
                      workspace={workspace}
                      persist={persist}
                      onOpenConversation={openConversation}
                    />
                  )
                ) : null}
                {activeSection === "mentors" ? (
                  activeRole === "mentor" ? (
                    <MentorRequestsSection onOpenConversation={openConversation} />
                  ) : (
                    <MentorsSection onOpenConversation={openConversation} />
                  )
                ) : null}
                {activeSection === "opportunities" || activeSection === "applications" ? (
                  activeRole === "student" ? (
                    <StudentOpportunitiesSection
                      initialView={activeSection === "applications" ? "applications" : "open"}
                      onOpenConversation={openConversation}
                    />
                  ) : (
                    <OpportunitiesSection onOpenConversation={openConversation} />
                  )
                ) : null}
                {activeSection === "analytics" ? <AnalyticsSection /> : null}
                {activeSection === "events" ? (
                  <EventsSection workspace={workspace} persist={persist} />
                ) : null}
                {activeSection === "messages" ? <MessagesSection /> : null}
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

const STARTUP_FORM_DEFAULTS = {
  name: "",
  tagline: "",
  description: "",
  industry: INDUSTRIES[0] || "",
  categoriesText: "",
  stage: "Pre-seed",
  location: "",
  founded: new Date().getFullYear(),
  funding: "",
  fundingRaised: "",
  fundingGoal: "",
  team: 1,
  teamSize: 1,
  hiring: false,
  website: "",
  linkedinUrl: "",
  twitterUrl: "",
  traction: "",
  revenue: "",
  businessModel: "",
  targetMarket: "",
  isPublic: true,
};

function getSectionMeta(section, role) {
  if (section === "investors" && role === "investor") {
    return ["Deal Flow", "Discover startups and manage investment outreach."];
  }
  if (section === "investors" && role === "student") {
    return ["Opportunities", "Find startup projects and track founder responses."];
  }
  if (section === "mentors" && role === "mentor") {
    return ["Mentorship Requests", "Review founder requests and start accepted mentorships."];
  }
  return SECTION_META[section];
}

function hasRole(user, role) {
  return user?.role === role || user?.activeRole === role || user?.roles?.includes(role);
}

function getStartupId(startup) {
  if (typeof startup === "string") return startup;
  return startup?._id || startup?.id || startup?.slug || "";
}

function getUserId(user) {
  if (typeof user === "string") return user;
  return user?._id || user?.id || "";
}

function getEntityId(entity) {
  if (typeof entity === "string") return entity;
  return entity?._id || entity?.id || "";
}

function splitList(value) {
  if (Array.isArray(value))
    return value
      .map(String)
      .map((item) => item.trim())
      .filter(Boolean);
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinList(value) {
  return Array.isArray(value) ? value.join(", ") : String(value || "");
}

function normalizeStartupForm(startup) {
  const next = { ...STARTUP_FORM_DEFAULTS, ...startup };
  next.categoriesText = joinList(startup?.categories);
  next.funding = startup?.funding || startup?.fundingRaised || STARTUP_FORM_DEFAULTS.funding;
  next.fundingRaised = startup?.fundingRaised || startup?.funding || "";
  next.team = startup?.team || startup?.teamSize || STARTUP_FORM_DEFAULTS.team;
  next.teamSize = startup?.teamSize || startup?.team || STARTUP_FORM_DEFAULTS.teamSize;
  next.founded = startup?.founded || startup?.foundedYear || STARTUP_FORM_DEFAULTS.founded;
  next.isPublic = startup?.isPublic !== false;
  return next;
}

function toStartupPayload(form) {
  const founded = Number(form.founded) || new Date().getFullYear();
  const team = Number(form.team) || 1;
  const fundingRaised = form.fundingRaised || form.funding;
  return {
    ...form,
    categories: splitList(form.categoriesText),
    founded,
    foundedYear: founded,
    funding: fundingRaised,
    fundingRaised,
    team,
    teamSize: team,
    isPublic: Boolean(form.isPublic),
  };
}

function normalizeStatus(status) {
  return PIPELINE_STATUS_LABELS[status] || status || "Unknown";
}

function isInvestmentRequestLocked(status) {
  return ACTIVE_INVESTMENT_STATUSES.has(status);
}

function pickInvestmentInterest(current, next) {
  if (!current) return next;
  const currentWeight = INVESTMENT_INTEREST_STATUS_WEIGHT[current.status] ?? -1;
  const nextWeight = INVESTMENT_INTEREST_STATUS_WEIGHT[next.status] ?? -1;
  if (nextWeight !== currentWeight) return nextWeight > currentWeight ? next : current;
  const currentTime = new Date(current.updatedAt || current.createdAt || 0).getTime();
  const nextTime = new Date(next.updatedAt || next.createdAt || 0).getTime();
  return nextTime > currentTime ? next : current;
}

function investmentInterestActionLabel(status) {
  if (status === "accepted") return "Accepted";
  if (status === "pending") return "Interest sent";
  if (status === "founder_review") return "Ignored";
  if (status === "rejected" || status === "withdrawn") return "Express again";
  return "Express interest";
}

function getInterestDealRoom(interest, dealRoom = null) {
  return dealRoom || interest?.dealRoom || null;
}

function getInvestmentConversationId(interest, dealRoom = null) {
  return (
    getEntityId(dealRoom?._id) ||
    getEntityId(interest?.dealRoom?._id) ||
    getEntityId(interest?.dealRoomId) ||
    getEntityId(interest?.conversationId)
  );
}

function isImageType(type) {
  return String(type || "").startsWith("image/");
}

function formatFileType(type, name = "") {
  const extension = String(name).split(".").pop();
  if (extension && extension !== name) return extension.toUpperCase();
  return String(type || "file")
    .split("/")
    .pop()
    .toUpperCase();
}

function formatFileSize(size = 0) {
  const value = Number(size) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function investmentParticipantLine(investor, startup) {
  const role = personRoleLabel(
    investor?.activeRole || investor?.role || investor?.roles?.[0] || "investor",
  );
  return startup?.name ? `${role} • ${startup.name}` : role;
}

function formatDate(value) {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function toDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

function StartupSection() {
  const { user } = useAuth();
  const canPublish = hasRole(user, "founder");
  const [form, setForm] = useState(STARTUP_FORM_DEFAULTS);
  const [status, setStatus] = useState("loading");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [publishedAt, setPublishedAt] = useState(null);

  useEffect(() => {
    let active = true;
    fetchMyStartup()
      .then((res) => {
        if (!active) return;
        if (res.startup) {
          setForm(normalizeStartupForm(res.startup));
          setPublishedAt(res.startup.isPublic === false ? null : res.startup.updatedAt || true);
        }
      })
      .catch(() => {
        /* no listing yet — form stays empty, that's fine */
      })
      .finally(() => {
        if (active) setStatus("ready");
      });
    return () => {
      active = false;
    };
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (!canPublish) return;
    setSaving(true);
    setNotice("");
    try {
      const res = await publishStartup(toStartupPayload(form));
      setForm(normalizeStartupForm(res.startup));
      setPublishedAt(res.startup.isPublic === false ? null : res.startup.updatedAt);
      setNotice(
        res.startup?.isPublic === false
          ? "Your startup profile was saved as unpublished."
          : res.message || "Your startup profile was saved.",
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not publish your startup.");
    } finally {
      setSaving(false);
    }
  }

  const handleTeamChanged = useCallback((count) => {
    setForm((current) => ({
      ...current,
      team: Math.max(Number(current.team) || 1, count),
      teamSize: Math.max(Number(current.teamSize) || 1, count),
    }));
  }, []);

  if (status === "loading") return <WorkspaceSkeleton />;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <Panel eyebrow="Company signal" title="Make the first 30 seconds count">
        {!canPublish ? (
          <p className="mt-4 rounded-xl border border-border/70 bg-secondary/50 p-3 text-sm text-muted-foreground">
            Only founder accounts can publish and manage a startup listing. Add Founder in Settings
            to unlock this workspace.
          </p>
        ) : null}
        {notice ? (
          <p className="mt-4 rounded-xl border border-primary/20 bg-primary/7 p-3 text-sm">
            {notice}
          </p>
        ) : null}
        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field
            label="Company name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Your startup"
            required
            disabled={!canPublish}
          />
          <Field
            label="Short tagline"
            value={form.tagline}
            onChange={(e) => setForm({ ...form, tagline: e.target.value })}
            placeholder="The fastest way to understand your company"
            disabled={!canPublish}
          />
          <Field
            label="One-line pitch"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="What you do, for whom, and why now"
            required
            disabled={!canPublish}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Industry
              </span>
              <select
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
                disabled={!canPublish}
                className="mt-2 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary disabled:opacity-60"
              >
                {INDUSTRIES.map((industry) => (
                  <option key={industry}>{industry}</option>
                ))}
              </select>
            </label>
            <Field
              label="Categories"
              value={form.categoriesText}
              onChange={(e) => setForm({ ...form, categoriesText: e.target.value })}
              placeholder="AI, SaaS, Developer Tools"
              disabled={!canPublish}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Stage
              </span>
              <select
                value={form.stage}
                onChange={(e) => setForm({ ...form, stage: e.target.value })}
                disabled={!canPublish}
                className="mt-2 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary disabled:opacity-60"
              >
                {STAGES.map((stage) => (
                  <option key={stage}>{stage}</option>
                ))}
              </select>
            </label>
            <Field
              label="Business model"
              value={form.businessModel}
              onChange={(e) => setForm({ ...form, businessModel: e.target.value })}
              placeholder="B2B SaaS, marketplace, API usage"
              disabled={!canPublish}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Location"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Bengaluru, India"
              required
              disabled={!canPublish}
            />
            <Field
              label="Founded (year)"
              type="number"
              value={form.founded}
              onChange={(e) => setForm({ ...form, founded: e.target.value })}
              disabled={!canPublish}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Funding raised"
              value={form.fundingRaised}
              onChange={(e) => setForm({ ...form, fundingRaised: e.target.value })}
              placeholder="$500K or Bootstrapped"
              required
              disabled={!canPublish}
            />
            <Field
              label="Funding requirement"
              value={form.fundingGoal}
              onChange={(e) => setForm({ ...form, fundingGoal: e.target.value })}
              placeholder="$1.5M seed round"
              disabled={!canPublish}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Team size"
              type="number"
              value={form.team}
              onChange={(e) => setForm({ ...form, team: e.target.value })}
              disabled={!canPublish}
            />
            <Field
              label="Revenue"
              value={form.revenue}
              onChange={(e) => setForm({ ...form, revenue: e.target.value })}
              placeholder="$25K MRR or Pre-revenue"
              disabled={!canPublish}
            />
          </div>
          <Field
            label="Website"
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
            placeholder="https://"
            disabled={!canPublish}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="LinkedIn"
              value={form.linkedinUrl}
              onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })}
              placeholder="https://linkedin.com/company/..."
              disabled={!canPublish}
            />
            <Field
              label="X / Twitter"
              value={form.twitterUrl}
              onChange={(e) => setForm({ ...form, twitterUrl: e.target.value })}
              placeholder="https://x.com/..."
              disabled={!canPublish}
            />
          </div>
          <TextArea
            label="Traction"
            value={form.traction}
            onChange={(e) => setForm({ ...form, traction: e.target.value })}
            placeholder="Users, growth, revenue, pilots, partnerships, or proof points"
            disabled={!canPublish}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2.5 text-sm font-medium">
              <input
                type="checkbox"
                checked={form.hiring}
                onChange={(e) => setForm({ ...form, hiring: e.target.checked })}
                disabled={!canPublish}
                className="size-4 rounded border-border"
              />
              We&apos;re actively hiring
            </label>
            <label className="flex items-center gap-2.5 text-sm font-medium">
              <input
                type="checkbox"
                checked={form.isPublic}
                onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
                disabled={!canPublish}
                className="size-4 rounded border-border"
              />
              Public startup profile
            </label>
          </div>
          <NexButton type="submit" disabled={saving || !canPublish}>
            {saving
              ? "Saving…"
              : form.isPublic
                ? publishedAt
                  ? "Update public listing"
                  : "Publish to directory"
                : "Save unpublished profile"}
          </NexButton>
          {publishedAt ? (
            <p className="text-xs text-muted-foreground">
              Live in the public Startup Directory — visible to every investor, mentor, and new
              member who signs up.
            </p>
          ) : getStartupId(form) ? (
            <p className="text-xs text-muted-foreground">
              Saved as unpublished. Turn on public startup profile when you are ready to be
              discovered.
            </p>
          ) : null}
        </form>
      </Panel>
      <div className="space-y-6">
        <Panel eyebrow="Live preview" title={form.name || "Your company"} dark>
          <p className="mt-5 min-h-16 text-sm leading-6 text-white/65">
            {form.description ||
              "Add a crisp one-line pitch so the right people understand the opportunity immediately."}
          </p>
          <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-white/10">
            <Metric label="Stage" value={form.stage} dark />
            <Metric label="Funding ask" value={form.fundingGoal || "Not set"} dark />
            <Metric label="Revenue" value={form.revenue || "Not set"} dark />
            <Metric label="Visibility" value={form.isPublic ? "Public" : "Unpublished"} dark />
          </div>
          <div className="mt-5 flex items-center gap-2 text-xs text-white/55">
            <FiArrowUpRight /> {form.website || "Website not added"}
          </div>
        </Panel>
        <StartupMembersManager
          startupId={getStartupId(form)}
          disabled={!canPublish}
          onTeamChanged={handleTeamChanged}
        />
      </div>
    </div>
  );
}

function StartupMembersManager({ startupId, disabled, onTeamChanged }) {
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({ email: "", role: "cofounder", title: "" });
  const [status, setStatus] = useState(startupId ? "loading" : "idle");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!startupId) {
      setMembers([]);
      setStatus("idle");
      return undefined;
    }

    let active = true;
    setStatus("loading");
    fetchStartupMembers(startupId)
      .then((res) => {
        if (!active) return;
        const nextMembers = res.members || res.data || [];
        setMembers(nextMembers);
        onTeamChanged?.(nextMembers.length);
        setStatus("ready");
      })
      .catch((error) => {
        if (!active) return;
        setNotice(error instanceof Error ? error.message : "Could not load startup members.");
        setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [startupId, onTeamChanged]);

  async function addMember(event) {
    event.preventDefault();
    if (!startupId || disabled || !form.email.trim()) return;
    setNotice("");
    try {
      const res = await addStartupMember(startupId, form);
      const nextMembers = upsertById(members, res.member || res.data);
      setMembers(nextMembers);
      onTeamChanged?.(nextMembers.length);
      setForm({ email: "", role: "cofounder", title: "" });
      setNotice("Team member added.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not add that team member.");
    }
  }

  async function removeMember(memberId) {
    if (!startupId || disabled) return;
    setNotice("");
    try {
      await removeStartupMember(startupId, memberId);
      const nextMembers = members.filter((member) => member._id !== memberId);
      setMembers(nextMembers);
      onTeamChanged?.(nextMembers.length);
      setNotice("Team member removed.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not remove that team member.");
    }
  }

  return (
    <Panel eyebrow="Team" title="Co-founders and members">
      {!startupId ? (
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Save your startup profile before inviting co-founders or team members.
        </p>
      ) : null}
      {notice ? (
        <button
          type="button"
          onClick={() => setNotice("")}
          className="mt-4 w-full rounded-xl border border-primary/20 bg-primary/7 p-3 text-left text-sm"
        >
          {notice}
        </button>
      ) : null}
      <form onSubmit={addMember} className="mt-5 space-y-3">
        <Field
          label="Member email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="teammate@example.com"
          disabled={!startupId || disabled}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectControl
            label="Member role"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            disabled={!startupId || disabled}
          >
            <option value="cofounder">Co-founder</option>
            <option value="employee">Employee</option>
            <option value="contributor">Contributor</option>
          </SelectControl>
          <Field
            label="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="CTO, Growth, Advisor"
            disabled={!startupId || disabled}
          />
        </div>
        <NexButton type="submit" size="sm" disabled={!startupId || disabled || !form.email.trim()}>
          <FiPlus /> Add member
        </NexButton>
      </form>
      <div className="mt-5 space-y-2">
        {status === "loading" ? (
          <p className="text-sm text-muted-foreground">Loading team...</p>
        ) : null}
        {members.map((member) => {
          const person = member.userId || {};
          return (
            <div
              key={member._id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-secondary/40 p-3"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-card text-xs font-bold">
                {initialsFor(person.name || person.email || "NV")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{person.name || person.email}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {member.title || normalizeStatus(member.role)} · {normalizeStatus(member.role)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeMember(member._id)}
                disabled={disabled}
                className="flex size-9 items-center justify-center rounded-xl border border-border text-muted-foreground hover:text-destructive disabled:opacity-40"
                aria-label={`Remove ${person.name || person.email}`}
              >
                <FiX />
              </button>
            </div>
          );
        })}
        {status === "ready" && members.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            Add co-founders, employees, contributors, and advisors as they join.
          </p>
        ) : null}
      </div>
    </Panel>
  );
}

const PITCH_FORM_DEFAULTS = {
  title: "",
  elevatorPitch: "",
  pitchDeckUrl: "",
  demoUrl: "",
  problem: "",
  solution: "",
  market: "",
  businessModel: "",
  traction: "",
  fundingAsk: "",
  valuation: "",
  status: "draft",
};

function normalizePitchForm(pitch) {
  return { ...PITCH_FORM_DEFAULTS, ...pitch };
}

function PitchSection() {
  const [startup, setStartup] = useState(null);
  const [pitches, setPitches] = useState([]);
  const [selectedPitchId, setSelectedPitchId] = useState("");
  const [form, setForm] = useState(PITCH_FORM_DEFAULTS);
  const [status, setStatus] = useState("loading");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const startupId = getStartupId(startup);
  const selectedPitch = pitches.find((pitch) => pitch._id === selectedPitchId);
  const readinessFields = [
    form.title,
    form.elevatorPitch,
    form.problem,
    form.solution,
    form.market,
    form.businessModel,
    form.traction,
    form.fundingAsk,
    form.pitchDeckUrl,
  ];
  const readiness = Math.round(
    (readinessFields.filter(Boolean).length / readinessFields.length) * 100,
  );

  const loadPitchWorkspace = useCallback(async () => {
    setStatus("loading");
    setNotice("");
    try {
      const startupResponse = await fetchMyStartup();
      const nextStartup = startupResponse.startup || startupResponse.data || null;
      setStartup(nextStartup);

      if (!nextStartup) {
        setPitches([]);
        setSelectedPitchId("");
        setForm(PITCH_FORM_DEFAULTS);
        setStatus("ready");
        return;
      }

      const pitchResponse = await fetchPitches({
        startupId: getStartupId(nextStartup),
        status: "",
        limit: 50,
      });
      const nextPitches = pitchResponse.data || [];
      setPitches(nextPitches);
      const activePitch =
        nextPitches.find((pitch) => pitch.status === "published") || nextPitches[0] || null;
      setSelectedPitchId(activePitch?._id || "");
      setForm(activePitch ? normalizePitchForm(activePitch) : PITCH_FORM_DEFAULTS);
      setStatus("ready");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not load pitches.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    loadPitchWorkspace();
  }, [loadPitchWorkspace]);

  function selectPitch(pitch) {
    setSelectedPitchId(pitch._id);
    setForm(normalizePitchForm(pitch));
    setNotice("");
  }

  function startNewPitch() {
    setSelectedPitchId("");
    setForm(PITCH_FORM_DEFAULTS);
    setNotice("");
  }

  async function savePitch(nextStatus) {
    if (!startupId || !form.title.trim() || !form.elevatorPitch.trim()) return;
    setSaving(true);
    setNotice("");
    const payload = { ...form, status: nextStatus };
    try {
      const response = selectedPitchId
        ? await updatePitch(selectedPitchId, payload)
        : await createPitch(startupId, payload);
      const savedPitch = response.data;
      const currentPitches =
        nextStatus === "published"
          ? pitches.map((pitch) =>
              pitch._id !== savedPitch._id && pitch.status === "published"
                ? { ...pitch, status: "archived" }
                : pitch,
            )
          : pitches;
      const nextPitches = upsertById(currentPitches, savedPitch);
      setPitches(nextPitches);
      setSelectedPitchId(savedPitch._id);
      setForm(normalizePitchForm(savedPitch));
      setNotice(nextStatus === "published" ? "Pitch published." : "Pitch saved as draft.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save this pitch.");
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading") return <WorkspaceSkeleton />;
  if (!startupId) {
    return (
      <EmptyState
        title="Create your startup first"
        body="Your pitch needs a startup profile before it can be drafted or published."
      />
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
      <Panel eyebrow="Pitch library" title="Drafts and published pitches">
        <div className="mt-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-3xl font-semibold">{pitches.length}</p>
            <p className="text-sm text-muted-foreground">pitch versions</p>
          </div>
          <NexButton type="button" size="sm" onClick={startNewPitch}>
            <FiPlus /> New pitch
          </NexButton>
        </div>
        <div className="mt-5 space-y-2">
          {pitches.map((pitch) => (
            <button
              key={pitch._id}
              type="button"
              onClick={() => selectPitch(pitch)}
              className={cn(
                "w-full rounded-2xl border p-3 text-left transition-colors",
                selectedPitchId === pitch._id
                  ? "border-primary bg-primary/8"
                  : "border-border bg-secondary/40 hover:bg-secondary",
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="line-clamp-1 text-sm font-bold">{pitch.title}</span>
                <StatusPill status={pitch.status} />
              </span>
              <span className="mt-2 flex gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <FiEye /> {pitch.views || 0}
                </span>
                <span className="flex items-center gap-1">
                  <FiHeart /> {pitch.likesCount || 0}
                </span>
              </span>
            </button>
          ))}
          {pitches.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              Create your first pitch and publish it when the story is investor-ready.
            </p>
          ) : null}
        </div>
      </Panel>

      <Panel eyebrow="Pitch builder" title={selectedPitchId ? "Edit pitch" : "Create pitch"}>
        {notice ? (
          <button
            type="button"
            onClick={() => setNotice("")}
            className="mt-4 w-full rounded-xl border border-primary/20 bg-primary/7 p-3 text-left text-sm"
          >
            {notice}
          </button>
        ) : null}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Metric label="Readiness" value={`${readiness}%`} />
          <Metric label="Views" value={selectedPitch?.views || 0} />
          <Metric label="Likes" value={selectedPitch?.likesCount || 0} />
        </div>
        <div className="mt-6 space-y-4">
          <Field
            label="Pitch title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder={`${startup.name || "Startup"} seed pitch`}
            required
          />
          <TextArea
            label="Elevator pitch"
            value={form.elevatorPitch}
            onChange={(e) => setForm({ ...form, elevatorPitch: e.target.value })}
            placeholder="A concise version of what you do, who needs it, and why now"
            required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Pitch deck URL"
              value={form.pitchDeckUrl}
              onChange={(e) => setForm({ ...form, pitchDeckUrl: e.target.value })}
              placeholder="https://..."
            />
            <Field
              label="Demo or video URL"
              value={form.demoUrl}
              onChange={(e) => setForm({ ...form, demoUrl: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextArea
              label="Problem"
              value={form.problem}
              onChange={(e) => setForm({ ...form, problem: e.target.value })}
              placeholder="The urgent customer pain"
            />
            <TextArea
              label="Solution"
              value={form.solution}
              onChange={(e) => setForm({ ...form, solution: e.target.value })}
              placeholder="How your product solves it"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextArea
              label="Market"
              value={form.market}
              onChange={(e) => setForm({ ...form, market: e.target.value })}
              placeholder="Segment, buyer, size, wedge"
            />
            <TextArea
              label="Business model"
              value={form.businessModel}
              onChange={(e) => setForm({ ...form, businessModel: e.target.value })}
              placeholder="Pricing, margins, expansion path"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextArea
              label="Traction"
              value={form.traction}
              onChange={(e) => setForm({ ...form, traction: e.target.value })}
              placeholder="Revenue, customers, pilots, usage, growth"
            />
            <div className="space-y-4">
              <Field
                label="Funding requirement"
                value={form.fundingAsk}
                onChange={(e) => setForm({ ...form, fundingAsk: e.target.value })}
                placeholder="$1.5M seed"
              />
              <Field
                label="Valuation"
                value={form.valuation}
                onChange={(e) => setForm({ ...form, valuation: e.target.value })}
                placeholder="$10M post-money"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <NexButton
              type="button"
              variant="ghost"
              onClick={() => savePitch("draft")}
              disabled={saving || !form.title.trim() || !form.elevatorPitch.trim()}
            >
              <FiArchive /> Save draft
            </NexButton>
            <NexButton
              type="button"
              onClick={() => savePitch("published")}
              disabled={saving || !form.title.trim() || !form.elevatorPitch.trim()}
            >
              <FiFileText /> Publish pitch
            </NexButton>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function InvestorDealFlowSection({ onOpenConversation }) {
  const { user } = useAuth();
  const [startups, setStartups] = useState([]);
  const [interests, setInterests] = useState([]);
  const [dealRooms, setDealRooms] = useState([]);
  const [selectedStartupId, setSelectedStartupId] = useState("");
  const [amountRange, setAmountRange] = useState("$100,000 - $250,000");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("loading");
  const [notice, setNotice] = useState("");
  const currentUserId = getUserId(user);

  useEffect(() => {
    let active = true;
    async function load() {
      setStatus("loading");
      setNotice("");
      try {
        const [startupResponse, interestResponse, dealRoomResponse] = await Promise.all([
          fetchStartups(),
          fetchInvestmentInterests({ asInvestor: true, limit: 50 }).catch(() => ({ data: [] })),
          fetchInvestmentDealRooms({ limit: 50 }).catch(() => ({ data: [] })),
        ]);
        if (!active) return;
        const visibleStartups = (startupResponse.startups || startupResponse.data || []).filter(
          (startup) => !isOwnStartup(startup, currentUserId),
        );
        setStartups(visibleStartups);
        setInterests(interestResponse.data || []);
        setDealRooms(dealRoomResponse.data || []);
        setSelectedStartupId(visibleStartups[0] ? getStartupId(visibleStartups[0]) : "");
        setStatus("ready");
      } catch (error) {
        if (!active) return;
        setNotice(error instanceof Error ? error.message : "Could not load deal flow.");
        setStatus("error");
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [currentUserId]);

  const interestByStartupId = useMemo(() => {
    const map = new Map();
    interests.forEach((interest) => {
      const startupId = getStartupId(interest.startupId);
      if (!startupId) return;
      map.set(startupId, pickInvestmentInterest(map.get(startupId), interest));
    });
    return map;
  }, [interests]);

  const dealRoomByStartupId = useMemo(() => {
    const map = new Map();
    dealRooms.forEach((dealRoom) => {
      const startupId = getStartupId(dealRoom.relatedStartupId);
      if (startupId) map.set(startupId, dealRoom);
    });
    interests.forEach((interest) => {
      const startupId = getStartupId(interest.startupId);
      if (startupId && interest.dealRoom) map.set(startupId, interest.dealRoom);
    });
    return map;
  }, [dealRooms, interests]);

  const visibleStartups = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return startups;
    return startups.filter((startup) =>
      [
        startup.name,
        startup.description,
        startup.industry,
        startup.stage,
        startup.location,
        startup.founder,
        startup.fundingGoal,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [query, startups]);

  const selectedStartup =
    visibleStartups.find((startup) => getStartupId(startup) === selectedStartupId) ||
    visibleStartups[0] ||
    startups[0];
  const selectedInterest = interestByStartupId.get(getStartupId(selectedStartup));
  const selectedDealRoom = getInterestDealRoom(
    selectedInterest,
    dealRoomByStartupId.get(getStartupId(selectedStartup)),
  );
  const selectedRequestLocked = isInvestmentRequestLocked(selectedInterest?.status);

  async function expressInterest(startup = selectedStartup) {
    const startupId = getStartupId(startup);
    const existingInterest = interestByStartupId.get(startupId);
    if (!startupId || isInvestmentRequestLocked(existingInterest?.status)) return;

    setNotice("");
    try {
      const response = await expressInvestmentInterest(startupId, {
        amountRange,
        message:
          message.trim() ||
          `Interested in learning more about ${startup.name}'s traction, round, and roadmap.`,
      });
      setInterests((current) => upsertById(current, response.data));
      const returnedDealRoom = response.data?.dealRoom || response.dealRoom;
      if (returnedDealRoom) {
        setDealRooms((current) => upsertById(current, returnedDealRoom));
      }
      if (response.data?.status === "accepted" && !returnedDealRoom) {
        const dealRoomResponse = await fetchInvestmentDealRooms({ limit: 50 }).catch(() => ({
          data: [],
        }));
        setDealRooms(dealRoomResponse.data || []);
      }
      setSelectedStartupId(startupId);
      setMessage("");
      setNotice(
        response.existing
          ? `Existing ${normalizeStatus(response.data?.status).toLowerCase()} interest found for ${startup.name}.`
          : `Investment interest sent to ${startup.name}.`,
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not express investment interest.");
    }
  }

  async function openDealRoomChat(dealRoom, interest, startup = selectedStartup) {
    const room = getInterestDealRoom(interest, dealRoom);
    const startupContext = room?.relatedStartupId || interest?.startupId || startup;
    const counterparty = getDealRoomCounterparty(room, user);
    const investmentInterestId =
      getEntityId(interest?._id) || getEntityId(room?.investmentInterestId);
    const conversationId = getInvestmentConversationId(interest, room);

    if (!conversationId && !investmentInterestId) {
      setNotice("Deal room context is missing for this accepted investment.");
      return;
    }

    const openedConversation = await onOpenConversation?.(
      getUserId(counterparty) || getPrimaryFounderId(startupContext),
      "investment",
      getStartupId(startupContext),
      conversationId,
      { investmentInterestId },
    );
    if (openedConversation?.investmentDealRoom) {
      setDealRooms((current) => upsertById(current, openedConversation));
    }
  }

  if (status === "loading") return <WorkspaceSkeleton />;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <Panel eyebrow="Startup deal flow" title="Companies seeking capital">
        {notice ? (
          <button
            type="button"
            onClick={() => setNotice("")}
            className="mt-4 w-full rounded-xl border border-primary/20 bg-primary/7 p-3 text-left text-sm"
          >
            {notice}
          </button>
        ) : null}
        <label className="relative mt-5 block">
          <FiSearch className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search startups, sectors, stages, cities, or funding ask"
            className="h-11 w-full rounded-xl border border-border bg-card pr-3 pl-9 text-sm outline-none focus:border-primary"
          />
        </label>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {visibleStartups.map((startup, index) => {
            const startupId = getStartupId(startup);
            const interest = interestByStartupId.get(startupId);
            const requestLocked = isInvestmentRequestLocked(interest?.status);
            const dealRoom = getInterestDealRoom(interest, dealRoomByStartupId.get(startupId));
            return (
              <motion.article
                key={startupId}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className={cn(
                  "rounded-3xl border bg-card p-5 shadow-[var(--shadow-soft)]",
                  selectedStartupId === startupId ? "border-primary" : "border-border",
                )}
              >
                <button
                  type="button"
                  onClick={() => setSelectedStartupId(startupId)}
                  className="block w-full text-left"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="flex size-11 items-center justify-center rounded-2xl bg-foreground text-sm font-bold text-background">
                      {startup.initials || initialsFor(startup.name)}
                    </span>
                    <StatusPill status={interest?.status || startup.stage} />
                  </span>
                  <span className="mt-5 block text-lg font-bold">{startup.name}</span>
                  <span className="mt-1 line-clamp-2 block text-sm leading-6 text-muted-foreground">
                    {startup.description}
                  </span>
                  <span className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-border text-xs">
                    <Metric label="Stage" value={startup.stage || "Not set"} />
                    <Metric label="Funding ask" value={startup.fundingGoal || "Not set"} />
                    <Metric
                      label="Raised"
                      value={startup.fundingRaised || startup.funding || "$0"}
                    />
                    <Metric label="Team" value={startup.teamSize || startup.team || 1} />
                  </span>
                </button>
                <div className="mt-4 flex flex-wrap gap-2">
                  <IconButton
                    label={investmentInterestActionLabel(interest?.status)}
                    icon={requestLocked ? FiCheck : FiDollarSign}
                    onClick={() => expressInterest(startup)}
                    disabled={requestLocked}
                  />
                  <IconButton
                    label={interest?.status === "accepted" ? "Open Deal Room" : "Await acceptance"}
                    icon={FiMessageSquare}
                    onClick={() => openDealRoomChat(dealRoom, interest, startup)}
                    disabled={interest?.status !== "accepted"}
                  />
                </div>
              </motion.article>
            );
          })}
          {visibleStartups.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              No startup matches that deal-flow search.
            </p>
          ) : null}
        </div>
      </Panel>

      <div className="space-y-6">
        <Panel eyebrow="Investment interest" title={selectedStartup?.name || "Select a startup"}>
          <div className="mt-5 space-y-4">
            <Field
              label="Investment range"
              value={amountRange}
              onChange={(event) => setAmountRange(event.target.value)}
              placeholder="$100,000 - $250,000"
              disabled={selectedRequestLocked}
            />
            <TextArea
              label="Message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Why this company fits your thesis"
              disabled={selectedRequestLocked}
            />
            <div className="flex flex-wrap gap-2">
              <NexButton
                type="button"
                disabled={!selectedStartup || selectedRequestLocked}
                onClick={() => expressInterest(selectedStartup)}
              >
                <FiDollarSign /> {investmentInterestActionLabel(selectedInterest?.status)}
              </NexButton>
              <NexButton
                type="button"
                variant="ghost"
                disabled={selectedInterest?.status !== "accepted"}
                onClick={() =>
                  openDealRoomChat(selectedDealRoom, selectedInterest, selectedStartup)
                }
              >
                <FiMessageSquare /> Open Deal Room
              </NexButton>
            </div>
            {selectedInterest ? (
              <p className="text-xs text-muted-foreground">
                {selectedStartup?.name} is {normalizeStatus(selectedInterest.status).toLowerCase()}.
              </p>
            ) : null}
          </div>
        </Panel>

        <Panel eyebrow="Your pipeline" title="Investment outreach">
          <div className="mt-5 space-y-3">
            {interests.map((interest) => {
              const startup = interest.startupId || {};
              const dealRoom = getInterestDealRoom(
                interest,
                dealRoomByStartupId.get(getStartupId(startup)),
              );
              return (
                <article key={interest._id} className="rounded-2xl border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">{startup.name || "Startup"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {interest.amountRange} · {startup.stage || "Stage not set"}
                      </p>
                    </div>
                    <StatusPill status={interest.status} />
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                    {interest.message}
                  </p>
                  {interest.status === "accepted" ? (
                    <div className="mt-4">
                      <IconButton
                        label="Open Deal Room"
                        icon={FiMessageSquare}
                        onClick={() => openDealRoomChat(dealRoom, interest, startup)}
                      />
                    </div>
                  ) : null}
                </article>
              );
            })}
            {interests.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                Startups you express interest in will appear here with pipeline status.
              </p>
            ) : null}
          </div>
        </Panel>

        <InvestmentDealRoomsPanel
          dealRooms={dealRooms}
          setDealRooms={setDealRooms}
          currentUser={user}
          onOpenConversation={onOpenConversation}
          emptyBody="Accepted investment interests will open private deal rooms here."
        />
      </div>
    </div>
  );
}

function InvestorsSection({ workspace, persist, onOpenConversation }) {
  const { user } = useAuth();
  const [startup, setStartup] = useState(null);
  const [investors, setInvestors] = useState([]);
  const [interests, setInterests] = useState([]);
  const [dealRooms, setDealRooms] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("loading");
  const [notice, setNotice] = useState("");
  const connected = workspace?.investorConnections || [];
  const startupId = getStartupId(startup);
  const currentUserId = getUserId(user);

  useEffect(() => {
    let active = true;
    async function load() {
      setStatus("loading");
      setNotice("");
      try {
        const startupResponse = await fetchMyStartup();
        const nextStartup = startupResponse.startup || startupResponse.data || null;
        const [usersResponse, interestsResponse, dealRoomResponse] = await Promise.all([
          fetchUsers({ role: "investor", limit: 20 }).catch(() => ({ data: [] })),
          nextStartup
            ? fetchInvestmentInterests({ startupId: getStartupId(nextStartup), limit: 50 }).catch(
                () => ({ data: [] }),
              )
            : Promise.resolve({ data: [] }),
          nextStartup
            ? fetchInvestmentDealRooms({ startupId: getStartupId(nextStartup), limit: 50 }).catch(
                () => ({ data: [] }),
              )
            : Promise.resolve({ data: [] }),
        ]);

        if (!active) return;
        setStartup(nextStartup);
        setInvestors(
          normalizeInvestorDirectory(usersResponse.data || []).filter(
            (investor) => investor.userId !== currentUserId,
          ),
        );
        setInterests(interestsResponse.data || []);
        setDealRooms(dealRoomResponse.data || []);
        setStatus("ready");
      } catch (error) {
        if (!active) return;
        setNotice(error instanceof Error ? error.message : "Could not load investor workspace.");
        setStatus("error");
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [currentUserId]);

  const visibleInvestors = useMemo(() => {
    const source = investors.length ? investors : INVESTORS;
    const term = search.trim().toLowerCase();
    if (!term) return source;
    return source.filter((investor) =>
      [investor.name, investor.focus, investor.cheque, investor.preference, investor.partner]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [investors, search]);

  const dealRoomByInterestId = useMemo(() => {
    const map = new Map();
    dealRooms.forEach((dealRoom) => {
      const interestId = getEntityId(dealRoom.investmentInterestId);
      if (interestId) map.set(interestId, dealRoom);
    });
    interests.forEach((interest) => {
      if (interest._id && interest.dealRoom) map.set(interest._id, interest.dealRoom);
    });
    return map;
  }, [dealRooms, interests]);
  const pendingInterests = useMemo(
    () => interests.filter((interest) => interest.status === "pending"),
    [interests],
  );
  const acceptedInterests = useMemo(
    () => interests.filter((interest) => interest.status === "accepted"),
    [interests],
  );
  const closedInterests = useMemo(
    () => interests.filter((interest) => ["rejected", "founder_review"].includes(interest.status)),
    [interests],
  );

  async function toggleIntro(id) {
    const isAdding = !connected.includes(id);
    const next = isAdding ? [...connected, id] : connected.filter((item) => item !== id);
    const targetInvestor = INVESTORS.find((investor) => investor.id === id);

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
      /* notice shown by parent persist */
    }
  }

  async function contactInvestor(investor) {
    if (investor.userId) {
      await onOpenConversation?.(investor.userId, "investment", startupId || null);
      return;
    }
    await toggleIntro(investor.id);
  }

  async function updatePipeline(interest, nextStatus) {
    setNotice("");
    try {
      const response = await updateInvestmentInterest(interest._id, {
        status: nextStatus,
        founderNotes:
          nextStatus === "founder_review"
            ? "Ignored from founder pipeline."
            : interest.founderNotes,
      });
      setInterests(upsertById(interests, response.data));
      const returnedDealRoom = response.data?.dealRoom || response.dealRoom;
      if (returnedDealRoom) {
        setDealRooms((current) => upsertById(current, returnedDealRoom));
      }
      if (nextStatus === "accepted" && startupId && !returnedDealRoom) {
        const dealRoomResponse = await fetchInvestmentDealRooms({ startupId, limit: 50 }).catch(
          () => ({ data: [] }),
        );
        setDealRooms(dealRoomResponse.data || []);
      }
      setNotice(`Investment interest marked ${normalizeStatus(nextStatus).toLowerCase()}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update investment interest.");
    }
  }

  async function openDealRoomForInterest(interest) {
    const investor = interest.investorId || {};
    const dealRoom = getInterestDealRoom(interest, dealRoomByInterestId.get(interest._id));
    const startupContext = dealRoom?.relatedStartupId || interest.startupId || startup;
    const investmentInterestId =
      getEntityId(interest._id) || getEntityId(dealRoom?.investmentInterestId);
    const conversationId = getInvestmentConversationId(interest, dealRoom);

    if (!conversationId && !investmentInterestId) {
      setNotice("Deal room context is missing for this accepted investment.");
      return;
    }

    const openedConversation = await onOpenConversation?.(
      getUserId(investor),
      "investment",
      getStartupId(startupContext),
      conversationId,
      { investmentInterestId },
    );
    if (openedConversation?.investmentDealRoom) {
      setDealRooms((current) => upsertById(current, openedConversation));
    }
  }

  if (status === "loading") return <WorkspaceSkeleton />;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <Panel eyebrow="Discover investors" title="Profiles, ranges, and preferences">
        {notice ? (
          <button
            type="button"
            onClick={() => setNotice("")}
            className="mt-4 w-full rounded-xl border border-primary/20 bg-primary/7 p-3 text-left text-sm"
          >
            {notice}
          </button>
        ) : null}
        <label className="relative mt-5 block">
          <FiSearch className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search thesis, cheque range, partner, or preference"
            className="h-11 w-full rounded-xl border border-border bg-card pr-3 pl-9 text-sm outline-none focus:border-primary"
          />
        </label>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {visibleInvestors.map((investor, index) => (
            <motion.article
              key={investor.userId || investor.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]"
            >
              <span className="flex size-11 items-center justify-center rounded-2xl bg-foreground text-sm font-bold text-background">
                {initialsFor(investor.name)}
              </span>
              <p className="mt-5 text-lg font-bold">{investor.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{investor.focus}</p>
              <div className="mt-6 space-y-2 border-y border-border py-4 text-xs">
                <p className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Investment range</span>
                  <strong className="text-right">{investor.cheque}</strong>
                </p>
                <p className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Preference</span>
                  <strong className="text-right">{investor.preference}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => contactInvestor(investor)}
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
                    <FiMessageSquare /> Contact investor
                  </>
                )}
              </button>
            </motion.article>
          ))}
        </div>
      </Panel>

      <div className="space-y-6">
        <Panel eyebrow="Investment pipeline" title="Incoming interest">
          {!startupId ? (
            <p className="mt-4 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              Create a startup profile to receive and manage investor interest.
            </p>
          ) : null}
          <div className="mt-5 grid grid-cols-3 gap-2">
            <Metric label="Total" value={interests.length} />
            <Metric
              label="Accepted"
              value={interests.filter((interest) => interest.status === "accepted").length}
            />
            <Metric
              label="Pending"
              value={interests.filter((interest) => interest.status === "pending").length}
            />
          </div>
          <div className="mt-5 space-y-5">
            <InvestmentInterestGroup
              title="Pending"
              count={pendingInterests.length}
              empty="New investment requests will appear here."
            >
              {pendingInterests.map((interest) => (
                <FounderInvestmentInterestCard
                  key={interest._id}
                  interest={interest}
                  startup={startup}
                  dealRoom={dealRoomByInterestId.get(interest._id)}
                  onAccept={() => updatePipeline(interest, "accepted")}
                  onReject={() => updatePipeline(interest, "rejected")}
                  onIgnore={() => updatePipeline(interest, "founder_review")}
                  onOpenDealRoom={() => {}}
                />
              ))}
            </InvestmentInterestGroup>

            <InvestmentInterestGroup
              title="Accepted / Deal Rooms"
              count={acceptedInterests.length}
              empty="Accepted investors and their deal rooms will appear here."
            >
              {acceptedInterests.map((interest) => {
                const dealRoom = dealRoomByInterestId.get(interest._id);
                return (
                  <FounderInvestmentInterestCard
                    key={interest._id}
                    interest={interest}
                    startup={startup}
                    dealRoom={dealRoom}
                    onOpenDealRoom={() => openDealRoomForInterest(interest)}
                  />
                );
              })}
            </InvestmentInterestGroup>

            <InvestmentInterestGroup
              title="Rejected / Ignored"
              count={closedInterests.length}
              empty="Rejected and ignored requests will appear here."
            >
              {closedInterests.map((interest) => (
                <FounderInvestmentInterestCard
                  key={interest._id}
                  interest={interest}
                  startup={startup}
                  dealRoom={dealRoomByInterestId.get(interest._id)}
                />
              ))}
            </InvestmentInterestGroup>
          </div>
        </Panel>

        <InvestmentDealRoomsPanel
          dealRooms={dealRooms}
          setDealRooms={setDealRooms}
          currentUser={user}
          onOpenConversation={onOpenConversation}
          emptyBody="Accepted investor interests will open private deal rooms here."
        />
      </div>
    </div>
  );
}

function InvestmentInterestGroup({ title, count, empty, children }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">{title}</p>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold">{count}</span>
      </div>
      <div className="space-y-3">
        {count ? children : null}
        {!count ? (
          <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            {empty}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function FounderInvestmentInterestCard({
  interest,
  startup,
  onAccept,
  onReject,
  onIgnore,
  onOpenDealRoom,
}) {
  const investor = interest.investorId || {};
  const isPending = interest.status === "pending";
  const isAccepted = interest.status === "accepted";

  return (
    <article className="rounded-2xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold">{investor.name || "Investor"}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {investmentParticipantLine(investor, startup)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{interest.amountRange}</p>
        </div>
        <StatusPill status={interest.status} />
      </div>
      <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
        {interest.message || "No investor note added."}
      </p>
      {isPending || isAccepted ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {isPending ? (
            <>
              <IconButton label="Accept" icon={FiCheck} onClick={onAccept} />
              <IconButton label="Reject" icon={FiX} onClick={onReject} />
              <IconButton label="Ignore" icon={FiArchive} onClick={onIgnore} />
            </>
          ) : null}
          {isAccepted ? (
            <IconButton
              label="Open Deal Room"
              icon={FiMessageSquare}
              onClick={onOpenDealRoom}
              disabled={!onOpenDealRoom}
            />
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function InvestmentDealRoomsPanel({
  dealRooms,
  setDealRooms,
  currentUser,
  onOpenConversation,
  emptyBody,
}) {
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [nextStatus, setNextStatus] = useState("accepted");
  const [meetingAt, setMeetingAt] = useState("");
  const [meetingLocation, setMeetingLocation] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [documentNotes, setDocumentNotes] = useState("");
  const [saving, setSaving] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!dealRooms.length) {
      setSelectedRoomId("");
      return;
    }
    if (!dealRooms.some((dealRoom) => dealRoom._id === selectedRoomId)) {
      setSelectedRoomId(dealRooms[0]._id);
    }
  }, [dealRooms, selectedRoomId]);

  const selectedRoom =
    dealRooms.find((dealRoom) => dealRoom._id === selectedRoomId) || dealRooms[0] || null;
  const roomDetails = selectedRoom?.investmentDealRoom || {};
  const startup = selectedRoom?.relatedStartupId || {};
  const pitch = selectedRoom?.relatedPitchId || {};
  const interest = selectedRoom?.investmentInterestId || {};
  const counterparty = getDealRoomCounterparty(selectedRoom, currentUser);
  const documents = roomDetails.documents || [];

  useEffect(() => {
    setNextStatus(roomDetails.status || "accepted");
    setMeetingAt(toDateTimeLocal(roomDetails.meeting?.scheduledAt));
    setMeetingLocation(roomDetails.meeting?.location || "");
    setMeetingNotes(roomDetails.meeting?.notes || "");
  }, [
    roomDetails.status,
    roomDetails.meeting?.scheduledAt,
    roomDetails.meeting?.location,
    roomDetails.meeting?.notes,
    selectedRoom?._id,
  ]);

  async function updateRoom(payload, successMessage, savingKey) {
    if (!selectedRoom) return null;
    setSaving(savingKey);
    setNotice("");
    try {
      const response = await updateInvestmentDealRoom(selectedRoom._id, payload);
      setDealRooms((current) => upsertById(current, response.data));
      setNotice(successMessage);
      return response.data;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update deal room.");
      return null;
    } finally {
      setSaving("");
    }
  }

  async function saveStatus() {
    await updateRoom(
      { status: nextStatus },
      `Deal status moved to ${normalizeStatus(nextStatus)}.`,
      "status",
    );
  }

  async function saveMeeting(event) {
    event.preventDefault();
    await updateRoom(
      {
        meeting: {
          scheduledAt: meetingAt || null,
          location: meetingLocation,
          notes: meetingNotes,
        },
      },
      "Meeting details updated.",
      "meeting",
    );
  }

  async function shareDocument(event) {
    event.preventDefault();
    if (!documentTitle.trim() || !documentUrl.trim()) return;
    const updated = await updateRoom(
      {
        document: {
          title: documentTitle,
          url: documentUrl,
          notes: documentNotes,
        },
      },
      "Private document shared.",
      "document",
    );
    if (updated) {
      setDocumentTitle("");
      setDocumentUrl("");
      setDocumentNotes("");
    }
  }

  function openRoomChat() {
    if (!selectedRoom) return;
    onOpenConversation?.(
      getUserId(counterparty),
      "investment",
      getStartupId(startup),
      selectedRoom._id,
      { investmentInterestId: getEntityId(selectedRoom.investmentInterestId) },
    );
  }

  return (
    <Panel
      eyebrow="Investment Deal Rooms"
      title={selectedRoom ? startup.name || "Investment workspace" : "Accepted rooms"}
    >
      {notice ? (
        <button
          type="button"
          onClick={() => setNotice("")}
          className="mt-4 w-full rounded-xl border border-primary/20 bg-primary/7 p-3 text-left text-sm"
        >
          {notice}
        </button>
      ) : null}

      {dealRooms.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          {emptyBody}
        </p>
      ) : (
        <div className="mt-5 space-y-5">
          <div className="space-y-2">
            {dealRooms.map((dealRoom) => {
              const roomStartup = dealRoom.relatedStartupId || {};
              const roomCounterparty = getDealRoomCounterparty(dealRoom, currentUser);
              return (
                <button
                  key={dealRoom._id}
                  type="button"
                  onClick={() => setSelectedRoomId(dealRoom._id)}
                  className={cn(
                    "w-full rounded-2xl border p-3 text-left transition-colors",
                    selectedRoom?._id === dealRoom._id
                      ? "border-primary bg-primary/8"
                      : "border-border bg-secondary/45 hover:bg-secondary",
                  )}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="line-clamp-1 block text-sm font-bold">
                        {roomStartup.name || "Startup"}
                      </span>
                      <span className="line-clamp-1 block text-xs text-muted-foreground">
                        {roomCounterparty?.name || "Investor relationship"}
                      </span>
                    </span>
                    <StatusPill status={dealRoom.investmentDealRoom?.status} />
                  </span>
                </button>
              );
            })}
          </div>

          {selectedRoom ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-border bg-secondary/45 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold">{counterparty?.name || "Investor"}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {counterparty?.headline || counterparty?.email || "Private participant"}
                    </p>
                  </div>
                  <IconButton
                    label="Open chat"
                    icon={FiMessageSquare}
                    onClick={openRoomChat}
                    disabled={!getUserId(counterparty)}
                  />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-border text-xs">
                  <Metric label="Amount" value={roomDetails.amountRange || interest.amountRange} />
                  <Metric label="Stage" value={startup.stage || "Not set"} />
                  <Metric label="Pitch ask" value={pitch.fundingAsk || "Not set"} />
                  <Metric label="Meeting" value={formatDate(roomDetails.meeting?.scheduledAt)} />
                </div>
                <p className="mt-4 line-clamp-4 text-sm leading-6 text-muted-foreground">
                  {pitch.elevatorPitch || startup.description || interest.message}
                </p>
              </div>

              <div>
                <SelectControl
                  label="Deal status"
                  value={nextStatus}
                  onChange={(event) => setNextStatus(event.target.value)}
                >
                  {INVESTMENT_DEAL_STATUS_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </SelectControl>
                <NexButton
                  type="button"
                  size="sm"
                  className="mt-3"
                  onClick={saveStatus}
                  disabled={saving === "status" || nextStatus === roomDetails.status}
                >
                  <FiCheck /> {saving === "status" ? "Saving..." : "Update status"}
                </NexButton>
              </div>

              <form onSubmit={saveMeeting} className="space-y-3">
                <label className="block">
                  <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Meeting time
                  </span>
                  <input
                    type="datetime-local"
                    value={meetingAt}
                    onChange={(event) => setMeetingAt(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-border bg-card px-3.5 text-sm outline-none focus:border-primary"
                  />
                </label>
                <Field
                  label="Meeting location"
                  value={meetingLocation}
                  onChange={(event) => setMeetingLocation(event.target.value)}
                  placeholder="Google Meet, Zoom, office, or phone"
                />
                <TextArea
                  label="Meeting notes"
                  value={meetingNotes}
                  onChange={(event) => setMeetingNotes(event.target.value)}
                  placeholder="Agenda, diligence topics, and prep notes"
                />
                <NexButton type="submit" size="sm" disabled={saving === "meeting"}>
                  <FiClock /> {saving === "meeting" ? "Saving..." : "Save meeting"}
                </NexButton>
              </form>

              <form onSubmit={shareDocument} className="space-y-3">
                <Field
                  label="Document title"
                  value={documentTitle}
                  onChange={(event) => setDocumentTitle(event.target.value)}
                  placeholder="Pitch deck, metrics pack, term draft"
                />
                <Field
                  label="Private document URL"
                  value={documentUrl}
                  onChange={(event) => setDocumentUrl(event.target.value)}
                  placeholder="https://..."
                />
                <TextArea
                  label="Document note"
                  value={documentNotes}
                  onChange={(event) => setDocumentNotes(event.target.value)}
                  placeholder="What this document contains"
                />
                <NexButton
                  type="submit"
                  size="sm"
                  disabled={saving === "document" || !documentTitle.trim() || !documentUrl.trim()}
                >
                  <FiFileText /> {saving === "document" ? "Sharing..." : "Share document"}
                </NexButton>
              </form>

              <div className="space-y-2">
                {documents.map((document) => (
                  <a
                    key={document._id || document.url}
                    href={document.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-2xl border border-border p-3 text-sm transition-colors hover:bg-secondary"
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="line-clamp-1 block font-bold">{document.title}</span>
                        <span className="line-clamp-2 block text-xs leading-5 text-muted-foreground">
                          {document.notes || `Shared by ${document.addedBy?.name || "participant"}`}
                        </span>
                      </span>
                      <FiExternalLink className="mt-0.5 size-4 shrink-0" />
                    </span>
                  </a>
                ))}
                {documents.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                    Shared pitch decks, diligence files, and term documents appear here.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </Panel>
  );
}

function MentorsSection({ onOpenConversation }) {
  const { user } = useAuth();
  const [startup, setStartup] = useState(null);
  const [mentors, setMentors] = useState([]);
  const [requests, setRequests] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedMentorId, setSelectedMentorId] = useState("");
  const [expertise, setExpertise] = useState("");
  const [message, setMessage] = useState("");
  const [goals, setGoals] = useState("");
  const [focusAreas, setFocusAreas] = useState([
    "Business strategy",
    "Fundraising and pitch preparation",
  ]);
  const [status, setStatus] = useState("loading");
  const [notice, setNotice] = useState("");

  const startupId = getStartupId(startup);
  const currentUserId = getUserId(user);
  const visibleMentors = useMemo(() => {
    const source = mentors;
    const term = expertise.trim().toLowerCase();
    if (!term) return source;
    return source.filter((mentor) =>
      [mentor.name, mentor.headline, ...(mentor.expertise || [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [mentors, expertise]);
  const selectedMentor =
    visibleMentors.find(
      (mentor) => mentor.userId === selectedMentorId || mentor.id === selectedMentorId,
    ) || visibleMentors[0];
  const requestsByMentor = useMemo(() => {
    const map = new Map();
    requests.forEach((request) => {
      const mentorId = getUserId(request.mentorId);
      if (mentorId && !["cancelled", "rejected", "completed"].includes(request.status)) {
        map.set(mentorId, request);
      }
    });
    return map;
  }, [requests]);
  const selectedMentorRequest = selectedMentor?.userId
    ? requestsByMentor.get(selectedMentor.userId)
    : null;

  useEffect(() => {
    let active = true;
    async function load() {
      setStatus("loading");
      setNotice("");
      try {
        const [startupResponse, mentorsResponse, mentorUsersResponse, requestsResponse] =
          await Promise.all([
            fetchMyStartup().catch(() => ({ startup: null })),
            fetchMentors({ limit: 20 }).catch(() => ({ data: [] })),
            fetchUsers({ role: "mentor", limit: 20 }).catch(() => ({ data: [] })),
            fetchMentorshipRequests({ limit: 50 }).catch(() => ({ data: [] })),
          ]);
        if (!active) return;
        const nextMentors = normalizeMentorDirectory(
          mentorsResponse.data || [],
          mentorUsersResponse.data || [],
        ).filter((mentor) => mentor.userId !== currentUserId);
        setStartup(startupResponse.startup || startupResponse.data || null);
        setMentors(nextMentors);
        setRequests(requestsResponse.data || []);
        const workspaceResponse = await fetchMentorshipWorkspaces({
          startupId: getStartupId(startupResponse.startup || startupResponse.data),
          limit: 50,
        }).catch(() => ({ data: [] }));
        if (!active) return;
        setWorkspaces(workspaceResponse.data || []);
        setSelectedMentorId(nextMentors[0]?.userId || nextMentors[0]?.id || "");
        setStatus("ready");
      } catch (error) {
        if (!active) return;
        setNotice(error instanceof Error ? error.message : "Could not load mentor workspace.");
        setStatus("error");
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [currentUserId]);

  async function submitRequest(event) {
    event.preventDefault();
    if (!startupId) {
      setNotice("Create your startup profile before requesting mentorship for it.");
      return;
    }

    const mentorUserId = selectedMentor?.userId;
    if (!mentorUserId || !message.trim()) {
      setNotice("Choose a mentor profile connected to a user account and add a request message.");
      return;
    }

    setNotice("");
    try {
      const response = await requestMentorship({
        mentorId: mentorUserId,
        startupId: startupId || undefined,
        message,
        goals: splitList(goals),
        focusAreas,
      });
      setRequests([response.data, ...requests]);
      setMessage("");
      setGoals("");
      setNotice("Mentorship request sent.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not send mentorship request.");
    }
  }

  async function cancelRequest(request) {
    setNotice("");
    try {
      const response = await updateMentorshipRequest(request._id, { status: "cancelled" });
      setRequests(upsertById(requests, response.data));
      setNotice("Mentorship request cancelled.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update mentorship request.");
    }
  }

  async function updateRequest(request, nextStatus) {
    setNotice("");
    try {
      const response = await updateMentorshipRequest(request._id, { status: nextStatus });
      setRequests(upsertById(requests, response.data));
      if (nextStatus === "accepted") {
        const workspaceResponse = await fetchMentorshipWorkspaces({
          startupId: getStartupId(request.startupId) || startupId,
          limit: 50,
        }).catch(() => ({ data: [] }));
        setWorkspaces(workspaceResponse.data || []);
      }
      setNotice(
        nextStatus === "accepted"
          ? "Mentorship accepted. The private workspace is ready."
          : `Mentorship request marked ${normalizeStatus(nextStatus).toLowerCase()}.`,
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update mentorship request.");
    }
  }

  function toggleFocusArea(area) {
    setFocusAreas((current) =>
      current.includes(area) ? current.filter((item) => item !== area) : [...current, area],
    );
  }

  function openMentorshipChat(request) {
    if (request.status !== "accepted") return;
    const workspace = workspaces.find(
      (item) => getEntityId(item.mentorshipRequestId) === request._id,
    );
    const mentor = request.mentorId || {};
    onOpenConversation?.(
      getUserId(mentor),
      "mentorship",
      getStartupId(request.startupId) || startupId,
      workspace?._id,
      { mentorshipRequestId: request._id },
    );
  }

  if (status === "loading") return <WorkspaceSkeleton />;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <Panel eyebrow="Discover mentors" title="Search by expertise">
        {notice ? (
          <button
            type="button"
            onClick={() => setNotice("")}
            className="mt-4 w-full rounded-xl border border-primary/20 bg-primary/7 p-3 text-left text-sm"
          >
            {notice}
          </button>
        ) : null}
        <label className="relative mt-5 block">
          <FiSearch className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={expertise}
            onChange={(event) => setExpertise(event.target.value)}
            placeholder="Search fundraising, product, GTM, pricing, hiring"
            className="h-11 w-full rounded-xl border border-border bg-card pr-3 pl-9 text-sm outline-none focus:border-primary"
          />
        </label>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {visibleMentors.length ? (
            visibleMentors.map((mentor) => {
              const active = selectedMentorId === (mentor.userId || mentor.id);
              const activeRequest = mentor.userId ? requestsByMentor.get(mentor.userId) : null;
              return (
                <button
                  key={mentor.userId || mentor.id}
                  type="button"
                  onClick={() => setSelectedMentorId(mentor.userId || mentor.id)}
                  className={cn(
                    "rounded-3xl border p-5 text-left transition-colors",
                    active
                      ? "border-primary bg-primary/8"
                      : "border-border bg-card hover:bg-secondary",
                  )}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="flex size-11 items-center justify-center rounded-2xl bg-foreground text-sm font-bold text-background">
                      {initialsFor(mentor.name)}
                    </span>
                    {activeRequest ? (
                      <StatusPill status={activeRequest.status} />
                    ) : (
                      <span className="rounded-full bg-success/10 px-2.5 py-1 text-[10px] font-bold text-success">
                        {mentor.rating || 5} rating
                      </span>
                    )}
                  </span>
                  <span className="mt-5 block text-lg font-bold">{mentor.name}</span>
                  <span className="mt-1 line-clamp-2 block text-sm leading-5 text-muted-foreground">
                    {mentor.headline}
                  </span>
                  <span className="mt-4 flex flex-wrap gap-1.5">
                    {(mentor.expertise || []).slice(0, 4).map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-border bg-secondary px-2 py-1 text-[10px] font-bold"
                      >
                        {item}
                      </span>
                    ))}
                  </span>
                </button>
              );
            })
          ) : (
            <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground md:col-span-2">
              No mentor profiles are listed yet.
            </p>
          )}
        </div>
      </Panel>

      <div className="space-y-6">
        <Panel eyebrow="Mentorship request" title={selectedMentor?.name || "Select a mentor"}>
          {!startupId ? (
            <p className="mt-4 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              Publish your startup profile first so mentors can evaluate the company they would be
              helping.
            </p>
          ) : null}
          <form onSubmit={submitRequest} className="mt-5 space-y-4">
            <TextArea
              label="Request message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="What do you want help with?"
              required
              disabled={!startupId || !selectedMentor?.userId || Boolean(selectedMentorRequest)}
            />
            <Field
              label="Goals"
              value={goals}
              onChange={(event) => setGoals(event.target.value)}
              placeholder="Pricing, GTM, fundraising"
              disabled={!startupId || !selectedMentor?.userId || Boolean(selectedMentorRequest)}
            />
            <div>
              <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Focus areas
              </span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {MENTORSHIP_FOCUS_AREAS.map((area) => (
                  <button
                    key={area}
                    type="button"
                    onClick={() => toggleFocusArea(area)}
                    disabled={
                      !startupId || !selectedMentor?.userId || Boolean(selectedMentorRequest)
                    }
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[10px] font-bold transition-colors disabled:opacity-50",
                      focusAreas.includes(area)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-secondary",
                    )}
                  >
                    {area}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <NexButton
                type="submit"
                size="sm"
                disabled={
                  !startupId ||
                  !selectedMentor?.userId ||
                  !message.trim() ||
                  Boolean(selectedMentorRequest)
                }
              >
                <FiUserCheck /> {selectedMentorRequest ? "Request sent" : "Request mentorship"}
              </NexButton>
            </div>
          </form>
        </Panel>

        <Panel eyebrow="Active mentors" title="Requests and sessions">
          <div className="mt-5 space-y-3">
            {requests.map((request) => {
              const mentor = request.mentorId || {};
              const canFounderRespond =
                request.initiatedBy === "mentor" && request.status === "pending";
              return (
                <article key={request._id} className="rounded-2xl border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">{mentor.name || "Mentor"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {mentor.headline || "Mentorship request"} ·{" "}
                        {formatDate(request.scheduledAt)}
                      </p>
                    </div>
                    <StatusPill status={request.status} />
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                    {request.message}
                  </p>
                  {request.focusAreas?.length ? (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {request.focusAreas.slice(0, 4).map((area) => (
                        <span
                          key={area}
                          className="rounded-full border border-border bg-secondary px-2 py-1 text-[10px] font-bold"
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {canFounderRespond ? (
                      <>
                        <IconButton
                          label="Accept"
                          icon={FiCheck}
                          onClick={() => updateRequest(request, "accepted")}
                        />
                        <IconButton
                          label="Reject"
                          icon={FiX}
                          onClick={() => updateRequest(request, "rejected")}
                        />
                      </>
                    ) : null}
                    <IconButton
                      label="Chat"
                      icon={FiMessageSquare}
                      onClick={() => openMentorshipChat(request)}
                      disabled={request.status !== "accepted"}
                    />
                    {request.initiatedBy !== "mentor" &&
                    !["cancelled", "rejected", "completed"].includes(request.status) ? (
                      <IconButton
                        label="Cancel"
                        icon={FiX}
                        onClick={() => cancelRequest(request)}
                      />
                    ) : null}
                  </div>
                </article>
              );
            })}
            {requests.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                Mentor requests, accepted mentorships, and scheduled sessions appear here.
              </p>
            ) : null}
          </div>
        </Panel>

        <MentorshipWorkspacesPanel
          workspaces={workspaces}
          setWorkspaces={setWorkspaces}
          currentUser={user}
          onOpenConversation={onOpenConversation}
          emptyBody="Accepted mentorships will open private workspaces here."
        />
      </div>
    </div>
  );
}

function MentorRequestsSection({ onOpenConversation }) {
  const { user } = useAuth();
  const [startups, setStartups] = useState([]);
  const [requests, setRequests] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedStartupId, setSelectedStartupId] = useState("");
  const [startupQuery, setStartupQuery] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [requestGoals, setRequestGoals] = useState("");
  const [requestFocusAreas, setRequestFocusAreas] = useState([
    "Business strategy",
    "Product/PMF",
    "Fundraising and pitch preparation",
  ]);
  const [filter, setFilter] = useState("pending");
  const [scheduleById, setScheduleById] = useState({});
  const [status, setStatus] = useState("loading");
  const [notice, setNotice] = useState("");
  const currentUserId = getUserId(user);

  const load = useCallback(async () => {
    setStatus("loading");
    setNotice("");
    try {
      const [startupResponse, requestResponse, workspaceResponse] = await Promise.all([
        fetchStartups().catch(() => ({ startups: [], data: [] })),
        fetchMentorshipRequests({ asMentor: true, limit: 50 }).catch(() => ({ data: [] })),
        fetchMentorshipWorkspaces({ limit: 50 }).catch(() => ({ data: [] })),
      ]);
      const nextStartups = (startupResponse.startups || startupResponse.data || []).filter(
        (startup) => !isOwnStartup(startup, currentUserId),
      );
      setStartups(nextStartups);
      setRequests(requestResponse.data || []);
      setWorkspaces(workspaceResponse.data || []);
      setSelectedStartupId((current) =>
        nextStartups.some((startup) => getStartupId(startup) === current)
          ? current
          : getStartupId(nextStartups[0]) || "",
      );
      setStatus("ready");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not load mentorship requests.");
      setStatus("error");
    }
  }, [currentUserId]);

  useEffect(() => {
    load();
  }, [load]);

  const requestByStartupId = useMemo(() => {
    const map = new Map();
    requests.forEach((request) => {
      const startupId = getStartupId(request.startupId);
      if (
        startupId &&
        request.initiatedBy === "mentor" &&
        !["cancelled", "rejected", "completed"].includes(request.status)
      ) {
        map.set(startupId, request);
      }
    });
    return map;
  }, [requests]);

  const visibleStartups = useMemo(() => {
    const term = startupQuery.trim().toLowerCase();
    if (!term) return startups;
    return startups.filter((startup) =>
      [
        startup.name,
        startup.description,
        startup.industry,
        startup.stage,
        startup.location,
        startup.fundingGoal,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [startupQuery, startups]);

  const selectedStartup =
    visibleStartups.find((startup) => getStartupId(startup) === selectedStartupId) ||
    visibleStartups[0] ||
    startups[0] ||
    null;

  const visibleRequests = useMemo(() => {
    if (filter === "all") return requests;
    return requests.filter((request) => request.status === filter);
  }, [filter, requests]);

  async function sendMentorshipRequest(event) {
    event.preventDefault();
    const startupId = getStartupId(selectedStartup);
    if (!startupId || !requestMessage.trim()) return;

    setNotice("");
    try {
      const response = await requestStartupMentorship(startupId, {
        message: requestMessage,
        goals: splitList(requestGoals),
        focusAreas: requestFocusAreas,
      });
      setRequests(upsertById(requests, response.data));
      setRequestMessage("");
      setRequestGoals("");
      setNotice(`Mentorship request sent to ${selectedStartup.name}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not send mentorship request.");
    }
  }

  async function updateRequest(request, nextStatus) {
    setNotice("");
    try {
      const payload = { status: nextStatus };
      if (nextStatus === "accepted" && scheduleById[request._id]) {
        payload.scheduledAt = scheduleById[request._id];
      }
      const response = await updateMentorshipRequest(request._id, payload);
      setRequests(upsertById(requests, response.data));
      if (nextStatus === "accepted") {
        const workspaceResponse = await fetchMentorshipWorkspaces({ limit: 50 }).catch(() => ({
          data: [],
        }));
        setWorkspaces(workspaceResponse.data || []);
      }
      setNotice(
        nextStatus === "accepted"
          ? "Mentorship accepted. The private workspace is ready."
          : `Mentorship request marked ${normalizeStatus(nextStatus).toLowerCase()}.`,
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update mentorship request.");
    }
  }

  function openMentorshipChat(request) {
    if (request.status !== "accepted") return;
    const workspace = workspaces.find(
      (item) => getEntityId(item.mentorshipRequestId) === request._id,
    );
    onOpenConversation?.(
      getUserId(request.founderId),
      "mentorship",
      getStartupId(request.startupId),
      workspace?._id,
      { mentorshipRequestId: request._id },
    );
  }

  function toggleRequestFocusArea(area) {
    setRequestFocusAreas((current) =>
      current.includes(area) ? current.filter((item) => item !== area) : [...current, area],
    );
  }

  if (status === "loading") return <WorkspaceSkeleton />;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
      <Panel eyebrow="Startup discovery" title="Offer founder mentorship">
        {notice ? (
          <button
            type="button"
            onClick={() => setNotice("")}
            className="mt-4 w-full rounded-xl border border-primary/20 bg-primary/7 p-3 text-left text-sm"
          >
            {notice}
          </button>
        ) : null}

        <label className="relative mt-5 block">
          <FiSearch className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={startupQuery}
            onChange={(event) => setStartupQuery(event.target.value)}
            placeholder="Search startups by market, stage, city, or challenge"
            className="h-11 w-full rounded-xl border border-border bg-card pr-3 pl-9 text-sm outline-none focus:border-primary"
          />
        </label>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {visibleStartups.map((startup, index) => {
            const startupId = getStartupId(startup);
            const activeRequest = requestByStartupId.get(startupId);
            const selected = selectedStartupId === startupId;
            return (
              <motion.article
                key={startupId}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className={cn(
                  "rounded-3xl border bg-card p-5 shadow-[var(--shadow-soft)]",
                  selected ? "border-primary" : "border-border",
                )}
              >
                <button
                  type="button"
                  onClick={() => setSelectedStartupId(startupId)}
                  className="block w-full text-left"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="flex size-11 items-center justify-center rounded-2xl bg-foreground text-sm font-bold text-background">
                      {startup.initials || initialsFor(startup.name)}
                    </span>
                    <StatusPill status={activeRequest?.status || startup.stage} />
                  </span>
                  <span className="mt-5 block text-lg font-bold">{startup.name}</span>
                  <span className="mt-1 line-clamp-3 block text-sm leading-6 text-muted-foreground">
                    {startup.description}
                  </span>
                  <span className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-border text-xs">
                    <Metric label="Stage" value={startup.stage || "Not set"} />
                    <Metric label="Industry" value={startup.industry || "Not set"} />
                    <Metric label="Location" value={startup.location || "Not set"} />
                    <Metric label="Funding ask" value={startup.fundingGoal || "Not set"} />
                  </span>
                </button>
                <div className="mt-4">
                  <IconButton
                    label={activeRequest ? "Request sent" : "Offer mentorship"}
                    icon={activeRequest ? FiCheck : FiUserCheck}
                    onClick={() => setSelectedStartupId(startupId)}
                    disabled={Boolean(activeRequest)}
                  />
                </div>
              </motion.article>
            );
          })}
          {visibleStartups.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              No startups match that mentorship search.
            </p>
          ) : null}
        </div>
      </Panel>

      <div className="space-y-6">
        <Panel eyebrow="Mentorship request" title={selectedStartup?.name || "Select a startup"}>
          {selectedStartup ? (
            <form onSubmit={sendMentorshipRequest} className="mt-5 space-y-4">
              <TextArea
                label="Founder message"
                value={requestMessage}
                onChange={(event) => setRequestMessage(event.target.value)}
                placeholder="How you can help and why this startup fits your expertise"
                required
                disabled={Boolean(requestByStartupId.get(getStartupId(selectedStartup)))}
              />
              <Field
                label="Mentorship goals"
                value={requestGoals}
                onChange={(event) => setRequestGoals(event.target.value)}
                placeholder="PMF interviews, fundraising deck, growth loops"
                disabled={Boolean(requestByStartupId.get(getStartupId(selectedStartup)))}
              />
              <div>
                <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Help areas
                </span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {MENTORSHIP_FOCUS_AREAS.map((area) => (
                    <button
                      key={area}
                      type="button"
                      onClick={() => toggleRequestFocusArea(area)}
                      disabled={Boolean(requestByStartupId.get(getStartupId(selectedStartup)))}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[10px] font-bold transition-colors disabled:opacity-50",
                        requestFocusAreas.includes(area)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-secondary",
                      )}
                    >
                      {area}
                    </button>
                  ))}
                </div>
              </div>
              <NexButton
                type="submit"
                size="sm"
                disabled={
                  !requestMessage.trim() ||
                  Boolean(requestByStartupId.get(getStartupId(selectedStartup)))
                }
              >
                <FiUserCheck />{" "}
                {requestByStartupId.get(getStartupId(selectedStartup))
                  ? "Request sent"
                  : "Send request"}
              </NexButton>
            </form>
          ) : (
            <p className="mt-5 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              Startups open to ecosystem support will appear here.
            </p>
          )}
        </Panel>

        <Panel eyebrow="Founder requests" title="Mentorship pipeline">
          <div className="mt-5 flex flex-wrap gap-2">
            {[
              ["pending", "Pending"],
              ["accepted", "Accepted"],
              ["all", "All"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={cn(
                  "h-9 rounded-xl border px-3 text-xs font-bold transition-colors",
                  filter === value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card hover:bg-secondary",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-3">
            {visibleRequests.map((request, index) => {
              const founder = request.founderId || {};
              const startup = request.startupId || {};
              const canRespond = request.status === "pending" && request.initiatedBy !== "mentor";
              const canCancel = request.status === "pending" && request.initiatedBy === "mentor";
              const canChat = request.status === "accepted";
              return (
                <motion.article
                  key={request._id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold">{startup.name || "Startup mentorship"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {founder.name || "Founder"} · {startup.stage || "Stage not set"} ·{" "}
                        {formatDate(request.scheduledAt)}
                      </p>
                    </div>
                    <StatusPill status={request.status} />
                  </div>

                  <p className="mt-4 line-clamp-4 text-sm leading-6 text-muted-foreground">
                    {request.message}
                  </p>

                  {request.goals?.length ? (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {request.goals.slice(0, 5).map((goal) => (
                        <span
                          key={goal}
                          className="rounded-full border border-border bg-secondary px-2 py-1 text-[10px] font-bold"
                        >
                          {goal}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {canRespond ? (
                    <label className="mt-4 block">
                      <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        Suggested session time
                      </span>
                      <input
                        type="datetime-local"
                        value={scheduleById[request._id] || ""}
                        onChange={(event) =>
                          setScheduleById((current) => ({
                            ...current,
                            [request._id]: event.target.value,
                          }))
                        }
                        className="mt-2 h-11 w-full rounded-xl border border-border bg-card px-3.5 text-sm outline-none focus:border-primary"
                      />
                    </label>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <IconButton
                      label="Provide mentorship"
                      icon={FiCheck}
                      onClick={() => updateRequest(request, "accepted")}
                      disabled={!canRespond}
                    />
                    {canCancel ? (
                      <IconButton
                        label="Cancel"
                        icon={FiX}
                        onClick={() => updateRequest(request, "cancelled")}
                      />
                    ) : null}
                    <IconButton
                      label="Decline"
                      icon={FiX}
                      onClick={() => updateRequest(request, "rejected")}
                      disabled={!canRespond}
                    />
                    {request.status === "accepted" ? (
                      <IconButton
                        label="Complete"
                        icon={FiUserCheck}
                        onClick={() => updateRequest(request, "completed")}
                      />
                    ) : null}
                    <IconButton
                      label="Chat"
                      icon={FiMessageSquare}
                      onClick={() => openMentorshipChat(request)}
                      disabled={!canChat || !getUserId(founder)}
                    />
                  </div>
                </motion.article>
              );
            })}

            {visibleRequests.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                Founder requests and outbound startup mentorship requests will appear here.
              </p>
            ) : null}
          </div>
        </Panel>

        <Panel eyebrow="Mentor capacity" title="Request summary">
          <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-border text-xs">
            <Metric
              label="Pending"
              value={requests.filter((request) => request.status === "pending").length}
            />
            <Metric
              label="Accepted"
              value={requests.filter((request) => request.status === "accepted").length}
            />
            <Metric
              label="Completed"
              value={requests.filter((request) => request.status === "completed").length}
            />
            <Metric label="Total" value={requests.length} />
          </div>
        </Panel>

        <MentorshipWorkspacesPanel
          workspaces={workspaces}
          setWorkspaces={setWorkspaces}
          currentUser={user}
          onOpenConversation={onOpenConversation}
          emptyBody="Accepted requests will open private mentorship workspaces here."
        />
      </div>
    </div>
  );
}

function MentorshipWorkspacesPanel({
  workspaces,
  setWorkspaces,
  currentUser,
  onOpenConversation,
  emptyBody,
}) {
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [workspaceStatus, setWorkspaceStatus] = useState("active");
  const [progress, setProgress] = useState(0);
  const [meetingAt, setMeetingAt] = useState("");
  const [meetingLocation, setMeetingLocation] = useState("");
  const [meetingAgenda, setMeetingAgenda] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [mentorNotes, setMentorNotes] = useState("");
  const [feedback, setFeedback] = useState("");
  const [goalTitle, setGoalTitle] = useState("");
  const [goalNotes, setGoalNotes] = useState("");
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneNotes, setMilestoneNotes] = useState("");
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [resourceNotes, setResourceNotes] = useState("");
  const [saving, setSaving] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!workspaces.length) {
      setSelectedWorkspaceId("");
      return;
    }
    if (!workspaces.some((workspace) => workspace._id === selectedWorkspaceId)) {
      setSelectedWorkspaceId(workspaces[0]._id);
    }
  }, [selectedWorkspaceId, workspaces]);

  const selectedWorkspace =
    workspaces.find((workspace) => workspace._id === selectedWorkspaceId) || workspaces[0] || null;
  const details = selectedWorkspace?.mentorshipWorkspace || {};
  const startup = selectedWorkspace?.relatedStartupId || {};
  const request = selectedWorkspace?.mentorshipRequestId || {};
  const counterparty = getWorkspaceCounterparty(selectedWorkspace, currentUser);
  const goals = details.goals || [];
  const milestones = details.milestones || [];
  const resources = details.resources || [];

  useEffect(() => {
    setWorkspaceStatus(details.status || "active");
    setProgress(Number(details.progress) || 0);
    setMeetingAt(toDateTimeLocal(details.nextSession?.scheduledAt));
    setMeetingLocation(details.nextSession?.location || "");
    setMeetingAgenda(details.nextSession?.agenda || "");
    setMeetingNotes(details.nextSession?.notes || "");
    setMentorNotes(details.mentorNotes || "");
    setFeedback(details.feedback || "");
  }, [
    details.status,
    details.progress,
    details.nextSession?.scheduledAt,
    details.nextSession?.location,
    details.nextSession?.agenda,
    details.nextSession?.notes,
    details.mentorNotes,
    details.feedback,
    selectedWorkspace?._id,
  ]);

  async function updateWorkspace(payload, successMessage, savingKey) {
    if (!selectedWorkspace) return null;
    setSaving(savingKey);
    setNotice("");
    try {
      const response = await updateMentorshipWorkspace(selectedWorkspace._id, payload);
      setWorkspaces((current) => upsertById(current, response.data));
      setNotice(successMessage);
      return response.data;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update mentorship workspace.");
      return null;
    } finally {
      setSaving("");
    }
  }

  async function saveStatusAndProgress() {
    await updateWorkspace(
      { status: workspaceStatus, progress },
      "Mentorship progress updated.",
      "progress",
    );
  }

  async function saveMeeting(event) {
    event.preventDefault();
    await updateWorkspace(
      {
        meeting: {
          scheduledAt: meetingAt || null,
          location: meetingLocation,
          agenda: meetingAgenda,
          notes: meetingNotes,
        },
      },
      "Mentorship session updated.",
      "meeting",
    );
  }

  async function saveNotes(event) {
    event.preventDefault();
    await updateWorkspace(
      {
        mentorNotes,
        feedback,
      },
      "Mentor notes and feedback updated.",
      "notes",
    );
  }

  async function addGoal(event) {
    event.preventDefault();
    if (!goalTitle.trim()) return;
    const updated = await updateWorkspace(
      {
        goal: {
          title: goalTitle,
          notes: goalNotes,
        },
      },
      "Mentorship goal added.",
      "goal",
    );
    if (updated) {
      setGoalTitle("");
      setGoalNotes("");
    }
  }

  async function addMilestone(event) {
    event.preventDefault();
    if (!milestoneTitle.trim()) return;
    const updated = await updateWorkspace(
      {
        milestone: {
          title: milestoneTitle,
          notes: milestoneNotes,
        },
      },
      "Mentorship milestone added.",
      "milestone",
    );
    if (updated) {
      setMilestoneTitle("");
      setMilestoneNotes("");
    }
  }

  async function shareResource(event) {
    event.preventDefault();
    if (!resourceTitle.trim() || !resourceUrl.trim()) return;
    const updated = await updateWorkspace(
      {
        resource: {
          title: resourceTitle,
          url: resourceUrl,
          notes: resourceNotes,
        },
      },
      "Resource shared.",
      "resource",
    );
    if (updated) {
      setResourceTitle("");
      setResourceUrl("");
      setResourceNotes("");
    }
  }

  function openWorkspaceChat() {
    if (!selectedWorkspace) return;
    onOpenConversation?.(
      getUserId(counterparty),
      "mentorship",
      getStartupId(startup),
      selectedWorkspace._id,
      { mentorshipRequestId: getEntityId(selectedWorkspace.mentorshipRequestId) },
    );
  }

  return (
    <Panel
      eyebrow="Mentorship Workspaces"
      title={selectedWorkspace ? startup.name || "Mentorship workspace" : "Accepted mentorships"}
    >
      {notice ? (
        <button
          type="button"
          onClick={() => setNotice("")}
          className="mt-4 w-full rounded-xl border border-primary/20 bg-primary/7 p-3 text-left text-sm"
        >
          {notice}
        </button>
      ) : null}

      {workspaces.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          {emptyBody}
        </p>
      ) : (
        <div className="mt-5 space-y-5">
          <div className="space-y-2">
            {workspaces.map((workspace) => {
              const roomStartup = workspace.relatedStartupId || {};
              const roomCounterparty = getWorkspaceCounterparty(workspace, currentUser);
              return (
                <button
                  key={workspace._id}
                  type="button"
                  onClick={() => setSelectedWorkspaceId(workspace._id)}
                  className={cn(
                    "w-full rounded-2xl border p-3 text-left transition-colors",
                    selectedWorkspace?._id === workspace._id
                      ? "border-primary bg-primary/8"
                      : "border-border bg-secondary/45 hover:bg-secondary",
                  )}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="line-clamp-1 block text-sm font-bold">
                        {roomStartup.name || "Startup"}
                      </span>
                      <span className="line-clamp-1 block text-xs text-muted-foreground">
                        {roomCounterparty?.name || "Mentorship partner"} ·{" "}
                        {workspace.mentorshipWorkspace?.progress || 0}%
                      </span>
                    </span>
                    <StatusPill status={workspace.mentorshipWorkspace?.status} />
                  </span>
                </button>
              );
            })}
          </div>

          {selectedWorkspace ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-border bg-secondary/45 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold">
                      {counterparty?.name || "Mentorship partner"}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {counterparty?.headline || counterparty?.email || "Private participant"}
                    </p>
                  </div>
                  <IconButton
                    label="Open chat"
                    icon={FiMessageSquare}
                    onClick={openWorkspaceChat}
                    disabled={!getUserId(counterparty)}
                  />
                </div>

                <p className="mt-4 line-clamp-4 text-sm leading-6 text-muted-foreground">
                  {startup.description || request.message || "Startup mentorship workspace"}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-border text-xs">
                  <Metric label="Stage" value={startup.stage || "Not set"} />
                  <Metric label="Industry" value={startup.industry || "Not set"} />
                  <Metric
                    label="Next session"
                    value={formatDate(details.nextSession?.scheduledAt)}
                  />
                  <Metric label="Progress" value={`${Number(details.progress) || 0}%`} />
                </div>
                {details.focusAreas?.length ? (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {details.focusAreas.slice(0, 10).map((area) => (
                      <span
                        key={area}
                        className="rounded-full border border-border bg-card px-2 py-1 text-[10px] font-bold"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="space-y-3">
                <SelectControl
                  label="Workspace status"
                  value={workspaceStatus}
                  onChange={(event) => setWorkspaceStatus(event.target.value)}
                >
                  {MENTORSHIP_WORKSPACE_STATUS_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </SelectControl>
                <label className="block">
                  <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Progress {progress}%
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={progress}
                    onChange={(event) => setProgress(Number(event.target.value))}
                    className="mt-3 w-full accent-primary"
                  />
                </label>
                <NexButton
                  type="button"
                  size="sm"
                  onClick={saveStatusAndProgress}
                  disabled={
                    saving === "progress" ||
                    (workspaceStatus === details.status &&
                      Number(progress) === (Number(details.progress) || 0))
                  }
                >
                  <FiCheck /> {saving === "progress" ? "Saving..." : "Save progress"}
                </NexButton>
              </div>

              <form onSubmit={saveMeeting} className="space-y-3">
                <label className="block">
                  <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Next session
                  </span>
                  <input
                    type="datetime-local"
                    value={meetingAt}
                    onChange={(event) => setMeetingAt(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-border bg-card px-3.5 text-sm outline-none focus:border-primary"
                  />
                </label>
                <Field
                  label="Session location"
                  value={meetingLocation}
                  onChange={(event) => setMeetingLocation(event.target.value)}
                  placeholder="Google Meet, Zoom, office, or phone"
                />
                <TextArea
                  label="Session agenda"
                  value={meetingAgenda}
                  onChange={(event) => setMeetingAgenda(event.target.value)}
                  placeholder="Topics for the next mentorship session"
                />
                <TextArea
                  label="Session notes"
                  value={meetingNotes}
                  onChange={(event) => setMeetingNotes(event.target.value)}
                  placeholder="Prep, decisions, and follow-ups"
                />
                <NexButton type="submit" size="sm" disabled={saving === "meeting"}>
                  <FiClock /> {saving === "meeting" ? "Saving..." : "Save session"}
                </NexButton>
              </form>

              <form onSubmit={saveNotes} className="space-y-3">
                <TextArea
                  label="Mentor notes"
                  value={mentorNotes}
                  onChange={(event) => setMentorNotes(event.target.value)}
                  placeholder="Private operating notes, observed risks, or strategy context"
                />
                <TextArea
                  label="Founder feedback"
                  value={feedback}
                  onChange={(event) => setFeedback(event.target.value)}
                  placeholder="Feedback, decisions, and advice shared with the founder"
                />
                <NexButton type="submit" size="sm" disabled={saving === "notes"}>
                  <FiFileText /> {saving === "notes" ? "Saving..." : "Save notes"}
                </NexButton>
              </form>

              <div className="grid gap-3">
                <form onSubmit={addGoal} className="space-y-3">
                  <Field
                    label="New goal"
                    value={goalTitle}
                    onChange={(event) => setGoalTitle(event.target.value)}
                    placeholder="Validate enterprise PMF with 10 buyer calls"
                  />
                  <TextArea
                    label="Goal notes"
                    value={goalNotes}
                    onChange={(event) => setGoalNotes(event.target.value)}
                    placeholder="How this goal will be measured"
                  />
                  <NexButton
                    type="submit"
                    size="sm"
                    disabled={saving === "goal" || !goalTitle.trim()}
                  >
                    <FiPlus /> {saving === "goal" ? "Adding..." : "Add goal"}
                  </NexButton>
                </form>

                <form onSubmit={addMilestone} className="space-y-3">
                  <Field
                    label="New milestone"
                    value={milestoneTitle}
                    onChange={(event) => setMilestoneTitle(event.target.value)}
                    placeholder="Investor narrative draft completed"
                  />
                  <TextArea
                    label="Milestone notes"
                    value={milestoneNotes}
                    onChange={(event) => setMilestoneNotes(event.target.value)}
                    placeholder="Deliverable, owner, and acceptance criteria"
                  />
                  <NexButton
                    type="submit"
                    size="sm"
                    disabled={saving === "milestone" || !milestoneTitle.trim()}
                  >
                    <FiUserCheck /> {saving === "milestone" ? "Adding..." : "Add milestone"}
                  </NexButton>
                </form>
              </div>

              <div className="space-y-2">
                {[...goals, ...milestones].map((item) => (
                  <article
                    key={item._id || item.title}
                    className="rounded-2xl border border-border p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-bold">{item.title}</p>
                      <StatusPill status={item.status} />
                    </div>
                    {item.notes ? (
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.notes}</p>
                    ) : null}
                  </article>
                ))}
                {goals.length + milestones.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                    Goals and milestones will appear here as the mentorship plan develops.
                  </p>
                ) : null}
              </div>

              <form onSubmit={shareResource} className="space-y-3">
                <Field
                  label="Resource title"
                  value={resourceTitle}
                  onChange={(event) => setResourceTitle(event.target.value)}
                  placeholder="Pitch teardown, GTM checklist, intro list"
                />
                <Field
                  label="Resource URL"
                  value={resourceUrl}
                  onChange={(event) => setResourceUrl(event.target.value)}
                  placeholder="https://..."
                />
                <TextArea
                  label="Resource note"
                  value={resourceNotes}
                  onChange={(event) => setResourceNotes(event.target.value)}
                  placeholder="Why this file or link matters"
                />
                <NexButton
                  type="submit"
                  size="sm"
                  disabled={saving === "resource" || !resourceTitle.trim() || !resourceUrl.trim()}
                >
                  <FiExternalLink /> {saving === "resource" ? "Sharing..." : "Share resource"}
                </NexButton>
              </form>

              <div className="space-y-2">
                {resources.map((resource) => (
                  <a
                    key={resource._id || resource.url}
                    href={resource.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-2xl border border-border p-3 text-sm transition-colors hover:bg-secondary"
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="line-clamp-1 block font-bold">{resource.title}</span>
                        <span className="line-clamp-2 block text-xs leading-5 text-muted-foreground">
                          {resource.notes || `Shared by ${resource.addedBy?.name || "participant"}`}
                        </span>
                      </span>
                      <FiExternalLink className="mt-0.5 size-4 shrink-0" />
                    </span>
                  </a>
                ))}
                {resources.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                    Shared files, playbooks, feedback docs, and warm-intro notes appear here.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </Panel>
  );
}

function StudentOpportunitiesSection({ initialView = "open", onOpenConversation }) {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState([]);
  const [applications, setApplications] = useState([]);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState("");
  const [coverMessage, setCoverMessage] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [query, setQuery] = useState("");
  const [view, setView] = useState(initialView);
  const [status, setStatus] = useState("loading");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const currentUserId = getUserId(user);

  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  const load = useCallback(async () => {
    setStatus("loading");
    setNotice("");
    try {
      const [opportunityResponse, applicationResponse] = await Promise.all([
        fetchOpportunities({ status: "open", limit: 50 }),
        fetchApplications({ asApplicant: true, limit: 50 }).catch(() => ({ data: [] })),
      ]);
      const nextOpportunities = (opportunityResponse.data || []).filter(
        (opportunity) => !isOwnStartup(opportunity.startupId, currentUserId),
      );
      const nextApplications = applicationResponse.data || [];
      const selectableIds = [
        ...nextOpportunities.map((opportunity) => getEntityId(opportunity)),
        ...nextApplications.map((application) => getEntityId(application.opportunityId)),
      ].filter(Boolean);

      setOpportunities(nextOpportunities);
      setApplications(nextApplications);
      setSelectedOpportunityId((current) =>
        selectableIds.includes(current) ? current : selectableIds[0] || "",
      );
      setStatus("ready");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not load startup projects.");
      setStatus("error");
    }
  }, [currentUserId]);

  useEffect(() => {
    load();
  }, [load]);

  const applicationByOpportunity = useMemo(() => {
    const map = new Map();
    applications.forEach((application) => {
      const opportunityId = getEntityId(application.opportunityId);
      if (opportunityId) map.set(opportunityId, application);
    });
    return map;
  }, [applications]);

  const visibleOpportunities = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return opportunities;
    return opportunities.filter((opportunity) => {
      const startup = opportunity.startupId || {};
      return [
        opportunity.title,
        opportunity.description,
        opportunity.type,
        opportunity.compensation,
        opportunity.location,
        ...(opportunity.skills || []),
        startup.name,
        startup.industry,
        startup.stage,
        startup.location,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [opportunities, query]);

  const visibleApplications = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return applications;
    return applications.filter((application) => {
      const opportunity = application.opportunityId || {};
      const startup = application.startupId || {};
      return [
        opportunity.title,
        opportunity.type,
        application.coverMessage,
        application.status,
        startup.name,
        startup.industry,
        startup.location,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [applications, query]);

  const selectedApplicationFromList = applications.find(
    (application) => getEntityId(application.opportunityId) === selectedOpportunityId,
  );
  const selectedOpportunity =
    opportunities.find((opportunity) => getEntityId(opportunity) === selectedOpportunityId) ||
    selectedApplicationFromList?.opportunityId ||
    visibleOpportunities[0] ||
    opportunities[0] ||
    null;
  const selectedApplication = selectedOpportunity
    ? applicationByOpportunity.get(getEntityId(selectedOpportunity)) || selectedApplicationFromList
    : selectedApplicationFromList;
  const acceptedApplications = applications.filter(
    (application) => application.status === "accepted",
  );

  async function showInterest(event) {
    event.preventDefault();
    if (!selectedOpportunity) return;

    const opportunityId = getEntityId(selectedOpportunity);
    if (!opportunityId || applicationByOpportunity.has(opportunityId)) return;

    setSaving(true);
    setNotice("");
    try {
      const startup = selectedOpportunity.startupId || {};
      const response = await applyToOpportunity(opportunityId, {
        coverMessage:
          coverMessage.trim() ||
          `I am interested in helping ${startup.name || "this startup"} build ${selectedOpportunity.title}.`,
        portfolioUrl: portfolioUrl.trim(),
      });
      const nextApplication = {
        ...response.data,
        opportunityId: selectedOpportunity,
        startupId: selectedOpportunity.startupId,
      };
      setApplications(upsertById(applications, nextApplication));
      setCoverMessage("");
      setNotice(`Interest sent to ${startup.name || "the founder"}.`);
      setView("applications");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not send interest.");
    } finally {
      setSaving(false);
    }
  }

  function openAcceptedChat(application) {
    if (application.status !== "accepted") return;
    const startup = application.startupId || application.opportunityId?.startupId || {};
    onOpenConversation?.(getPrimaryFounderId(startup), "startup", getStartupId(startup));
  }

  if (status === "loading") return <WorkspaceSkeleton />;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <Panel eyebrow="Startup project board" title="Open founder requests">
        {notice ? (
          <button
            type="button"
            onClick={() => setNotice("")}
            className="mt-4 w-full rounded-xl border border-primary/20 bg-primary/7 p-3 text-left text-sm"
          >
            {notice}
          </button>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          {[
            ["open", "Open projects"],
            ["applications", "My interests"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setView(value)}
              className={cn(
                "h-9 rounded-xl border px-3 text-xs font-bold transition-colors",
                view === value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card hover:bg-secondary",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="relative mt-5 block">
          <FiSearch className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search projects, skills, startups, or locations"
            className="h-11 w-full rounded-xl border border-border bg-card pr-3 pl-9 text-sm outline-none focus:border-primary"
          />
        </label>

        {view === "open" ? (
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {visibleOpportunities.map((opportunity, index) => {
              const opportunityId = getEntityId(opportunity);
              const startup = opportunity.startupId || {};
              const application = applicationByOpportunity.get(opportunityId);
              return (
                <motion.article
                  key={opportunityId}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className={cn(
                    "rounded-3xl border bg-card p-5 shadow-[var(--shadow-soft)]",
                    selectedOpportunityId === opportunityId ? "border-primary" : "border-border",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedOpportunityId(opportunityId)}
                    className="block w-full text-left"
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="flex size-11 items-center justify-center rounded-2xl bg-foreground text-sm font-bold text-background">
                        {initialsFor(startup.name || opportunity.title)}
                      </span>
                      <StatusPill status={application?.status || opportunity.type} />
                    </span>
                    <span className="mt-5 block text-lg font-bold">{opportunity.title}</span>
                    <span className="mt-1 block text-sm font-semibold text-primary">
                      {startup.name || "Startup"}
                    </span>
                    <span className="mt-2 line-clamp-3 block text-sm leading-6 text-muted-foreground">
                      {opportunity.description}
                    </span>
                    <span className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-border text-xs">
                      <Metric label="Type" value={normalizeStatus(opportunity.type)} />
                      <Metric label="Pay" value={opportunity.compensation || "TBD"} />
                      <Metric
                        label="Location"
                        value={opportunity.remote ? "Remote" : opportunity.location || "On-site"}
                      />
                      <Metric label="Status" value={normalizeStatus(opportunity.status)} />
                    </span>
                  </button>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {(opportunity.skills || []).slice(0, 5).map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full border border-border bg-secondary px-2 py-1 text-[10px] font-bold"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <IconButton
                      label={application ? "Interest sent" : "Show interest"}
                      icon={application ? FiCheck : FiSend}
                      onClick={() => setSelectedOpportunityId(opportunityId)}
                      disabled={Boolean(application)}
                    />
                    {application?.status === "accepted" ? (
                      <IconButton
                        label="Chat"
                        icon={FiMessageSquare}
                        onClick={() => openAcceptedChat(application)}
                        disabled={!getPrimaryFounderId(application.startupId || startup)}
                      />
                    ) : null}
                  </div>
                </motion.article>
              );
            })}
            {visibleOpportunities.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                No startup projects match that search.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {visibleApplications.map((application) => {
              const opportunity = application.opportunityId || {};
              const startup = application.startupId || opportunity.startupId || {};
              return (
                <article key={application._id} className="rounded-2xl border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">{opportunity.title || "Startup project"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {startup.name || "Startup"} · {normalizeStatus(opportunity.type)}
                      </p>
                    </div>
                    <StatusPill status={application.status} />
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                    {application.coverMessage}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <IconButton
                      label="View"
                      icon={FiEye}
                      onClick={() => setSelectedOpportunityId(getEntityId(opportunity))}
                    />
                    <IconButton
                      label="Chat"
                      icon={FiMessageSquare}
                      onClick={() => openAcceptedChat(application)}
                      disabled={application.status !== "accepted" || !getPrimaryFounderId(startup)}
                    />
                  </div>
                </article>
              );
            })}
            {visibleApplications.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                Your project interests will appear here after you contact a founder.
              </p>
            ) : null}
          </div>
        )}
      </Panel>

      <div className="space-y-6">
        <Panel eyebrow="Show interest" title={selectedOpportunity?.title || "Select a project"}>
          {selectedOpportunity ? (
            <div className="mt-5">
              <p className="text-sm leading-6 text-muted-foreground">
                {selectedOpportunity.description}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-border text-xs">
                <Metric label="Startup" value={selectedOpportunity.startupId?.name || "Startup"} />
                <Metric label="Type" value={normalizeStatus(selectedOpportunity.type)} />
                <Metric label="Pay" value={selectedOpportunity.compensation || "TBD"} />
                <Metric
                  label="Location"
                  value={
                    selectedOpportunity.remote
                      ? "Remote"
                      : selectedOpportunity.location || "On-site"
                  }
                />
              </div>

              {selectedApplication ? (
                <div className="mt-5 rounded-2xl border border-border bg-secondary/50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold">Interest status</p>
                    <StatusPill status={selectedApplication.status} />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {selectedApplication.status === "accepted"
                      ? "The founder accepted your interest. The project conversation is ready."
                      : "The founder has your interest and can review it from their workspace."}
                  </p>
                  <IconButton
                    label="Chat with founder"
                    icon={FiMessageSquare}
                    onClick={() => openAcceptedChat(selectedApplication)}
                    disabled={
                      selectedApplication.status !== "accepted" ||
                      !getPrimaryFounderId(
                        selectedApplication.startupId ||
                          selectedApplication.opportunityId?.startupId,
                      )
                    }
                  />
                </div>
              ) : (
                <form onSubmit={showInterest} className="mt-5 space-y-4">
                  <TextArea
                    label="Founder note"
                    value={coverMessage}
                    onChange={(event) => setCoverMessage(event.target.value)}
                    placeholder="What you can build, your availability, and relevant proof"
                  />
                  <Field
                    label="Portfolio URL"
                    value={portfolioUrl}
                    onChange={(event) => setPortfolioUrl(event.target.value)}
                    placeholder="https://..."
                  />
                  <NexButton type="submit" disabled={saving}>
                    <FiSend /> {saving ? "Sending..." : "Show interest"}
                  </NexButton>
                </form>
              )}
            </div>
          ) : (
            <p className="mt-5 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              Open startup project posts will appear here.
            </p>
          )}
        </Panel>

        <Panel eyebrow="Accepted work" title="Founder conversations">
          <div className="mt-5 space-y-3">
            {acceptedApplications.map((application) => {
              const opportunity = application.opportunityId || {};
              const startup = application.startupId || opportunity.startupId || {};
              return (
                <article key={application._id} className="rounded-2xl border border-border p-4">
                  <p className="font-bold">{opportunity.title || "Startup project"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{startup.name || "Startup"}</p>
                  <div className="mt-4">
                    <IconButton
                      label="Open chat"
                      icon={FiMessageSquare}
                      onClick={() => openAcceptedChat(application)}
                      disabled={!getPrimaryFounderId(startup)}
                    />
                  </div>
                </article>
              );
            })}
            {acceptedApplications.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                Accepted project interests will unlock founder chat here.
              </p>
            ) : null}
          </div>
        </Panel>
      </div>
    </div>
  );
}

const OPPORTUNITY_FORM_DEFAULTS = {
  title: "",
  description: "",
  type: "project",
  skillsText: "",
  compensationType: "paid",
  compensation: "",
  remote: true,
  location: "Remote",
  status: "open",
};

function OpportunitiesSection({ onOpenConversation }) {
  const [startup, setStartup] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  const [applications, setApplications] = useState([]);
  const [form, setForm] = useState(OPPORTUNITY_FORM_DEFAULTS);
  const [status, setStatus] = useState("loading");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const startupId = getStartupId(startup);

  const load = useCallback(async () => {
    setStatus("loading");
    setNotice("");
    try {
      const startupResponse = await fetchMyStartup();
      const nextStartup = startupResponse.startup || startupResponse.data || null;
      setStartup(nextStartup);

      if (!nextStartup) {
        setOpportunities([]);
        setApplications([]);
        setStatus("ready");
        return;
      }

      const [opportunityResponse, applicationResponse] = await Promise.all([
        fetchOpportunities({ startupId: getStartupId(nextStartup), status: "", limit: 50 }),
        fetchApplications({ startupId: getStartupId(nextStartup), limit: 50 }),
      ]);
      setOpportunities(opportunityResponse.data || []);
      setApplications(applicationResponse.data || []);
      setStatus("ready");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not load opportunities.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createRole(event) {
    event.preventDefault();
    if (!startupId || !form.title.trim() || !form.description.trim()) return;

    setSaving(true);
    setNotice("");
    try {
      const response = await createOpportunity(startupId, {
        ...form,
        skills: splitList(form.skillsText),
      });
      setOpportunities([response.data, ...opportunities]);
      setForm(OPPORTUNITY_FORM_DEFAULTS);
      setNotice("Opportunity created.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not create opportunity.");
    } finally {
      setSaving(false);
    }
  }

  async function setOpportunityStatus(opportunity, nextStatus) {
    setNotice("");
    try {
      const response = await updateOpportunity(opportunity._id, { status: nextStatus });
      setOpportunities(upsertById(opportunities, response.data));
      setNotice(`Opportunity marked ${normalizeStatus(nextStatus).toLowerCase()}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update opportunity.");
    }
  }

  async function reviewApplication(application, nextStatus) {
    setNotice("");
    try {
      const response = await updateApplication(application._id, { status: nextStatus });
      setApplications(upsertById(applications, response.data));
      setNotice(`Application marked ${normalizeStatus(nextStatus).toLowerCase()}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update application.");
    }
  }

  if (status === "loading") return <WorkspaceSkeleton />;
  if (!startupId) {
    return (
      <EmptyState
        title="Create your startup first"
        body="Opportunities need a startup profile so applicants know who they are joining."
      />
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <Panel eyebrow="Create opportunity" title="Define the work">
        {notice ? (
          <button
            type="button"
            onClick={() => setNotice("")}
            className="mt-4 w-full rounded-xl border border-primary/20 bg-primary/7 p-3 text-left text-sm"
          >
            {notice}
          </button>
        ) : null}
        <form onSubmit={createRole} className="mt-5 space-y-4">
          <Field
            label="Opportunity title"
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            placeholder="Founding frontend engineer intern"
            required
          />
          <TextArea
            label="Project or role details"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            placeholder="Scope, outcomes, collaboration style, and what good work looks like"
            required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectControl
              label="Project type"
              value={form.type}
              onChange={(event) => setForm({ ...form, type: event.target.value })}
            >
              {OPPORTUNITY_TYPES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectControl>
            <SelectControl
              label="Compensation"
              value={form.compensationType}
              onChange={(event) => setForm({ ...form, compensationType: event.target.value })}
            >
              {COMPENSATION_TYPES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectControl>
          </div>
          <Field
            label="Required skills"
            value={form.skillsText}
            onChange={(event) => setForm({ ...form, skillsText: event.target.value })}
            placeholder="React, Node.js, GTM, design"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Compensation details"
              value={form.compensation}
              onChange={(event) => setForm({ ...form, compensation: event.target.value })}
              placeholder="$500 stipend, equity, or negotiable"
            />
            <Field
              label="Location"
              value={form.location}
              onChange={(event) => setForm({ ...form, location: event.target.value })}
              placeholder="Remote, Bengaluru, Hybrid"
            />
          </div>
          <label className="flex items-center gap-2.5 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.remote}
              onChange={(event) => setForm({ ...form, remote: event.target.checked })}
              className="size-4 rounded border-border"
            />
            Remote friendly
          </label>
          <NexButton
            type="submit"
            disabled={saving || !form.title.trim() || !form.description.trim()}
          >
            <FiPlus /> {saving ? "Creating..." : "Create opportunity"}
          </NexButton>
        </form>
      </Panel>

      <div className="space-y-6">
        <Panel eyebrow="Open roles" title="Published opportunities">
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {opportunities.map((opportunity) => (
              <article key={opportunity._id} className="rounded-2xl border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{opportunity.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {normalizeStatus(opportunity.type)} ·{" "}
                      {opportunity.compensation || "Compensation TBD"}
                    </p>
                  </div>
                  <StatusPill status={opportunity.status} />
                </div>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                  {opportunity.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {(opportunity.skills || []).map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full border border-border bg-secondary px-2 py-1 text-[10px] font-bold"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <IconButton
                    label={opportunity.status === "open" ? "Close" : "Reopen"}
                    icon={opportunity.status === "open" ? FiArchive : FiRefreshCw}
                    onClick={() =>
                      setOpportunityStatus(
                        opportunity,
                        opportunity.status === "open" ? "closed" : "open",
                      )
                    }
                  />
                  <span className="inline-flex h-9 items-center rounded-xl bg-secondary px-3 text-xs font-bold">
                    {opportunity.applicantsCount || 0} applicants
                  </span>
                </div>
              </article>
            ))}
            {opportunities.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                Create opportunities for students, professionals, contractors, interns, or early
                team candidates.
              </p>
            ) : null}
          </div>
        </Panel>

        <Panel eyebrow="Applications" title="Review applicants">
          <div className="mt-5 space-y-3">
            {applications.map((application) => {
              const applicant = application.applicantId || {};
              const opportunity = application.opportunityId || {};
              return (
                <article key={application._id} className="rounded-2xl border border-border p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <p className="font-bold">{applicant.name || "Applicant"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {applicant.headline || "Profile headline pending"} ·{" "}
                        {opportunity.title || "Opportunity"}
                      </p>
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                        {application.coverMessage}
                      </p>
                    </div>
                    <StatusPill status={application.status} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {(applicant.skills || []).slice(0, 6).map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full border border-border bg-secondary px-2 py-1 text-[10px] font-bold"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {application.portfolioUrl ? (
                      <a
                        href={application.portfolioUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-9 items-center gap-2 rounded-xl border border-border px-3 text-xs font-bold hover:bg-secondary"
                      >
                        <FiExternalLink /> Portfolio
                      </a>
                    ) : null}
                    <IconButton
                      label="Shortlist"
                      icon={FiUserCheck}
                      onClick={() => reviewApplication(application, "shortlisted")}
                      disabled={application.status === "shortlisted"}
                    />
                    <IconButton
                      label="Accept"
                      icon={FiCheck}
                      onClick={() => reviewApplication(application, "accepted")}
                      disabled={application.status === "accepted"}
                    />
                    <IconButton
                      label="Reject"
                      icon={FiX}
                      onClick={() => reviewApplication(application, "rejected")}
                      disabled={application.status === "rejected"}
                    />
                    <IconButton
                      label="Chat"
                      icon={FiMessageSquare}
                      onClick={() =>
                        onOpenConversation?.(getUserId(applicant), "startup", startupId)
                      }
                    />
                  </div>
                </article>
              );
            })}
            {applications.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                Applications appear here with applicant profiles, skills, portfolio links, and
                review actions.
              </p>
            ) : null}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function AnalyticsSection() {
  const [status, setStatus] = useState("loading");
  const [notice, setNotice] = useState("");
  const [analytics, setAnalytics] = useState({
    startup: null,
    workspaceStats: null,
    pitches: [],
    interests: [],
    mentorships: [],
    opportunities: [],
    applications: [],
    members: [],
  });

  const load = useCallback(async () => {
    setStatus("loading");
    setNotice("");
    try {
      const startupResponse = await fetchMyStartup();
      const nextStartup = startupResponse.startup || startupResponse.data || null;
      const startupId = getStartupId(nextStartup);
      const [
        workspaceStats,
        pitches,
        interests,
        mentorships,
        opportunities,
        applications,
        members,
      ] = await Promise.all([
        fetchWorkspaceStats().catch(() => null),
        startupId
          ? fetchPitches({ startupId, status: "", limit: 50 })
          : Promise.resolve({ data: [] }),
        startupId
          ? fetchInvestmentInterests({ startupId, limit: 50 })
          : Promise.resolve({ data: [] }),
        fetchMentorshipRequests({ limit: 50 }).catch(() => ({ data: [] })),
        startupId
          ? fetchOpportunities({ startupId, status: "", limit: 50 })
          : Promise.resolve({ data: [] }),
        startupId ? fetchApplications({ startupId, limit: 50 }) : Promise.resolve({ data: [] }),
        startupId ? fetchStartupMembers(startupId) : Promise.resolve({ data: [] }),
      ]);

      setAnalytics({
        startup: nextStartup,
        workspaceStats,
        pitches: pitches.data || [],
        interests: interests.data || [],
        mentorships: mentorships.data || [],
        opportunities: opportunities.data || [],
        applications: applications.data || [],
        members: members.members || members.data || [],
      });
      setStatus("ready");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not load analytics.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const profileViews =
    analytics.workspaceStats?.metrics?.find((metric) =>
      String(metric.label).toLowerCase().includes("profile views"),
    )?.value || "0";
  const pitchViews = analytics.pitches.reduce((sum, pitch) => sum + (Number(pitch.views) || 0), 0);
  const pitchLikes = analytics.pitches.reduce(
    (sum, pitch) => sum + (Number(pitch.likesCount) || 0),
    0,
  );
  const activeMentors = analytics.mentorships.filter(
    (request) => request.status === "accepted",
  ).length;
  const openOpportunities = analytics.opportunities.filter(
    (opportunity) => opportunity.status === "open",
  ).length;
  const shortlistedApplicants = analytics.applications.filter(
    (application) => application.status === "shortlisted" || application.status === "accepted",
  ).length;

  if (status === "loading") return <WorkspaceSkeleton />;

  const metricCards = [
    {
      label: "Startup profile views",
      value: profileViews,
      note: analytics.startup?.isPublic === false ? "Unpublished" : "Public signal",
      icon: FiEye,
    },
    {
      label: "Pitch views",
      value: pitchViews,
      note: `${analytics.pitches.length} pitch versions`,
      icon: FiFileText,
    },
    {
      label: "Pitch likes",
      value: pitchLikes,
      note: "Investor and ecosystem likes",
      icon: FiHeart,
    },
    {
      label: "Investor interest",
      value: analytics.interests.length,
      note: `${analytics.interests.filter((item) => item.status === "pending").length} pending`,
      icon: FiDollarSign,
    },
    {
      label: "Mentor interest",
      value: analytics.mentorships.length,
      note: `${activeMentors} active mentors`,
      icon: FiUserCheck,
    },
    {
      label: "Opportunity applications",
      value: analytics.applications.length,
      note: `${shortlistedApplicants} shortlisted or accepted`,
      icon: FiUsers,
    },
    {
      label: "Team growth",
      value: analytics.members.length,
      note: `${openOpportunities} open opportunities`,
      icon: FiActivity,
    },
  ];

  return (
    <div className="space-y-6">
      {notice ? (
        <button
          type="button"
          onClick={() => setNotice("")}
          className="w-full rounded-xl border border-primary/20 bg-primary/7 p-3 text-left text-sm"
        >
          {notice}
        </button>
      ) : null}
      <Panel eyebrow="Founder analytics" title={analytics.startup?.name || "Startup signals"}>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((metric) => (
            <article
              key={metric.label}
              className="rounded-2xl border border-border bg-secondary/40 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-[11px] font-bold tracking-[0.1em] text-muted-foreground uppercase">
                  {metric.label}
                </p>
                <span className="flex size-9 items-center justify-center rounded-xl bg-card text-primary">
                  <metric.icon className="size-4" />
                </span>
              </div>
              <p className="mt-4 text-3xl font-semibold">{metric.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{metric.note}</p>
            </article>
          ))}
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel eyebrow="Investment" title="Pipeline health">
          <AnalyticsRows
            rows={[
              ["Pending", analytics.interests.filter((item) => item.status === "pending").length],
              ["Accepted", analytics.interests.filter((item) => item.status === "accepted").length],
              ["Rejected", analytics.interests.filter((item) => item.status === "rejected").length],
            ]}
          />
        </Panel>
        <Panel eyebrow="Mentorship" title="Mentor health">
          <AnalyticsRows
            rows={[
              ["Requested", analytics.mentorships.length],
              ["Active", activeMentors],
              [
                "Cancelled",
                analytics.mentorships.filter((item) => item.status === "cancelled").length,
              ],
            ]}
          />
        </Panel>
        <Panel eyebrow="Hiring" title="Applicant health">
          <AnalyticsRows
            rows={[
              ["Opportunities", analytics.opportunities.length],
              ["Open", openOpportunities],
              ["Applications", analytics.applications.length],
            ]}
          />
        </Panel>
      </div>
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

function MessagesSection() {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const activeIdRef = useRef("");
  const fileInputRef = useRef(null);
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [status, setStatus] = useState("loading");
  const [messageStatus, setMessageStatus] = useState("idle");
  const [socketStatus, setSocketStatus] = useState("connecting");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");

  const handleRealtimeEvent = useCallback((raw) => {
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return;
    }

    if (payload.type === "connection:ready") {
      setSocketStatus("live");
      return;
    }

    if (payload.type === "error") {
      setNotice(payload.error || "Realtime messaging failed.");
      return;
    }

    if (payload.type === "message:sent" || payload.type === "message:new") {
      if (payload.conversation) {
        setConversations((current) => upsertConversation(current, payload.conversation));
      }

      if (payload.conversationId === activeIdRef.current && payload.message) {
        setMessages((current) => appendById(current, payload.message));
      }
    }
  }, []);

  useEffect(() => {
    const socket = createMessageSocket();
    if (!socket) {
      setSocketStatus("offline");
      return undefined;
    }

    socketRef.current = socket;
    setSocketStatus("connecting");

    socket.addEventListener("open", () => {
      setSocketStatus("live");
      if (activeIdRef.current) {
        socket.send(
          JSON.stringify({ type: "conversation:join", conversationId: activeIdRef.current }),
        );
      }
    });
    socket.addEventListener("message", (event) => handleRealtimeEvent(event.data));
    socket.addEventListener("error", () => setSocketStatus("offline"));
    socket.addEventListener("close", () => setSocketStatus("offline"));

    return () => {
      socketRef.current = null;
      socket.close();
    };
  }, [handleRealtimeEvent]);

  useEffect(() => {
    let active = true;
    setStatus("loading");
    fetchConversations()
      .then((response) => {
        if (!active) return;
        const nextConversations = response.data || [];
        const preferredConversationId = sessionStorage.getItem("nexventure.activeConversationId");
        const activeConversationId = nextConversations.some(
          (conversation) => conversation._id === preferredConversationId,
        )
          ? preferredConversationId
          : nextConversations[0]?._id || "";
        setConversations(nextConversations);
        setActiveId(activeConversationId);
        if (preferredConversationId) {
          sessionStorage.removeItem("nexventure.activeConversationId");
        }
        setStatus("ready");
      })
      .catch((error) => {
        if (!active) return;
        setNotice(error instanceof Error ? error.message : "Could not load conversations.");
        setStatus("error");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    activeIdRef.current = activeId;
    setPendingAttachments([]);
    if (activeId && socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({ type: "conversation:join", conversationId: activeId }),
      );
    }
  }, [activeId]);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return undefined;
    }

    let active = true;
    setMessageStatus("loading");
    fetchConversationMessages(activeId)
      .then((response) => {
        if (!active) return;
        setMessages(response.data || []);
        setMessageStatus("ready");
      })
      .catch((error) => {
        if (!active) return;
        setNotice(error instanceof Error ? error.message : "Could not load messages.");
        setMessageStatus("error");
      });
    return () => {
      active = false;
    };
  }, [activeId]);

  const activeConversation = conversations.find((conversation) => conversation._id === activeId);
  const activeTitle = conversationTitle(activeConversation, user);
  const activeSubtitle = conversationSubtitle(activeConversation, user);

  function addPendingAttachments(event) {
    const selectedFiles = Array.from(event.target.files || []);
    setPendingAttachments((current) => [...current, ...selectedFiles].slice(0, 5));
    event.target.value = "";
  }

  function removePendingAttachment(index) {
    setPendingAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function send(event) {
    event.preventDefault();
    if ((!draft.trim() && !pendingAttachments.length) || !activeId) return;
    setSending(true);
    setNotice("");
    const content = draft.trim();
    const attachments = pendingAttachments;
    try {
      if (!attachments.length && socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: "message:send",
            conversationId: activeId,
            content,
            clientMessageId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          }),
        );
      } else {
        const response = await sendConversationMessage(activeId, content, attachments);
        setMessages((current) => appendById(current, response.data));
      }
      setDraft("");
      setPendingAttachments([]);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not send message.");
    } finally {
      setSending(false);
    }
  }

  if (status === "loading") return <WorkspaceSkeleton />;
  if (status === "ready" && conversations.length === 0) {
    return (
      <EmptyState
        title="No conversations yet"
        body="Accepted investment interests, mentorship requests, application reviews, and contact actions open chat threads here."
      />
    );
  }

  return (
    <div className="grid min-h-[620px] overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-soft)] md:grid-cols-[300px_1fr]">
      <aside className="border-b border-border bg-secondary/45 p-3 md:border-r md:border-b-0">
        <p className="px-3 py-2 text-xs font-bold tracking-wider text-muted-foreground uppercase">
          Conversations
        </p>
        {conversations.map((conversation) => {
          const title = conversationTitle(conversation, user);
          const subtitle = conversationSubtitle(conversation, user);
          return (
            <button
              key={conversation._id}
              type="button"
              onClick={() => setActiveId(conversation._id)}
              className={cn(
                "mt-1 w-full rounded-2xl p-3 text-left",
                activeId === conversation._id ? "bg-card shadow-sm" : "hover:bg-card/60",
              )}
            >
              <p className="line-clamp-1 text-sm font-bold">{title}</p>
              <p className="line-clamp-1 text-[11px] text-muted-foreground">{subtitle}</p>
            </button>
          );
        })}
      </aside>
      <section className="flex min-h-[500px] flex-col">
        <header className="border-b border-border p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-bold">{activeTitle}</p>
              <p className="text-xs text-muted-foreground">{activeSubtitle}</p>
              {activeConversation?.investmentDealRoom ? (
                <p className="mt-1 text-xs font-semibold text-primary">
                  {normalizeStatus(activeConversation.investmentDealRoom.status)} ·{" "}
                  {activeConversation.investmentDealRoom.amountRange || "Amount not set"}
                </p>
              ) : null}
              {activeConversation?.mentorshipWorkspace ? (
                <p className="mt-1 text-xs font-semibold text-primary">
                  {normalizeStatus(activeConversation.mentorshipWorkspace.status)} ·{" "}
                  {activeConversation.mentorshipWorkspace.progress || 0}% progress
                </p>
              ) : null}
            </div>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold",
                socketStatus === "live"
                  ? "bg-success/10 text-success"
                  : "bg-amber-500/10 text-amber-500",
              )}
            >
              <span className="size-1.5 rounded-full bg-current" />
              {socketStatus === "live" ? "Live" : "Fallback"}
            </span>
          </div>
        </header>
        {notice ? (
          <button
            type="button"
            onClick={() => setNotice("")}
            className="m-4 rounded-xl border border-primary/20 bg-primary/7 p-3 text-left text-sm"
          >
            {notice}
          </button>
        ) : null}
        <div className="flex-1 space-y-4 overflow-auto p-5">
          {messageStatus === "loading" ? (
            <p className="text-sm text-muted-foreground">Loading messages...</p>
          ) : null}
          {messages.map((message) => {
            const mine = getUserId(message.senderId) === getUserId(user);
            return (
              <div
                key={message._id}
                className={cn(
                  "max-w-[82%] rounded-2xl p-3 text-sm leading-6",
                  mine
                    ? "ml-auto rounded-tr-sm bg-primary text-primary-foreground"
                    : "rounded-tl-sm bg-secondary",
                )}
              >
                {message.content ? <p>{message.content}</p> : null}
                <MessageAttachments
                  attachments={message.attachments || []}
                  mine={mine}
                  hasContent={Boolean(message.content)}
                />
              </div>
            );
          })}
          {messageStatus === "ready" && messages.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              Send the first message in this thread.
            </p>
          ) : null}
        </div>
        <div className="border-t border-border p-4">
          <PendingAttachmentTray files={pendingAttachments} onRemove={removePendingAttachment} />
          <form onSubmit={send} className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={MESSAGE_ATTACHMENT_ACCEPT}
              onChange={addPendingAttachments}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!activeId || sending}
              className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-foreground transition-colors hover:bg-secondary disabled:opacity-40"
              aria-label="Attach files"
            >
              <FiPaperclip />
            </button>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Message ${activeTitle}`}
              className="h-11 flex-1 rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={sending || (!draft.trim() && !pendingAttachments.length) || !activeId}
              className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-foreground text-background disabled:opacity-40"
              aria-label="Send message"
            >
              <FiSend />
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

function PendingAttachmentTray({ files, onRemove }) {
  if (!files.length) return null;

  return (
    <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
      {files.map((file, index) => (
        <PendingAttachmentCard
          key={`${file.name}-${file.size}-${index}`}
          file={file}
          onRemove={() => onRemove(index)}
        />
      ))}
    </div>
  );
}

function PendingAttachmentCard({ file, onRemove }) {
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    if (!isImageType(file.type)) return undefined;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="relative flex min-w-[180px] max-w-[220px] items-center gap-3 rounded-2xl border border-border bg-secondary/60 p-2">
      {previewUrl ? (
        <img src={previewUrl} alt={file.name} className="size-12 rounded-xl object-cover" />
      ) : (
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-card text-muted-foreground">
          <FiFileText />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="line-clamp-1 block text-xs font-bold">{file.name}</span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground">
          {formatFileType(file.type, file.name)} · {formatFileSize(file.size)}
        </span>
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="flex size-7 shrink-0 items-center justify-center rounded-lg hover:bg-card"
        aria-label={`Remove ${file.name}`}
      >
        <FiTrash2 className="size-3.5" />
      </button>
    </div>
  );
}

function MessageAttachments({ attachments, mine, hasContent }) {
  if (!attachments.length) return null;

  return (
    <div className={cn("space-y-2", hasContent && "mt-2")}>
      {attachments.map((attachment) => (
        <MessageAttachment
          key={attachment._id || attachment.url}
          attachment={attachment}
          mine={mine}
        />
      ))}
    </div>
  );
}

function MessageAttachment({ attachment, mine }) {
  const isImage = isImageType(attachment.type);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border text-xs",
        mine ? "border-primary-foreground/20 bg-primary-foreground/10" : "border-border bg-card",
      )}
    >
      {isImage ? (
        <ProtectedAttachmentImage attachment={attachment} mine={mine} />
      ) : (
        <button
          type="button"
          onClick={() => openAttachment(attachment)}
          className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-secondary/70"
        >
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              mine ? "bg-primary-foreground/15" : "bg-secondary",
            )}
          >
            <FiFileText />
          </span>
          <span className="min-w-0 flex-1">
            <span className="line-clamp-1 block font-bold">{attachment.name}</span>
            <span
              className={cn(
                "mt-0.5 block",
                mine ? "text-primary-foreground/70" : "text-muted-foreground",
              )}
            >
              {formatFileType(attachment.type, attachment.name)} · {formatFileSize(attachment.size)}
            </span>
          </span>
          <FiExternalLink className="size-4 shrink-0" />
        </button>
      )}
    </div>
  );
}

function ProtectedAttachmentImage({ attachment, mine }) {
  const [src, setSrc] = useState("");
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let active = true;
    let objectUrl = "";
    setStatus("loading");
    fetchConversationAttachmentBlob(attachment.url)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("error");
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment.url]);

  if (status === "error") {
    return (
      <div className="flex items-center gap-3 p-3">
        <FiFileText />
        <span>Image unavailable</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => openAttachment(attachment)}
      className="block w-full text-left"
    >
      {src ? (
        <img src={src} alt={attachment.name} className="max-h-72 w-full object-cover" />
      ) : (
        <span
          className={cn(
            "flex h-36 items-center justify-center",
            mine ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        >
          Loading image...
        </span>
      )}
      <span className="flex items-center justify-between gap-3 p-2.5">
        <span className="min-w-0">
          <span className="line-clamp-1 block font-bold">{attachment.name}</span>
          <span className={mine ? "text-primary-foreground/70" : "text-muted-foreground"}>
            {formatFileSize(attachment.size)}
          </span>
        </span>
        <FiExternalLink className="size-4 shrink-0" />
      </span>
    </button>
  );
}

async function openAttachment(attachment) {
  const blob = await fetchConversationAttachmentBlob(attachment.url);
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.download = attachment.name || "attachment";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
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
  const initialRoles = user?.roles?.length
    ? user.roles
    : [user?.activeRole || user?.role || "founder"];
  const [roles, setRoles] = useState(initialRoles);
  const [activeRole, setActiveRole] = useState(user?.activeRole || user?.role || initialRoles[0]);
  const [headline, setHeadline] = useState(user?.headline || "");
  const [location, setLocation] = useState(user?.location || "");
  const [saved, setSaved] = useState(false);

  function toggle(role) {
    setSaved(false);
    setRoles((current) => {
      const next = current.includes(role)
        ? current.filter((item) => item !== role)
        : [...current, role];
      setActiveRole((currentActiveRole) =>
        next.includes(currentActiveRole) ? currentActiveRole : next[0] || "",
      );
      return next;
    });
  }

  function chooseActiveRole(role) {
    setSaved(false);
    setActiveRole(role);
  }

  async function submit(event) {
    event.preventDefault();
    if (!roles.length) return;
    await completeOnboarding({
      roles,
      activeRole: roles.includes(activeRole) ? activeRole : roles[0],
      headline,
      location,
    });
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
        {roles.length ? (
          <div>
            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Active workspace
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {roles.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => chooseActiveRole(role)}
                  className={cn(
                    "inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-bold transition-colors",
                    activeRole === role
                      ? "border-primary bg-primary/8 text-primary"
                      : "border-border bg-card hover:bg-secondary",
                  )}
                >
                  {activeRole === role ? <FiCheck className="size-4" /> : null}
                  {USER_ROLE_LABELS[role]}
                </button>
              ))}
            </div>
          </div>
        ) : null}
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

function TextArea({ label, error, className, ...props }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <textarea
        {...props}
        rows={4}
        className={cn(
          "mt-2 w-full resize-none rounded-xl border border-border bg-card px-3.5 py-3 text-sm outline-none transition-all duration-200 placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/12 disabled:opacity-60",
          error && "border-destructive focus:border-destructive focus:ring-destructive/12",
          className,
        )}
      />
      {error ? <span className="mt-1.5 block text-xs text-destructive">{error}</span> : null}
    </label>
  );
}

function SelectControl({ label, className, children, ...props }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <select
        {...props}
        className={cn(
          "mt-2 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary disabled:opacity-60",
          className,
        )}
      >
        {children}
      </select>
    </label>
  );
}

function IconButton({ label, icon: Icon, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-9 items-center gap-2 rounded-xl border border-border px-3 text-xs font-bold transition-colors hover:bg-secondary disabled:opacity-40"
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}

function StatusPill({ status }) {
  const tone = {
    accepted: "bg-success/10 text-success",
    published: "bg-success/10 text-success",
    open: "bg-success/10 text-success",
    completed: "bg-success/10 text-success",
    active: "bg-success/10 text-success",
    on_track: "bg-success/10 text-success",
    discussion: "bg-blue-500/10 text-blue-500",
    due_diligence: "bg-blue-500/10 text-blue-500",
    in_progress: "bg-blue-500/10 text-blue-500",
    negotiation: "bg-amber-500/10 text-amber-500",
    at_risk: "bg-amber-500/10 text-amber-500",
    terms_agreed: "bg-success/10 text-success",
    pending: "bg-amber-500/10 text-amber-500",
    founder_review: "bg-amber-500/10 text-amber-500",
    shortlisted: "bg-blue-500/10 text-blue-500",
    draft: "bg-blue-500/10 text-blue-500",
    rejected: "bg-destructive/10 text-destructive",
    cancelled: "bg-destructive/10 text-destructive",
    withdrawn: "bg-destructive/10 text-destructive",
    archived: "bg-muted text-muted-foreground",
    closed: "bg-muted text-muted-foreground",
  }[status];

  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold",
        tone || "bg-secondary text-muted-foreground",
      )}
    >
      {normalizeStatus(status)}
    </span>
  );
}

function AnalyticsRows({ rows }) {
  return (
    <div className="mt-5 space-y-3">
      {rows.map(([label, value]) => (
        <p
          key={label}
          className="flex items-center justify-between border-b border-border pb-3 text-sm"
        >
          <span className="text-muted-foreground">{label}</span>
          <strong>{value}</strong>
        </p>
      ))}
    </div>
  );
}

function upsertById(items, nextItem) {
  if (!nextItem) return items;
  const nextId = nextItem._id || nextItem.id;
  const exists = items.some((item) => (item._id || item.id) === nextId);
  if (!exists) return [nextItem, ...items];
  return items.map((item) => ((item._id || item.id) === nextId ? nextItem : item));
}

function appendById(items, nextItem) {
  if (!nextItem) return items;
  const nextId = nextItem._id || nextItem.id;
  if (nextId && items.some((item) => (item._id || item.id) === nextId)) return items;
  return [...items, nextItem];
}

function upsertConversation(items, nextConversation) {
  if (!nextConversation) return items;
  const nextId = nextConversation._id || nextConversation.id;
  const remaining = items.filter((item) => (item._id || item.id) !== nextId);
  return [nextConversation, ...remaining];
}

function initialsFor(name) {
  return String(name || "NV")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function normalizeInvestorDirectory(users) {
  return users.map((user) => ({
    id: getUserId(user),
    userId: getUserId(user),
    name: user.name || "Investor",
    focus: user.headline || "Investor profile",
    cheque: user.investmentRange || "Range not set",
    preference: user.interests?.length
      ? user.interests.join(", ")
      : user.bio || "Preferences not set",
    partner: user.name || "Investor",
  }));
}

function normalizeMentorDirectory(profiles, users) {
  const usersById = new Map(users.map((user) => [getUserId(user), user]));
  const fromProfiles = profiles
    .map((profile) => {
      const populatedUser =
        profile.userId && typeof profile.userId === "object" ? profile.userId : profile.user;
      const profileUserId =
        getUserId(populatedUser) || getUserId(profile.userId) || getUserId(profile.user);
      const user = populatedUser?.name ? populatedUser : usersById.get(profileUserId);
      if (!profileUserId || !user?.name) return null;

      return {
        id: profile._id || profile.id || profileUserId,
        userId: profileUserId,
        name: user.name,
        headline: user.headline || profile.headline || profile.bio || user.bio || "Mentor profile",
        expertise: profile.expertise?.length
          ? profile.expertise
          : user.skills || user.interests || [],
        availability:
          profile.availability || profile.mentorProfile?.availability || "Availability not set",
        rating: profile.rating || 5,
      };
    })
    .filter(Boolean);
  const seen = new Set(fromProfiles.map((mentor) => mentor.userId).filter(Boolean));
  const fromUsers = users
    .filter((user) => !seen.has(getUserId(user)))
    .map((user) => ({
      id: getUserId(user),
      userId: getUserId(user),
      name: user.name || "Mentor",
      headline: user.headline || user.bio || "Mentor profile",
      expertise: user.skills || user.interests || [],
      availability: "Availability not set",
      rating: 5,
    }));

  return [...fromProfiles, ...fromUsers];
}

function conversationTitle(conversation, user) {
  if (!conversation) return "Conversation";
  const currentUserId = getUserId(user);
  const otherParticipants = (conversation.participants || []).filter(
    (participant) => getUserId(participant) !== currentUserId,
  );
  if (otherParticipants.length) {
    return otherParticipants.map((participant) => participant.name || participant.email).join(", ");
  }
  return conversation.relatedStartupId?.name || "Conversation";
}

function conversationSubtitle(conversation, user) {
  if (!conversation) return "";
  const currentUserId = getUserId(user);
  const otherParticipants = (conversation.participants || []).filter(
    (participant) => getUserId(participant) !== currentUserId,
  );
  const identityLines = otherParticipants
    .map((participant) => participantIdentityLine(conversation, participant))
    .filter(Boolean);
  if (identityLines.length) return identityLines.join(", ");
  return conversation.relatedStartupId?.name || normalizeStatus(conversation.type);
}

function participantIdentityLine(conversation, participant) {
  const context = getParticipantContext(conversation, participant);
  if (context?.line) return context.line;
  const role = personRoleLabel(
    participant?.activeRole || participant?.role || participant?.roles?.[0],
  );
  const company = participant?.company || conversation?.relatedStartupId?.name || "";
  return company ? `${role} • ${company}` : role;
}

function getParticipantContext(conversation, participant) {
  if (participant?.conversationContext) return participant.conversationContext;
  const participantId = getUserId(participant);
  return (conversation?.participantContexts || []).find(
    (context) => context.userId === participantId,
  );
}

function personRoleLabel(role) {
  const labels = {
    founder: "Founder",
    investor: "Investor",
    mentor: "Mentor",
    student: "Student",
  };
  return labels[role] || normalizeStatus(role || "member");
}

function getDealRoomCounterparty(dealRoom, user) {
  if (!dealRoom) return null;
  const currentUserId = getUserId(user);
  return (dealRoom.participants || []).find(
    (participant) => getUserId(participant) !== currentUserId,
  );
}

function getWorkspaceCounterparty(workspace, user) {
  if (!workspace) return null;
  const currentUserId = getUserId(user);
  return (workspace.participants || []).find(
    (participant) => getUserId(participant) !== currentUserId,
  );
}

function getPrimaryFounderId(startup) {
  const founderIds = startup?.founderIds || [];
  const firstFounder = Array.isArray(founderIds) ? founderIds[0] : founderIds;
  return getUserId(firstFounder) || getUserId(startup?.ownerId);
}

function isOwnStartup(startup, currentUserId) {
  if (!currentUserId) return false;
  if (getUserId(startup?.ownerId) === currentUserId) return true;
  return (startup?.founderIds || []).some((founder) => getUserId(founder) === currentUserId);
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
