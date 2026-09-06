export const USER_ROLES = Object.freeze({
  FOUNDER: "founder",
  INVESTOR: "investor",
  MENTOR: "mentor",
  STUDENT: "student",
});

export const USER_ROLE_VALUES = Object.freeze(Object.values(USER_ROLES));

export const STARTUP_STAGES = Object.freeze({
  IDEA: "idea",
  PRE_SEED: "pre_seed",
  SEED: "seed",
  EARLY_STAGE: "early_stage",
  GROWTH: "growth",
  SERIES_A: "series_a",
  SERIES_B_PLUS: "series_b_plus",
  SCALE: "scale",
});

export const STARTUP_STATUS = Object.freeze({
  ACTIVE: "active",
  FUNDED: "funded",
  ACQUIRED: "acquired",
  CLOSED: "closed",
});

export const MEMBERSHIP_ROLES = Object.freeze({
  FOUNDER: "founder",
  COFOUNDER: "cofounder",
  EMPLOYEE: "employee",
  CONTRIBUTOR: "contributor",
});

export const MEMBERSHIP_STATUS = Object.freeze({
  PENDING: "pending",
  ACTIVE: "active",
  REMOVED: "removed",
});

export const PITCH_STATUS = Object.freeze({
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived",
});

export const INVESTMENT_STATUS = Object.freeze({
  PENDING: "pending",
  FOUNDER_REVIEW: "founder_review",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  WITHDRAWN: "withdrawn",
});

export const INVESTMENT_DEAL_STATUS = Object.freeze({
  ACCEPTED: "accepted",
  DISCUSSION: "discussion",
  DUE_DILIGENCE: "due_diligence",
  NEGOTIATION: "negotiation",
  TERMS_AGREED: "terms_agreed",
  COMPLETED: "completed",
});

export const MENTORSHIP_STATUS = Object.freeze({
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
});

export const MENTORSHIP_INITIATORS = Object.freeze({
  FOUNDER: "founder",
  MENTOR: "mentor",
});

export const MENTORSHIP_WORKSPACE_STATUS = Object.freeze({
  ACTIVE: "active",
  IN_PROGRESS: "in_progress",
  ON_TRACK: "on_track",
  AT_RISK: "at_risk",
  COMPLETED: "completed",
});

export const MENTORSHIP_ITEM_STATUS = Object.freeze({
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
});

export const OPPORTUNITY_TYPES = Object.freeze({
  INTERNSHIP: "internship",
  FREELANCE: "freelance",
  PART_TIME: "part_time",
  FULL_TIME: "full_time",
  PROJECT: "project",
});

export const COMPENSATION_TYPES = Object.freeze({
  PAID: "paid",
  UNPAID: "unpaid",
  EQUITY: "equity",
  NEGOTIABLE: "negotiable",
});

export const APPLICATION_STATUS = Object.freeze({
  PENDING: "pending",
  SHORTLISTED: "shortlisted",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  WITHDRAWN: "withdrawn",
});

export const CONNECTION_STATUS = Object.freeze({
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  BLOCKED: "blocked",
});

export const POST_TYPES = Object.freeze({
  TEXT: "text",
  STARTUP_UPDATE: "startup_update",
  ACHIEVEMENT: "achievement",
  OPPORTUNITY: "opportunity",
  ANNOUNCEMENT: "announcement",
});

export const CONVERSATION_TYPES = Object.freeze({
  DIRECT: "direct",
  STARTUP: "startup",
  INVESTMENT: "investment",
  MENTORSHIP: "mentorship",
});
