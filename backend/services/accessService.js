import Startup from "../models/Startup.js";
import StartupMembership from "../models/StartupMembership.js";
import { httpError } from "../utils/httpError.js";

const FOUNDER_MEMBERSHIP_ROLES = ["founder", "cofounder"];

export function sameId(left, right) {
  if (!left || !right) return false;
  return left.toString() === right.toString();
}

export async function canManageStartup(userId, startupOrId, { founderOnly = false } = {}) {
  if (!userId || !startupOrId) return false;

  const startup =
    startupOrId._id || startupOrId.founderIds || startupOrId.ownerId
      ? startupOrId
      : await Startup.findById(startupOrId).select("ownerId founderIds").exec();

  if (!startup) return false;

  if (sameId(startup.ownerId, userId)) return true;
  if ((startup.founderIds || []).some((founderId) => sameId(founderId, userId))) return true;

  const membershipFilter = {
    startupId: startup._id || startupOrId,
    userId,
    status: "active",
  };

  if (founderOnly) {
    membershipFilter.role = { $in: FOUNDER_MEMBERSHIP_ROLES };
  }

  return Boolean(await StartupMembership.exists(membershipFilter));
}

export async function requireCanManageStartup(userId, startupOrId, options) {
  if (await canManageStartup(userId, startupOrId, options)) return;
  throw httpError(403, "You are not allowed to manage this startup.");
}
