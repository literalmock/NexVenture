import Pitch from "../models/Pitch.js";
import Startup from "../models/Startup.js";
import StartupMembership from "../models/StartupMembership.js";
import User from "../models/User.js";
import { MEMBERSHIP_ROLES, MEMBERSHIP_STATUS } from "../utils/enums.js";
import { httpError } from "../utils/httpError.js";
import { requireCanManageStartup, sameId } from "./accessService.js";

function generateSlug(name) {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") +
    "-" +
    Math.random().toString(36).substring(2, 6)
  );
}

export async function createStartup(userId, data) {
  const user = await User.findById(userId);
  const slug = data.slug || generateSlug(data.name);

  const startup = await Startup.create({
    ...data,
    slug,
    founder: user ? user.name : data.founder || "Founder",
    founderIds: [userId],
    ownerId: userId,
  });

  // Create founder membership
  await StartupMembership.create({
    startupId: startup._id,
    userId,
    role: "founder",
    title: data.founderRole || "Founder & CEO",
    status: "active",
  });

  // Link to user
  await User.findByIdAndUpdate(userId, { linkedStartupId: startup._id.toString() });

  return startup;
}

export async function listStartups({
  industry,
  stage,
  location,
  search,
  hiring,
  founderId,
  sort = "newest",
  page = 1,
  limit = 20,
}) {
  const filter = { isPublic: { $ne: false } };

  if (founderId) {
    filter.$or = [{ founderIds: founderId }, { ownerId: founderId }];
  }

  if (industry && industry !== "All" && industry !== "all") {
    filter.industry = new RegExp(industry, "i");
  }

  if (stage && stage !== "All" && stage !== "all") {
    filter.stage = new RegExp(stage, "i");
  }

  if (location && location !== "All" && location !== "all") {
    filter.location = new RegExp(location, "i");
  }

  if (hiring === "true" || hiring === true) {
    filter.hiring = true;
  }

  if (search) {
    const searchRegex = new RegExp(search, "i");
    filter.$or = [
      { name: searchRegex },
      { tagline: searchRegex },
      { description: searchRegex },
      { industry: searchRegex },
      { problem: searchRegex },
      { solution: searchRegex },
    ];
  }

  let sortCriteria = { createdAt: -1 };
  if (sort === "growth") sortCriteria = { growth: -1 };
  if (sort === "team") sortCriteria = { team: -1 };
  if (sort === "oldest") sortCriteria = { createdAt: 1 };

  const skip = (page - 1) * limit;
  const [startups, total] = await Promise.all([
    Startup.find(filter)
      .populate("founderIds", "name email avatarUrl headline bio")
      .populate("ownerId", "name email avatarUrl")
      .sort(sortCriteria)
      .skip(skip)
      .limit(Number(limit)),
    Startup.countDocuments(filter),
  ]);

  return {
    startups,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      hasNext: skip + startups.length < total,
    },
  };
}

export async function getStartupByIdOrSlug(idOrSlug) {
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(idOrSlug);
  const filter = isObjectId
    ? { $or: [{ _id: idOrSlug }, { slug: idOrSlug.toLowerCase() }, { id: idOrSlug }] }
    : { $or: [{ slug: idOrSlug.toLowerCase() }, { id: idOrSlug }] };

  const startup = await Startup.findOne(filter)
    .populate("founderIds", "name email avatarUrl headline bio skills")
    .populate("ownerId", "name email avatarUrl headline bio");

  if (!startup) return null;

  // Also fetch published pitch if exists
  const pitch = await Pitch.findOne({ startupId: startup._id, status: "published" });
  const members = await StartupMembership.find({
    startupId: startup._id,
    status: "active",
  }).populate("userId", "name email avatarUrl headline");

  return {
    ...startup.toObject(),
    publishedPitch: pitch,
    members,
  };
}

export async function updateStartup(idOrSlug, data) {
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(idOrSlug);
  const filter = isObjectId
    ? { $or: [{ _id: idOrSlug }, { slug: idOrSlug.toLowerCase() }, { id: idOrSlug }] }
    : { $or: [{ slug: idOrSlug.toLowerCase() }, { id: idOrSlug }] };

  return Startup.findOneAndUpdate(filter, data, {
    returnDocument: "after",
    runValidators: true,
  });
}

export async function deleteStartup(idOrSlug) {
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(idOrSlug);
  const filter = isObjectId
    ? { $or: [{ _id: idOrSlug }, { slug: idOrSlug.toLowerCase() }, { id: idOrSlug }] }
    : { $or: [{ slug: idOrSlug.toLowerCase() }, { id: idOrSlug }] };

  return Startup.findOneAndDelete(filter);
}

export async function listStartupMembers(userId, startupId) {
  const startup = await findStartupByIdOrSlug(startupId);
  if (!startup) throw httpError(404, "Startup not found.");

  await requireCanManageStartup(userId, startup);

  return StartupMembership.find({
    startupId: startup._id,
    status: { $ne: MEMBERSHIP_STATUS.REMOVED },
  })
    .populate("userId", "name email avatarUrl headline activeRole roles")
    .sort({ createdAt: 1 });
}

export async function addStartupMember(userId, startupId, data) {
  const startup = await findStartupByIdOrSlug(startupId);
  if (!startup) throw httpError(404, "Startup not found.");

  await requireCanManageStartup(userId, startup, { founderOnly: true });

  const memberUser = await findMemberUser(data);
  if (!memberUser) {
    throw httpError(404, "Team member must have an existing NexVenture account.");
  }

  const role = normalizeMembershipRole(data.role);
  const membership = await StartupMembership.findOneAndUpdate(
    { startupId: startup._id, userId: memberUser._id },
    {
      startupId: startup._id,
      userId: memberUser._id,
      role,
      title: clean(data.title, 80) || titleForRole(role),
      permissions: normalizePermissions(data.permissions, role),
      status: MEMBERSHIP_STATUS.ACTIVE,
    },
    {
      returnDocument: "after",
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  );

  await syncFounderAccess(startup, memberUser._id, role, MEMBERSHIP_STATUS.ACTIVE);
  await User.findByIdAndUpdate(memberUser._id, { linkedStartupId: startup._id.toString() });

  return populateMembership(membership);
}

export async function updateStartupMember(userId, startupId, membershipId, data) {
  const startup = await findStartupByIdOrSlug(startupId);
  if (!startup) throw httpError(404, "Startup not found.");

  await requireCanManageStartup(userId, startup, { founderOnly: true });

  const membership = await StartupMembership.findOne({
    _id: membershipId,
    startupId: startup._id,
  });
  if (!membership) throw httpError(404, "Startup member not found.");

  if (sameId(membership.userId, startup.ownerId) && data.status === MEMBERSHIP_STATUS.REMOVED) {
    throw httpError(400, "The startup owner cannot be removed from the team.");
  }

  if (data.role !== undefined) membership.role = normalizeMembershipRole(data.role);
  if (data.title !== undefined) membership.title = clean(data.title, 80);
  if (data.permissions !== undefined) {
    membership.permissions = normalizePermissions(data.permissions, membership.role);
  }
  if (data.status !== undefined) {
    membership.status = normalizeMembershipStatus(data.status);
  }

  await membership.save();
  await syncFounderAccess(startup, membership.userId, membership.role, membership.status);

  return populateMembership(membership);
}

export async function removeStartupMember(userId, startupId, membershipId) {
  return updateStartupMember(userId, startupId, membershipId, {
    status: MEMBERSHIP_STATUS.REMOVED,
  });
}

function findStartupByIdOrSlug(idOrSlug) {
  const raw = String(idOrSlug || "").trim();
  const clauses = [{ slug: raw.toLowerCase() }, { id: raw }];
  if (/^[0-9a-fA-F]{24}$/.test(raw)) clauses.unshift({ _id: raw });
  return Startup.findOne({ $or: clauses });
}

function findMemberUser(data) {
  if (data.userId && /^[0-9a-fA-F]{24}$/.test(String(data.userId))) {
    return User.findById(data.userId);
  }
  const email = clean(data.email, 160).toLowerCase();
  if (email) return User.findOne({ email });
  return null;
}

function normalizeMembershipRole(role) {
  const fallback = MEMBERSHIP_ROLES.CONTRIBUTOR;
  const value = clean(role, 40).toLowerCase() || fallback;
  return Object.values(MEMBERSHIP_ROLES).includes(value) ? value : fallback;
}

function normalizeMembershipStatus(status) {
  const value = clean(status, 40).toLowerCase();
  if (Object.values(MEMBERSHIP_STATUS).includes(value)) return value;
  throw httpError(400, "Invalid membership status.");
}

function normalizePermissions(permissions, role) {
  if (Array.isArray(permissions) && permissions.length) {
    return [...new Set(permissions.map((item) => clean(item, 40)).filter(Boolean))].slice(0, 12);
  }
  if ([MEMBERSHIP_ROLES.FOUNDER, MEMBERSHIP_ROLES.COFOUNDER].includes(role)) {
    return ["read", "write", "admin"];
  }
  if (role === MEMBERSHIP_ROLES.EMPLOYEE) return ["read", "write"];
  return ["read"];
}

async function syncFounderAccess(startup, memberUserId, role, status) {
  const grantsFounderAccess =
    status === MEMBERSHIP_STATUS.ACTIVE &&
    [MEMBERSHIP_ROLES.FOUNDER, MEMBERSHIP_ROLES.COFOUNDER].includes(role);

  if (grantsFounderAccess) {
    await Startup.findByIdAndUpdate(startup._id, { $addToSet: { founderIds: memberUserId } });
    return;
  }

  if (!sameId(memberUserId, startup.ownerId)) {
    await Startup.findByIdAndUpdate(startup._id, { $pull: { founderIds: memberUserId } });
  }
}

function titleForRole(role) {
  if (role === MEMBERSHIP_ROLES.FOUNDER) return "Founder";
  if (role === MEMBERSHIP_ROLES.COFOUNDER) return "Co-founder";
  if (role === MEMBERSHIP_ROLES.EMPLOYEE) return "Team member";
  return "Contributor";
}

function populateMembership(membership) {
  return membership.populate("userId", "name email avatarUrl headline activeRole roles");
}

function clean(value, maxLength) {
  return String(value || "")
    .trim()
    .slice(0, maxLength);
}
