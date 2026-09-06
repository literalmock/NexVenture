import Startup from "../models/Startup.js";
import User from "../models/User.js";
import * as startupService from "../services/startupService.js";

const PUBLISHER_ROLES = ["founder"];

export async function listStartups(req, res, next) {
  try {
    const result = await startupService.listStartups(req.query);

    return res.json({
      success: true,
      count: result.startups.length,
      data: result.startups,
      startups: result.startups, // backwards compatibility
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getStartup(req, res, next) {
  try {
    const startup = await startupService.getStartupByIdOrSlug(req.params.id);
    if (!startup) {
      return res.status(404).json({ success: false, error: "Startup not found." });
    }
    return res.json({ success: true, data: startup, startup });
  } catch (error) {
    return next(error);
  }
}

export async function getMyStartup(req, res, next) {
  try {
    const startup = await Startup.findOne({
      $or: [{ ownerId: req.userId }, { founderIds: req.userId }],
    })
      .populate("founderIds", "name email avatarUrl headline")
      .lean();

    return res.json({ success: true, data: startup || null, startup: startup || null });
  } catch (error) {
    return next(error);
  }
}

export async function createOrUpdateStartup(req, res, next) {
  try {
    const user = await User.findById(req.userId).exec();
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    const hasPublisherRole =
      PUBLISHER_ROLES.includes(user.activeRole) ||
      PUBLISHER_ROLES.includes(user.role) ||
      (Array.isArray(user.roles) && user.roles.some((r) => PUBLISHER_ROLES.includes(r)));

    if (!hasPublisherRole && !user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: "Only founders can publish a startup listing.",
      });
    }

    const { name, description } = req.body;
    if (!name || !description) {
      return res.status(400).json({
        success: false,
        error: "Name and description are required.",
      });
    }

    const existing = await Startup.findOne({
      $or: [{ ownerId: user._id }, { founderIds: user._id }],
    });

    if (existing) {
      const updated = await startupService.updateStartup(existing._id, req.body);
      return res.json({
        success: true,
        data: updated,
        startup: updated,
        message: "Your startup listing was updated.",
      });
    }

    const created = await startupService.createStartup(user._id, req.body);
    return res.status(201).json({
      success: true,
      data: created,
      startup: created,
      message: "Your startup is now live in the public directory.",
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateStartup(req, res, next) {
  try {
    const updated = await startupService.updateStartup(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: "Startup not found." });
    }
    return res.json({ success: true, data: updated, startup: updated });
  } catch (error) {
    return next(error);
  }
}

export async function deleteStartup(req, res, next) {
  try {
    const deleted = await startupService.deleteStartup(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: "Startup not found." });
    }
    return res.json({ success: true, message: "Startup deleted successfully." });
  } catch (error) {
    return next(error);
  }
}

export async function listStartupMembers(req, res, next) {
  try {
    const members = await startupService.listStartupMembers(req.userId, req.params.startupId);
    return res.json({ success: true, data: members, members });
  } catch (error) {
    return next(error);
  }
}

export async function addStartupMember(req, res, next) {
  try {
    const member = await startupService.addStartupMember(
      req.userId,
      req.params.startupId,
      req.body,
    );
    return res.status(201).json({ success: true, data: member, member });
  } catch (error) {
    return next(error);
  }
}

export async function updateStartupMember(req, res, next) {
  try {
    const member = await startupService.updateStartupMember(
      req.userId,
      req.params.startupId,
      req.params.memberId,
      req.body,
    );
    return res.json({ success: true, data: member, member });
  } catch (error) {
    return next(error);
  }
}

export async function removeStartupMember(req, res, next) {
  try {
    const member = await startupService.removeStartupMember(
      req.userId,
      req.params.startupId,
      req.params.memberId,
    );
    return res.json({ success: true, data: member, member });
  } catch (error) {
    return next(error);
  }
}
