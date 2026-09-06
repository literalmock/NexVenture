import User from "../models/User.js";
import { USER_ROLE_VALUES } from "../utils/enums.js";
import { httpError } from "../utils/httpError.js";

export async function getUserById(id) {
  return User.findById(id).select("-passwordHash -googleSubject");
}

export async function updateUser(userId, data) {
  const allowedFields = [
    "name",
    "headline",
    "bio",
    "location",
    "avatarUrl",
    "skills",
    "interests",
    "roles",
    "activeRole",
    "role",
    "onboardingComplete",
  ];

  const update = {};
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      update[field] = data[field];
    }
  }

  if (update.roles !== undefined) {
    if (
      !Array.isArray(update.roles) ||
      update.roles.some((role) => !USER_ROLE_VALUES.includes(role))
    ) {
      throw httpError(400, "Choose at least one valid account role.");
    }

    update.roles = normalizeRoles(update.roles);
    if (!update.roles.length) {
      throw httpError(400, "Choose at least one valid account role.");
    }
  }

  if (update.role !== undefined && update.activeRole === undefined) {
    update.activeRole = update.role;
  }

  if (update.activeRole !== undefined) {
    if (!USER_ROLE_VALUES.includes(update.activeRole)) {
      throw httpError(400, "Choose a valid active role.");
    }

    if (update.roles?.length) {
      update.roles = normalizeRoles([...update.roles, update.activeRole]);
    } else {
      const existing = await User.findById(userId);
      const rolesSet = new Set(existing?.roles?.length ? existing.roles : [existing?.role]);
      rolesSet.add(update.activeRole);
      update.roles = normalizeRoles(Array.from(rolesSet));
    }

    update.role = update.activeRole;
  } else if (update.roles?.length) {
    const existing = await User.findById(userId);
    update.activeRole = update.roles.includes(existing?.activeRole)
      ? existing.activeRole
      : update.roles[0];
    update.role = update.activeRole;
  }

  const updatedUser = await User.findByIdAndUpdate(userId, update, {
    returnDocument: "after",
    runValidators: true,
  }).select("-passwordHash -googleSubject");

  return updatedUser;
}

export async function listUsers({ role, skill, search, excludeUserId, page = 1, limit = 20 }) {
  const filter = { isSuspended: { $ne: true } };
  const andFilters = [];

  if (excludeUserId) {
    filter._id = { $ne: excludeUserId };
  }

  if (role && role !== "all") {
    andFilters.push({ $or: [{ activeRole: role }, { roles: role }, { role }] });
  }

  if (skill) {
    filter.skills = { $regex: new RegExp(skill, "i") };
  }

  if (search) {
    const searchRegex = new RegExp(search, "i");
    andFilters.push({
      $or: [
        { name: searchRegex },
        { headline: searchRegex },
        { bio: searchRegex },
        { skills: searchRegex },
      ],
    });
  }

  if (andFilters.length) {
    filter.$and = andFilters;
  }

  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    User.find(filter)
      .select("-passwordHash -googleSubject")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    User.countDocuments(filter),
  ]);

  return {
    users,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      hasNext: skip + users.length < total,
    },
  };
}

function normalizeRoles(roles) {
  if (!Array.isArray(roles)) return [];
  return [...new Set(roles)].filter((role) => USER_ROLE_VALUES.includes(role));
}
