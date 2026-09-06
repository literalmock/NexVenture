import Startup from "../models/Startup.js";
import StartupMembership from "../models/StartupMembership.js";
import User from "../models/User.js";

/**
 * Ensures the authenticated user has a specific role (in their `roles` array or matches `activeRole`).
 */
export function requireRole(role) {
  return async (req, res, next) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ success: false, error: "Authentication required." });
      }

      const user = req.currentUser || (await User.findById(req.userId));
      if (!user) {
        return res.status(401).json({ success: false, error: "User not found." });
      }

      req.currentUser = user;

      const hasRole =
        user.activeRole === role || (Array.isArray(user.roles) && user.roles.includes(role));
      if (!hasRole && !user.isAdmin) {
        return res.status(403).json({
          success: false,
          error: `Access denied. Role '${role}' is required for this action.`,
        });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}

/**
 * Ensures the authenticated user has at least one of the specified roles.
 */
export function requireAnyRole(roles) {
  return async (req, res, next) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ success: false, error: "Authentication required." });
      }

      const user = req.currentUser || (await User.findById(req.userId));
      if (!user) {
        return res.status(401).json({ success: false, error: "User not found." });
      }

      req.currentUser = user;

      const hasAny =
        roles.includes(user.activeRole) ||
        (Array.isArray(user.roles) && user.roles.some((r) => roles.includes(r)));

      if (!hasAny && !user.isAdmin) {
        return res.status(403).json({
          success: false,
          error: `Access denied. One of roles [${roles.join(", ")}] is required.`,
        });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}

export async function requireAdmin(req, res, next) {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, error: "Authentication required." });
    }

    const user = req.currentUser || (await User.findById(req.userId));
    if (!user) {
      return res.status(401).json({ success: false, error: "User not found." });
    }

    req.currentUser = user;

    if (!user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: "Admin access is required for this action.",
      });
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

/**
 * Ensures the authenticated user is the founder / creator of the startup in req.params.startupId or req.params.id
 */
export async function requireStartupFounder(req, res, next) {
  try {
    const startupId = req.params.startupId || req.params.id;
    if (!startupId) {
      return res.status(400).json({ success: false, error: "Startup identifier missing." });
    }

    const startup = await Startup.findOne({
      $or: [
        { _id: startupId.match(/^[0-9a-fA-F]{24}$/) ? startupId : null },
        { slug: startupId.toLowerCase() },
        { id: startupId },
      ].filter(Boolean),
    });

    if (!startup) {
      return res.status(404).json({ success: false, error: "Startup not found." });
    }

    const isFounder =
      startup.founderIds?.some((id) => id.toString() === req.userId.toString()) ||
      startup.ownerId?.toString() === req.userId.toString();

    if (!isFounder) {
      // Also check startup membership
      const membership = await StartupMembership.findOne({
        startupId: startup._id,
        userId: req.userId,
        role: { $in: ["founder", "cofounder"] },
        status: "active",
      });

      if (!membership) {
        return res.status(403).json({
          success: false,
          error: "Only the startup founder can perform this action.",
        });
      }
    }

    req.startup = startup;
    return next();
  } catch (error) {
    return next(error);
  }
}

/**
 * Ensures the authenticated user is a member of the startup.
 */
export async function requireStartupMember(req, res, next) {
  try {
    const startupId = req.params.startupId || req.params.id;
    if (!startupId) {
      return res.status(400).json({ success: false, error: "Startup identifier missing." });
    }

    const startup = await Startup.findOne({
      $or: [
        { _id: startupId.match(/^[0-9a-fA-F]{24}$/) ? startupId : null },
        { slug: startupId.toLowerCase() },
        { id: startupId },
      ].filter(Boolean),
    });

    if (!startup) {
      return res.status(404).json({ success: false, error: "Startup not found." });
    }

    const isDirectFounder =
      startup.founderIds?.some((id) => id.toString() === req.userId.toString()) ||
      startup.ownerId?.toString() === req.userId.toString();

    if (isDirectFounder) {
      req.startup = startup;
      return next();
    }

    const membership = await StartupMembership.findOne({
      startupId: startup._id,
      userId: req.userId,
      status: "active",
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        error: "You must be an active member of this startup to perform this action.",
      });
    }

    req.startup = startup;
    req.membership = membership;
    return next();
  } catch (error) {
    return next(error);
  }
}
