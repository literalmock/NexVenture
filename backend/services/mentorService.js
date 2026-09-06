import Conversation from "../models/Conversation.js";
import MentorProfile from "../models/MentorProfile.js";
import MentorshipRequest from "../models/MentorshipRequest.js";
import Message from "../models/Message.js";
import Startup from "../models/Startup.js";
import User from "../models/User.js";
import {
  MENTORSHIP_INITIATORS,
  MENTORSHIP_ITEM_STATUS,
  MENTORSHIP_STATUS,
  MENTORSHIP_WORKSPACE_STATUS,
} from "../utils/enums.js";
import { httpError } from "../utils/httpError.js";
import { canManageStartup, requireCanManageStartup, sameId } from "./accessService.js";
import { createNotification } from "./notificationService.js";

export async function listMentors({ expertise, industry, search, page = 1, limit = 20 }) {
  const filter = {};
  if (expertise) filter.expertise = new RegExp(expertise, "i");
  if (industry) filter.industries = new RegExp(industry, "i");

  const skip = (page - 1) * limit;

  let userIds = null;
  if (search) {
    const matchedUsers = await User.find({
      $or: [{ name: new RegExp(search, "i") }, { headline: new RegExp(search, "i") }],
    }).select("_id");
    userIds = matchedUsers.map((u) => u._id);
    filter.userId = { $in: userIds };
  }

  const mentorProfiles = await MentorProfile.find(filter)
    .populate(
      "userId",
      "name email avatarUrl headline bio location skills interests activeRole role roles linkedStartupId isSuspended",
    )
    .sort({ rating: -1, experience: -1 });
  const mentors = mentorProfiles
    .filter((mentor) => mentor.userId && mentor.userId.isSuspended !== true)
    .map(normalizeMentorDirectoryEntry);
  const pagedMentors = mentors.slice(skip, skip + Number(limit));

  return {
    mentors: pagedMentors,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: mentors.length,
      hasNext: skip + pagedMentors.length < mentors.length,
    },
  };
}

export async function getMentorById(mentorIdOrUserId) {
  const mentor = await MentorProfile.findOne({
    $or: [
      { _id: mentorIdOrUserId.match(/^[0-9a-fA-F]{24}$/) ? mentorIdOrUserId : null },
      { userId: mentorIdOrUserId.match(/^[0-9a-fA-F]{24}$/) ? mentorIdOrUserId : null },
    ].filter(Boolean),
  }).populate(
    "userId",
    "name email avatarUrl headline bio location skills interests activeRole role roles linkedStartupId isSuspended",
  );

  if (!mentor?.userId) return null;
  return normalizeMentorDirectoryEntry(mentor);
}

function normalizeMentorDirectoryEntry(mentorProfile) {
  const mentor =
    typeof mentorProfile.toObject === "function" ? mentorProfile.toObject() : mentorProfile;
  const user = mentor.userId;
  const expertise = mentor.expertise?.length ? mentor.expertise : user.skills || [];

  return {
    ...mentor,
    id: mentor._id,
    user,
    userId: user,
    name: user.name,
    headline: user.headline || mentor.bio || user.bio || "Mentor profile",
    expertise,
    bio: mentor.bio || user.bio || "",
    availability: mentor.availability || "Availability not set",
    rating: mentor.rating || 5,
  };
}

export async function updateMentorProfile(userId, data) {
  let mentor = await MentorProfile.findOne({ userId });

  if (!mentor) {
    mentor = new MentorProfile({ userId, ...data });
  } else {
    Object.assign(mentor, data);
  }

  await mentor.save();
  return MentorProfile.findById(mentor._id).populate(
    "userId",
    "name email avatarUrl headline bio location skills",
  );
}

export async function requestMentorship(founderId, data) {
  const { mentorId, startupId, message, goals, focusAreas, scheduledAt } = data;

  const founder = await User.findById(founderId);
  if (!mentorId || !message?.trim()) {
    throw httpError(400, "Choose a mentor and add a request message.");
  }

  if (sameId(founderId, mentorId)) {
    throw httpError(400, "You cannot request mentorship from yourself.");
  }

  const mentor = await User.findById(mentorId);
  const mentorProfile = await MentorProfile.findOne({ userId: mentorId });
  const mentorHasRole =
    mentor?.activeRole === "mentor" ||
    mentor?.role === "mentor" ||
    (Array.isArray(mentor?.roles) && mentor.roles.includes("mentor"));

  if (!mentor || (!mentorHasRole && !mentorProfile)) {
    throw httpError(404, "Mentor not found.");
  }

  let startup = null;
  if (startupId) {
    startup = await Startup.findOne({
      $or: [{ _id: startupId.match(/^[0-9a-fA-F]{24}$/) ? startupId : null }, { slug: startupId }],
    });
    if (!startup) throw httpError(404, "Startup not found.");
    await requireCanManageStartup(founderId, startup, { founderOnly: true });
  }

  const existingRequest = await MentorshipRequest.findOne({
    founderId,
    mentorId,
    startupId: startup?._id || null,
    status: { $in: [MENTORSHIP_STATUS.PENDING, MENTORSHIP_STATUS.ACCEPTED] },
  });

  if (existingRequest) {
    throw httpError(409, "You already have an active mentorship request with this mentor.");
  }

  const request = await MentorshipRequest.create({
    mentorId,
    startupId: startup?._id || null,
    founderId,
    initiatedBy: MENTORSHIP_INITIATORS.FOUNDER,
    requestedBy: founderId,
    message: message.trim(),
    goals: normalizeList(goals),
    focusAreas: normalizeFocusAreas(focusAreas),
    scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
    status: "pending",
  });

  await createNotification({
    recipientId: mentorId,
    senderId: founderId,
    type: "mentorship_request",
    entityType: "mentorship",
    entityId: request._id,
    title: "New Mentorship Request",
    message: `${founder?.name || "A founder"} requested mentorship${startup ? ` for ${startup.name}` : ""}.`,
    startupId: startup?._id?.toString(),
    startupName: startup?.name,
  });

  return populateMentorshipRequest(request);
}

export async function requestFounderMentorship(mentorId, startupId, data = {}) {
  const { message, goals, focusAreas, scheduledAt } = data;

  if (!startupId || !message?.trim()) {
    throw httpError(400, "Choose a startup and add a mentorship request message.");
  }

  const mentor = await User.findById(mentorId);
  const mentorProfile = await MentorProfile.findOne({ userId: mentorId });
  const mentorHasRole =
    mentor?.activeRole === "mentor" ||
    mentor?.role === "mentor" ||
    (Array.isArray(mentor?.roles) && mentor.roles.includes("mentor"));

  if (!mentor || (!mentorHasRole && !mentorProfile)) {
    throw httpError(404, "Mentor not found.");
  }

  const startup = await Startup.findOne({
    $or: [{ _id: startupId.match(/^[0-9a-fA-F]{24}$/) ? startupId : null }, { slug: startupId }],
  });

  if (!startup) throw httpError(404, "Startup not found.");

  if (await canManageStartup(mentorId, startup, { founderOnly: true })) {
    throw httpError(403, "You cannot request mentorship for a startup you already manage.");
  }

  const founderId = getPrimaryFounderId(startup);
  if (!founderId) {
    throw httpError(404, "Startup founder not found.");
  }

  if (sameId(founderId, mentorId)) {
    throw httpError(400, "You cannot request mentorship from yourself.");
  }

  const existingRequest = await MentorshipRequest.findOne({
    founderId,
    mentorId,
    startupId: startup._id,
    status: { $in: [MENTORSHIP_STATUS.PENDING, MENTORSHIP_STATUS.ACCEPTED] },
  });

  if (existingRequest) {
    throw httpError(409, "You already have an active mentorship request for this startup.");
  }

  const request = await MentorshipRequest.create({
    mentorId,
    startupId: startup._id,
    founderId,
    initiatedBy: MENTORSHIP_INITIATORS.MENTOR,
    requestedBy: mentorId,
    message: message.trim(),
    goals: normalizeList(goals),
    focusAreas: normalizeFocusAreas(focusAreas),
    scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
    status: MENTORSHIP_STATUS.PENDING,
  });

  await createNotification({
    recipientId: founderId,
    senderId: mentorId,
    type: "mentorship_request",
    entityType: "mentorship",
    entityId: request._id,
    title: "New Mentorship Request",
    message: `${mentor?.name || "A mentor"} offered mentorship for ${startup.name}.`,
    startupId: startup._id?.toString(),
    startupName: startup.name,
  });

  return populateMentorshipRequest(request);
}

export async function listMentorshipRequests({
  mentorId,
  founderId,
  status,
  page = 1,
  limit = 20,
}) {
  const filter = {};
  if (mentorId) filter.mentorId = mentorId;
  if (founderId) filter.founderId = founderId;
  if (status) filter.status = status;

  const skip = (page - 1) * limit;
  const [requests, total] = await Promise.all([
    MentorshipRequest.find(filter)
      .populate("mentorId", "name email avatarUrl headline bio")
      .populate("founderId", "name email avatarUrl headline bio location")
      .populate("requestedBy", "name email avatarUrl headline bio location")
      .populate(
        "startupId",
        "name slug logoUrl stage industry location description founderIds ownerId",
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    MentorshipRequest.countDocuments(filter),
  ]);

  return {
    requests,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      hasNext: skip + requests.length < total,
    },
  };
}

export async function updateMentorshipRequestStatus(
  requestId,
  userId,
  { status, scheduledAt, meetingNotes },
) {
  if (!Object.values(MENTORSHIP_STATUS).includes(status)) {
    throw httpError(400, "Choose a valid mentorship status.");
  }

  const request = await MentorshipRequest.findById(requestId).populate("startupId");
  if (!request) throw httpError(404, "Mentorship request not found.");

  const initiator = request.initiatedBy || MENTORSHIP_INITIATORS.FOUNDER;
  const requesterId =
    request.requestedBy ||
    (initiator === MENTORSHIP_INITIATORS.MENTOR ? request.mentorId : request.founderId);
  const responderId =
    initiator === MENTORSHIP_INITIATORS.MENTOR ? request.founderId : request.mentorId;
  const isParticipant = sameId(request.mentorId, userId) || sameId(request.founderId, userId);
  const isResponse = [MENTORSHIP_STATUS.ACCEPTED, MENTORSHIP_STATUS.REJECTED].includes(status);
  const canRespond = isResponse && sameId(responderId, userId);
  const canCancel = status === MENTORSHIP_STATUS.CANCELLED && sameId(requesterId, userId);
  const canComplete =
    status === MENTORSHIP_STATUS.COMPLETED &&
    isParticipant &&
    request.status === MENTORSHIP_STATUS.ACCEPTED;

  if (!canRespond && !canCancel && !canComplete) {
    throw httpError(403, "You are not allowed to update this mentorship request.");
  }

  request.status = status;
  request.requestedBy = request.requestedBy || requesterId;
  request.initiatedBy = initiator;
  if (scheduledAt) request.scheduledAt = new Date(scheduledAt);
  if (meetingNotes !== undefined) request.meetingNotes = meetingNotes;
  await request.save();

  if (status === "accepted") {
    const { workspace, initialized } = await ensureMentorshipWorkspace(request, userId);

    await createNotification({
      recipientId: getDocumentId(requesterId),
      senderId: userId,
      type: "mentorship_accepted",
      entityType: "mentorship_workspace",
      entityId: workspace._id,
      title: "Mentorship Request Accepted!",
      message: `Your mentorship request${request.startupId ? ` for ${request.startupId.name}` : ""} was accepted. The private workspace is ready.`,
      startupId: request.startupId?._id?.toString(),
      startupName: request.startupId?.name,
    });

    if (initialized) {
      await notifyMentorshipWorkspaceParticipants({
        workspace,
        actorId: userId,
        type: "mentorship_workspace",
        title: "Mentorship Workspace Created",
        updates: ["workspace"],
      });
    }
  } else if (status === "rejected") {
    await createNotification({
      recipientId: requesterId,
      senderId: userId,
      type: "request_response",
      entityType: "mentorship",
      entityId: request._id,
      title: "Mentorship Request Update",
      message: `The mentorship request${request.startupId ? ` for ${request.startupId.name}` : ""} was rejected.`,
      startupId: request.startupId?._id?.toString(),
      startupName: request.startupId?.name,
    });
  } else if (status === "completed") {
    const workspace = await Conversation.findOne({
      mentorshipRequestId: request._id,
      participants: userId,
      type: "mentorship",
      mentorshipWorkspace: { $exists: true, $ne: null },
    });

    if (workspace?.mentorshipWorkspace) {
      workspace.mentorshipWorkspace.status = MENTORSHIP_WORKSPACE_STATUS.COMPLETED;
      workspace.mentorshipWorkspace.progress = 100;
      workspace.lastMessage = "Mentorship marked completed.";
      workspace.lastMessageAt = new Date();
      await workspace.save();
    }

    await notifyMentorshipRequestParticipants({
      request,
      actorId: userId,
      type: "request_response",
      title: "Mentorship Completed",
      message: `Mentorship${request.startupId ? ` for ${request.startupId.name}` : ""} was marked completed.`,
    });
  }

  return populateMentorshipRequest(request);
}

export async function listMentorshipWorkspaces({
  userId,
  startupId,
  status,
  page = 1,
  limit = 20,
}) {
  const filter = {
    participants: userId,
    type: "mentorship",
    mentorshipWorkspace: { $exists: true, $ne: null },
  };

  if (status) {
    if (!Object.values(MENTORSHIP_WORKSPACE_STATUS).includes(status)) {
      throw httpError(400, "Choose a valid mentorship workspace status.");
    }
    filter["mentorshipWorkspace.status"] = status;
  }

  if (startupId) {
    const startup = await Startup.findOne({
      $or: [{ _id: startupId.match(/^[0-9a-fA-F]{24}$/) ? startupId : null }, { slug: startupId }],
    });
    if (!startup) {
      return {
        workspaces: [],
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: 0,
          hasNext: false,
        },
      };
    }
    filter.relatedStartupId = startup._id;
  }

  const skip = (page - 1) * limit;
  const [workspaces, total] = await Promise.all([
    populateMentorshipWorkspaceQuery(
      Conversation.find(filter)
        .sort({ lastMessageAt: -1, updatedAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
    ),
    Conversation.countDocuments(filter),
  ]);

  return {
    workspaces,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      hasNext: skip + workspaces.length < total,
    },
  };
}

export async function getMentorshipWorkspace(userId, workspaceId) {
  if (!isObjectId(workspaceId)) throw httpError(404, "Mentorship workspace not found.");

  const workspace = await populateMentorshipWorkspaceQuery(
    Conversation.findOne({
      _id: workspaceId,
      participants: userId,
      type: "mentorship",
      mentorshipWorkspace: { $exists: true, $ne: null },
    }),
  );

  if (!workspace) throw httpError(404, "Mentorship workspace not found.");
  return workspace;
}

export async function updateMentorshipWorkspace(userId, workspaceId, data = {}) {
  if (!isObjectId(workspaceId)) throw httpError(404, "Mentorship workspace not found.");

  const workspace = await Conversation.findOne({
    _id: workspaceId,
    participants: userId,
    type: "mentorship",
    mentorshipWorkspace: { $exists: true, $ne: null },
  });

  if (!workspace) throw httpError(404, "Mentorship workspace not found.");
  hydrateMentorshipWorkspace(workspace, userId);

  const updates = [];
  const notificationTypes = new Set();

  if (data.status !== undefined) {
    if (!Object.values(MENTORSHIP_WORKSPACE_STATUS).includes(data.status)) {
      throw httpError(400, "Choose a valid mentorship workspace status.");
    }
    workspace.mentorshipWorkspace.status = data.status;
    updates.push(`status to ${formatWorkspaceStatus(data.status)}`);
    notificationTypes.add("mentorship_workspace_updated");
  }

  if (data.progress !== undefined) {
    workspace.mentorshipWorkspace.progress = clampProgress(data.progress);
    updates.push(`progress to ${workspace.mentorshipWorkspace.progress}%`);
    notificationTypes.add("mentorship_workspace_updated");
  }

  if (data.meeting !== undefined || data.session !== undefined) {
    const meeting = data.meeting || data.session || {};
    if (meeting.scheduledAt !== undefined) {
      workspace.mentorshipWorkspace.nextSession.scheduledAt = meeting.scheduledAt
        ? new Date(meeting.scheduledAt)
        : null;
    }
    if (meeting.location !== undefined) {
      workspace.mentorshipWorkspace.nextSession.location = String(meeting.location)
        .trim()
        .slice(0, 200);
    }
    if (meeting.agenda !== undefined) {
      workspace.mentorshipWorkspace.nextSession.agenda = String(meeting.agenda)
        .trim()
        .slice(0, 1000);
    }
    if (meeting.notes !== undefined) {
      workspace.mentorshipWorkspace.nextSession.notes = String(meeting.notes).trim().slice(0, 1000);
    }
    workspace.mentorshipWorkspace.nextSession.updatedBy = userId;
    workspace.mentorshipWorkspace.nextSession.updatedAt = new Date();
    updates.push("meeting/session");
    notificationTypes.add("mentorship_meeting");
  }

  if (data.mentorNotes !== undefined) {
    workspace.mentorshipWorkspace.mentorNotes = String(data.mentorNotes).trim().slice(0, 3000);
    updates.push("mentor notes");
    notificationTypes.add("mentorship_workspace_updated");
  }

  if (data.feedback !== undefined) {
    workspace.mentorshipWorkspace.feedback = String(data.feedback).trim().slice(0, 3000);
    updates.push("feedback");
    notificationTypes.add("mentorship_workspace_updated");
  }

  if (data.goal !== undefined) {
    workspace.mentorshipWorkspace.goals.push(buildMentorshipItem(data.goal, userId));
    updates.push("goal");
    notificationTypes.add("mentorship_workspace_updated");
  }

  if (data.milestone !== undefined) {
    workspace.mentorshipWorkspace.milestones.push(buildMentorshipItem(data.milestone, userId));
    updates.push("milestone");
    notificationTypes.add("mentorship_workspace_updated");
  }

  if (data.resource !== undefined || data.file !== undefined) {
    const resource = data.resource || data.file || {};
    const title = String(resource.title || "").trim();
    const url = String(resource.url || "").trim();
    const notes = String(resource.notes || "").trim();
    if (!title || !url) {
      throw httpError(400, "Resource title and URL are required.");
    }
    workspace.mentorshipWorkspace.resources.push({
      title: title.slice(0, 160),
      url: url.slice(0, 500),
      notes: notes.slice(0, 500),
      addedBy: userId,
      addedAt: new Date(),
    });
    updates.push("resource");
    notificationTypes.add("mentorship_resource");
  }

  if (updates.length === 0) {
    throw httpError(400, "Choose a mentorship workspace field to update.");
  }

  workspace.lastMessage = `Mentorship workspace updated: ${updates.join(", ")}.`;
  workspace.lastMessageAt = new Date();
  await workspace.save();

  for (const type of notificationTypes) {
    await notifyMentorshipWorkspaceParticipants({
      workspace,
      actorId: userId,
      type,
      title:
        type === "mentorship_meeting"
          ? "Mentorship Meeting Updated"
          : type === "mentorship_resource"
            ? "Mentorship Resource Shared"
            : "Mentorship Workspace Updated",
      updates,
    });
  }

  return getMentorshipWorkspace(userId, workspace._id);
}

function populateMentorshipRequest(request) {
  return MentorshipRequest.findById(request._id)
    .populate("mentorId", "name email avatarUrl headline bio")
    .populate("founderId", "name email avatarUrl headline bio location")
    .populate("requestedBy", "name email avatarUrl headline bio location")
    .populate("startupId", "name slug logoUrl stage industry location founderIds ownerId");
}

async function ensureMentorshipWorkspace(request, actorId) {
  const startupId = request.startupId?._id || request.startupId || null;
  let workspace = await Conversation.findOne({
    mentorshipRequestId: request._id,
    type: "mentorship",
  });

  if (!workspace) {
    workspace = await Conversation.findOne({
      participants: { $all: [request.mentorId, request.founderId], $size: 2 },
      type: "mentorship",
      relatedStartupId: startupId,
      $or: [{ mentorshipRequestId: null }, { mentorshipRequestId: { $exists: false } }],
    });
  }

  const initialized = !workspace?.mentorshipWorkspace;

  if (!workspace) {
    workspace = await Conversation.create({
      participants: [request.mentorId, request.founderId],
      type: "mentorship",
      relatedStartupId: startupId,
      mentorshipRequestId: request._id,
      mentorshipWorkspace: buildInitialMentorshipWorkspace(request, actorId),
      lastMessage: "Mentorship Workspace initialized.",
      lastMessageAt: new Date(),
    });
  } else {
    const participantIds = new Set(
      (workspace.participants || []).map((participantId) => participantId.toString()),
    );
    participantIds.add(request.mentorId.toString());
    participantIds.add(request.founderId.toString());

    workspace.participants = Array.from(participantIds);
    workspace.relatedStartupId = startupId;
    workspace.mentorshipRequestId = workspace.mentorshipRequestId || request._id;
    workspace.mentorshipWorkspace = {
      ...(workspace.mentorshipWorkspace?.toObject?.() || workspace.mentorshipWorkspace || {}),
      ...buildInitialMentorshipWorkspace(request, actorId),
      ...(workspace.mentorshipWorkspace?.toObject?.() || workspace.mentorshipWorkspace || {}),
    };
    workspace.lastMessage = initialized
      ? "Mentorship Workspace initialized."
      : workspace.lastMessage || "Mentorship Workspace active.";
    workspace.lastMessageAt = new Date();
    await workspace.save();
  }

  if (initialized) {
    await Message.create({
      conversationId: workspace._id,
      senderId: actorId,
      content: `Hi! I accepted the mentorship request${request.startupId ? ` for ${request.startupId.name}` : ""}. This private workspace is ready for goals, milestones, sessions, notes, resources, and chat.`,
    });
  }

  return {
    workspace: await getMentorshipWorkspace(actorId, workspace._id),
    initialized,
  };
}

function buildInitialMentorshipWorkspace(request, actorId) {
  return {
    status: MENTORSHIP_WORKSPACE_STATUS.ACTIVE,
    focusAreas: normalizeFocusAreas(request.focusAreas),
    goals: normalizeList(request.goals).map((goal) => ({
      title: goal,
      status: MENTORSHIP_ITEM_STATUS.TODO,
      notes: "",
      dueDate: null,
      createdBy: request.requestedBy || actorId,
      completedAt: null,
    })),
    milestones: [],
    nextSession: {
      scheduledAt: request.scheduledAt || null,
      location: "",
      agenda: normalizeList(request.goals).slice(0, 3).join(", "),
      notes: request.meetingNotes || "",
      updatedBy: actorId,
      updatedAt: new Date(),
    },
    mentorNotes: "",
    feedback: "",
    progress: 0,
    resources: [],
  };
}

function hydrateMentorshipWorkspace(workspace, actorId) {
  const current = workspace.mentorshipWorkspace || {};
  workspace.mentorshipWorkspace = {
    status: current.status || MENTORSHIP_WORKSPACE_STATUS.ACTIVE,
    focusAreas: normalizeFocusAreas(current.focusAreas),
    goals: current.goals || [],
    milestones: current.milestones || [],
    nextSession: current.nextSession || {
      scheduledAt: null,
      location: "",
      agenda: "",
      notes: "",
      updatedBy: actorId,
      updatedAt: new Date(),
    },
    mentorNotes: current.mentorNotes || "",
    feedback: current.feedback || "",
    progress: Number(current.progress) || 0,
    resources: current.resources || [],
  };
}

function buildMentorshipItem(item, actorId) {
  const title = String(item?.title || "").trim();
  if (!title) {
    throw httpError(400, "Goal or milestone title is required.");
  }

  const status = item.status || MENTORSHIP_ITEM_STATUS.TODO;
  if (!Object.values(MENTORSHIP_ITEM_STATUS).includes(status)) {
    throw httpError(400, "Choose a valid goal or milestone status.");
  }

  return {
    title: title.slice(0, 180),
    status,
    notes: String(item.notes || "")
      .trim()
      .slice(0, 1000),
    dueDate: item.dueDate ? new Date(item.dueDate) : null,
    createdBy: actorId,
    completedAt: status === MENTORSHIP_ITEM_STATUS.COMPLETED ? new Date() : null,
  };
}

async function notifyMentorshipRequestParticipants({ request, actorId, type, title, message }) {
  const recipients = [request.mentorId, request.founderId].filter(
    (participantId) => !sameId(participantId, actorId),
  );

  for (const recipientId of recipients) {
    await createNotification({
      recipientId: getDocumentId(recipientId),
      senderId: actorId,
      type,
      entityType: "mentorship",
      entityId: request._id,
      title,
      message,
      startupId: request.startupId?._id?.toString(),
      startupName: request.startupId?.name,
    });
  }
}

async function notifyMentorshipWorkspaceParticipants({ workspace, actorId, type, title, updates }) {
  const actor = await User.findById(actorId);
  const startupId = getDocumentId(workspace.relatedStartupId);
  const startup =
    workspace.relatedStartupId?.name || !startupId
      ? workspace.relatedStartupId
      : await Startup.findById(startupId);
  const startupName = startup?.name || "the startup";
  const recipients = (workspace.participants || []).filter(
    (participantId) => getDocumentId(participantId) !== actorId.toString(),
  );

  for (const recipientId of recipients) {
    await createNotification({
      recipientId: getDocumentId(recipientId),
      senderId: actorId,
      type,
      entityType: "mentorship_workspace",
      entityId: workspace._id,
      title,
      message: `${actor?.name || "A participant"} updated ${updates.join(", ")} for ${startupName}.`,
      startupId,
      startupName,
    });
  }
}

function populateMentorshipWorkspaceQuery(query) {
  return query
    .populate("participants", "name email avatarUrl headline bio activeRole roles")
    .populate(
      "relatedStartupId",
      "name slug logoUrl stage industry location description fundingRaised fundingGoal founderIds ownerId",
    )
    .populate(
      "mentorshipRequestId",
      "message goals focusAreas status initiatedBy requestedBy scheduledAt meetingNotes mentorId founderId startupId",
    )
    .populate("mentorshipWorkspace.goals.createdBy", "name email avatarUrl")
    .populate("mentorshipWorkspace.milestones.createdBy", "name email avatarUrl")
    .populate("mentorshipWorkspace.nextSession.updatedBy", "name email avatarUrl")
    .populate("mentorshipWorkspace.resources.addedBy", "name email avatarUrl");
}

function normalizeFocusAreas(value) {
  const normalized = normalizeList(value);
  if (normalized.length) return normalized;
  return [
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
}

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean)
      .slice(0, 20);
  }
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function clampProgress(value) {
  const progress = Number(value);
  if (!Number.isFinite(progress)) return 0;
  return Math.min(100, Math.max(0, Math.round(progress)));
}

function formatWorkspaceStatus(status) {
  return (
    {
      active: "Active",
      in_progress: "In Progress",
      on_track: "On Track",
      at_risk: "At Risk",
      completed: "Completed",
    }[status] || status
  );
}

function getPrimaryFounderId(startup) {
  const founderIds = startup?.founderIds || [];
  const firstFounder = Array.isArray(founderIds) ? founderIds[0] : founderIds;
  return getDocumentId(firstFounder) || getDocumentId(startup?.ownerId);
}

function isObjectId(value) {
  return /^[0-9a-fA-F]{24}$/.test(String(value || ""));
}

function getDocumentId(value) {
  return value?._id?.toString?.() || value?.toString?.() || null;
}
