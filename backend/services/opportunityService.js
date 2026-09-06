import Opportunity from "../models/Opportunity.js";
import Startup from "../models/Startup.js";
import { requireCanManageStartup } from "./accessService.js";
import { httpError } from "../utils/httpError.js";

export async function createOpportunity(userId, startupId, data) {
  const startup = await Startup.findOne({
    $or: [{ _id: startupId.match(/^[0-9a-fA-F]{24}$/) ? startupId : null }, { slug: startupId }],
  });

  if (!startup) throw new Error("Startup not found.");
  await requireCanManageStartup(userId, startup);

  const opportunity = await Opportunity.create({
    ...data,
    startupId: startup._id,
    createdBy: userId,
  });

  return opportunity;
}

export async function listOpportunities({
  startupId,
  type,
  skill,
  search,
  remote,
  status = "open",
  page = 1,
  limit = 20,
}) {
  const filter = {};
  if (status) filter.status = status;

  if (startupId) {
    const startup = await Startup.findOne({
      $or: [{ _id: startupId.match(/^[0-9a-fA-F]{24}$/) ? startupId : null }, { slug: startupId }],
    });
    if (startup) filter.startupId = startup._id;
  }

  if (type && type !== "all") filter.type = type;
  if (remote === "true" || remote === true) filter.remote = true;
  if (skill) filter.skills = new RegExp(skill, "i");

  if (search) {
    const regex = new RegExp(search, "i");
    filter.$or = [{ title: regex }, { description: regex }, { skills: regex }, { location: regex }];
  }

  const skip = (page - 1) * limit;
  const [opportunities, total] = await Promise.all([
    Opportunity.find(filter)
      .populate("startupId", "name slug logoUrl industry stage location founderIds ownerId")
      .populate("createdBy", "name email avatarUrl headline")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Opportunity.countDocuments(filter),
  ]);

  return {
    opportunities,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      hasNext: skip + opportunities.length < total,
    },
  };
}

export async function getOpportunityById(id) {
  return Opportunity.findById(id)
    .populate(
      "startupId",
      "name slug logoUrl industry stage location description website founder founderIds ownerId",
    )
    .populate("createdBy", "name email avatarUrl headline bio");
}

export async function updateOpportunity(userId, id, data) {
  const opportunity = await Opportunity.findById(id).select("startupId").exec();
  if (!opportunity) throw httpError(404, "Opportunity not found.");

  await requireCanManageStartup(userId, opportunity.startupId);

  return Opportunity.findByIdAndUpdate(id, data, {
    returnDocument: "after",
    runValidators: true,
  });
}

export async function deleteOpportunity(userId, id) {
  const opportunity = await Opportunity.findById(id).select("startupId").exec();
  if (!opportunity) throw httpError(404, "Opportunity not found.");

  await requireCanManageStartup(userId, opportunity.startupId);

  return Opportunity.findByIdAndDelete(id);
}
