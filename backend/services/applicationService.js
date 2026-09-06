import Application from "../models/Application.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import Opportunity from "../models/Opportunity.js";
import Startup from "../models/Startup.js";
import User from "../models/User.js";
import { httpError } from "../utils/httpError.js";
import { requireCanManageStartup, sameId } from "./accessService.js";
import { createNotification } from "./notificationService.js";

export async function applyToOpportunity(applicantId, opportunityId, data) {
  const opportunity = await Opportunity.findById(opportunityId).populate("startupId");
  if (!opportunity) throw new Error("Opportunity not found.");
  if (opportunity.status !== "open") throw httpError(409, "This opportunity is closed.");

  const applicant = await User.findById(applicantId);
  if (
    sameId(opportunity.startupId.ownerId, applicantId) ||
    (opportunity.startupId.founderIds || []).some((founderId) => sameId(founderId, applicantId))
  ) {
    throw httpError(403, "You cannot apply to your own startup opportunity.");
  }

  const existing = await Application.findOne({ opportunityId, applicantId });
  if (existing) {
    throw httpError(409, "You have already shown interest in this opportunity.");
  }

  const application = await Application.create({
    opportunityId,
    startupId: opportunity.startupId._id,
    applicantId,
    coverMessage: data.coverMessage,
    portfolioUrl: data.portfolioUrl || applicant.portfolioUrl || "",
    resumeUrl: data.resumeUrl || "",
    status: "pending",
  });

  await Opportunity.findByIdAndUpdate(opportunityId, { $inc: { applicantsCount: 1 } });

  // Notify startup creator / founders
  const founders = opportunity.startupId.founderIds?.length
    ? opportunity.startupId.founderIds
    : [opportunity.createdBy];

  for (const founderId of founders) {
    if (founderId) {
      await createNotification({
        recipientId: founderId,
        senderId: applicantId,
        type: "application",
        entityType: "application",
        entityId: application._id,
        title: `New Applicant for ${opportunity.title}`,
        message: `${applicant.name} applied for "${opportunity.title}".`,
        startupId: opportunity.startupId._id.toString(),
        startupName: opportunity.startupId.name,
      });
    }
  }

  return application;
}

export async function listApplications({
  opportunityId,
  startupId,
  applicantId,
  status,
  page = 1,
  limit = 20,
}) {
  const filter = {};
  if (opportunityId) filter.opportunityId = opportunityId;
  if (startupId) {
    const startup = await Startup.findOne({
      $or: [{ _id: startupId.match(/^[0-9a-fA-F]{24}$/) ? startupId : null }, { slug: startupId }],
    });
    if (startup) filter.startupId = startup._id;
  }
  if (applicantId) filter.applicantId = applicantId;
  if (status) filter.status = status;

  const skip = (page - 1) * limit;
  const [applications, total] = await Promise.all([
    Application.find(filter)
      .populate("applicantId", "name email avatarUrl headline bio location skills interests")
      .populate("opportunityId", "title type compensation remote location skills")
      .populate("startupId", "name slug logoUrl stage industry location founderIds ownerId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Application.countDocuments(filter),
  ]);

  return {
    applications,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      hasNext: skip + applications.length < total,
    },
  };
}

export async function updateApplicationStatus(applicationId, userId, { status, feedback }) {
  const application = await Application.findById(applicationId)
    .populate("opportunityId")
    .populate("startupId");

  if (!application) throw httpError(404, "Application not found.");

  if (sameId(application.applicantId, userId)) {
    if (status !== "withdrawn") {
      throw httpError(403, "Applicants can only withdraw their own applications.");
    }
  } else {
    await requireCanManageStartup(userId, application.startupId);
  }

  application.status = status;
  if (feedback !== undefined) application.feedback = feedback;
  await application.save();

  if (status === "accepted") {
    let conversation = await Conversation.findOne({
      participants: { $all: [application.applicantId, userId] },
      type: "startup",
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [application.applicantId, userId],
        type: "startup",
        relatedStartupId: application.startupId?._id || null,
        lastMessage: "Application accepted.",
        lastMessageAt: new Date(),
      });

      await Message.create({
        conversationId: conversation._id,
        senderId: userId,
        content: `Congratulations! Your application for "${application.opportunityId?.title || "our opportunity"}" at ${application.startupId?.name || "our startup"} has been accepted!`,
      });
    }

    await createNotification({
      recipientId: application.applicantId,
      senderId: userId,
      type: "application_status",
      entityType: "application",
      entityId: application._id,
      title: "Application Accepted!",
      message: `Your application for "${application.opportunityId?.title}" has been accepted!`,
    });
  } else if (status === "shortlisted") {
    await createNotification({
      recipientId: application.applicantId,
      senderId: userId,
      type: "application_status",
      entityType: "application",
      entityId: application._id,
      title: "Application Shortlisted!",
      message: `You've been shortlisted for "${application.opportunityId?.title}"!`,
    });
  }

  return application;
}
