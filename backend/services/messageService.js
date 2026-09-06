import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";
import InvestmentInterest from "../models/InvestmentInterest.js";
import MentorshipRequest from "../models/MentorshipRequest.js";
import Message from "../models/Message.js";
import Profile from "../models/Profile.js";
import Startup from "../models/Startup.js";
import StartupMembership from "../models/StartupMembership.js";
import User from "../models/User.js";
import { CONVERSATION_TYPES, USER_ROLES } from "../utils/enums.js";
import { httpError } from "../utils/httpError.js";
import { canManageStartup } from "./accessService.js";
import {
  getStoredAttachmentFile,
  removeStoredAttachments,
  saveConversationAttachment,
} from "./fileStorageService.js";
import { ensureInvestmentDealRoom } from "./investmentService.js";
import { createNotification } from "./notificationService.js";

export async function listConversations(userId) {
  const conversations = await Conversation.find({
    participants: userId,
  })
    .populate(
      "participants",
      "name email avatarUrl headline bio activeRole role roles linkedStartupId",
    )
    .populate("relatedStartupId", "name slug logoUrl stage industry fundingGoal")
    .populate("relatedPitchId", "title fundingAsk elevatorPitch")
    .populate("investmentInterestId", "amountRange message status founderNotes")
    .populate("investmentDealRoom.documents.addedBy", "name email avatarUrl")
    .populate(
      "mentorshipRequestId",
      "message goals focusAreas status initiatedBy requestedBy scheduledAt meetingNotes",
    )
    .populate("mentorshipWorkspace.resources.addedBy", "name email avatarUrl")
    .sort({ lastMessageAt: -1, updatedAt: -1 });

  return withParticipantIdentity(conversations);
}

export async function getOrCreateConversation(
  optionsOrUserId,
  targetUserIdArg,
  typeArg,
  startupIdArg,
) {
  const options =
    typeof optionsOrUserId === "object" && optionsOrUserId !== null
      ? optionsOrUserId
      : {
          userId: optionsOrUserId,
          targetUserId: targetUserIdArg,
          type: typeArg,
          relatedStartupId: startupIdArg,
        };
  const {
    userId,
    targetUserId,
    type = null,
    relatedStartupId = null,
    investmentInterestId = null,
    mentorshipRequestId = null,
    conversationId = null,
  } = options;

  const conversationType = type || CONVERSATION_TYPES.DIRECT;

  if (!isObjectId(userId)) throw httpError(401, "Authentication required.");
  if (!Object.values(CONVERSATION_TYPES).includes(conversationType)) {
    throw httpError(400, "Choose a valid conversation type.");
  }

  if (conversationId) {
    try {
      return await getConversationById({
        conversationId,
        userId,
        targetUserId,
        type,
        relatedStartupId,
        investmentInterestId,
        mentorshipRequestId,
      });
    } catch (error) {
      if (
        !investmentInterestId ||
        error.statusCode !== 404 ||
        error.code !== "CONVERSATION_NOT_FOUND"
      ) {
        throw error;
      }
    }
  }

  let resolvedTargetUserId = targetUserId;
  let startup = relatedStartupId ? await resolveStartup(relatedStartupId) : null;
  let startupObjectId = startup?._id || null;
  let preloadedInvestmentInterest = null;
  let preloadedMentorshipRequest = null;

  if (!resolvedTargetUserId && investmentInterestId) {
    preloadedInvestmentInterest = await resolveInvestmentInterestForUser({
      investmentInterestId,
      userId,
      startupObjectId,
    });
    if (!startup && preloadedInvestmentInterest.startupId) {
      startup = preloadedInvestmentInterest.startupId;
      startupObjectId = startup?._id || null;
    }
    resolvedTargetUserId = await inferInvestmentTargetUserId(preloadedInvestmentInterest, userId);
  }

  if (!resolvedTargetUserId && mentorshipRequestId) {
    preloadedMentorshipRequest = await resolveMentorshipRequestForUser({
      mentorshipRequestId,
      userId,
      startupObjectId,
    });
    if (!startup && preloadedMentorshipRequest.startupId) {
      startup = preloadedMentorshipRequest.startupId;
      startupObjectId = startup?._id || null;
    }
    resolvedTargetUserId = inferMentorshipTargetUserId(preloadedMentorshipRequest, userId);
  }

  if (!isObjectId(resolvedTargetUserId)) {
    throw httpError(400, "targetUserId must be a valid user id.");
  }

  if (userId.toString() === resolvedTargetUserId.toString()) {
    throw httpError(400, "You cannot start a conversation with yourself.");
  }

  const [currentUser, targetUser] = await Promise.all([
    User.findById(userId),
    User.findById(resolvedTargetUserId),
  ]);
  if (!currentUser || !targetUser) {
    throw httpError(404, "Conversation participant not found.");
  }

  const investmentInterest = investmentInterestId
    ? preloadedInvestmentInterest ||
      (await resolveInvestmentInterest({
        investmentInterestId,
        userId,
        targetUserId: resolvedTargetUserId,
        startupObjectId,
      }))
    : null;
  if (!startup && investmentInterest?.startupId) {
    startup = investmentInterest.startupId;
    startupObjectId = startup?._id || null;
  }
  const mentorshipRequest = mentorshipRequestId
    ? preloadedMentorshipRequest ||
      (await resolveMentorshipRequest({
        mentorshipRequestId,
        userId,
        targetUserId: resolvedTargetUserId,
        startupObjectId,
      }))
    : null;
  if (!startup && mentorshipRequest?.startupId) {
    startup = mentorshipRequest.startupId;
    startupObjectId = startup?._id || null;
  }

  await authorizeConversationContext({
    type: conversationType,
    userId,
    targetUserId: resolvedTargetUserId,
    currentUser,
    targetUser,
    startup,
    investmentInterest,
    mentorshipRequest,
  });

  if (
    conversationType === CONVERSATION_TYPES.INVESTMENT &&
    investmentInterest?.status === "accepted"
  ) {
    const founderParticipantId = sameId(investmentInterest.investorId, userId)
      ? resolvedTargetUserId
      : userId;
    const { dealRoom } = await ensureInvestmentDealRoom(investmentInterest, founderParticipantId);
    return populateConversationById(dealRoom._id);
  }

  const participantIds = [userId, resolvedTargetUserId];
  const filter = {
    participants: { $all: participantIds, $size: 2 },
    type: conversationType,
  };

  if (startupObjectId) filter.relatedStartupId = startupObjectId;
  if (investmentInterest) filter.investmentInterestId = investmentInterest._id;
  if (mentorshipRequest) filter.mentorshipRequestId = mentorshipRequest._id;

  let conversation = await Conversation.findOne(filter).sort({ updatedAt: -1 });

  if (!conversation && (investmentInterest || mentorshipRequest)) {
    conversation = await Conversation.findOne({
      participants: { $all: participantIds, $size: 2 },
      type: conversationType,
      ...(startupObjectId ? { relatedStartupId: startupObjectId } : {}),
      ...(investmentInterest
        ? { $or: [{ investmentInterestId: null }, { investmentInterestId: { $exists: false } }] }
        : {}),
      ...(mentorshipRequest
        ? { $or: [{ mentorshipRequestId: null }, { mentorshipRequestId: { $exists: false } }] }
        : {}),
    }).sort({ updatedAt: -1 });
  }

  if (!conversation) {
    conversation = await Conversation.create({
      participants: participantIds,
      type: conversationType,
      relatedStartupId: startupObjectId,
      investmentInterestId: investmentInterest?._id || null,
      mentorshipRequestId: mentorshipRequest?._id || null,
      lastMessage: "Conversation started.",
      lastMessageAt: new Date(),
    });
  } else {
    let changed = false;
    if (startupObjectId && !conversation.relatedStartupId) {
      conversation.relatedStartupId = startupObjectId;
      changed = true;
    }
    if (investmentInterest && !conversation.investmentInterestId) {
      conversation.investmentInterestId = investmentInterest._id;
      changed = true;
    }
    if (mentorshipRequest && !conversation.mentorshipRequestId) {
      conversation.mentorshipRequestId = mentorshipRequest._id;
      changed = true;
    }
    if (changed) await conversation.save();
  }

  return populateConversationById(conversation._id);
}

async function getConversationById({
  conversationId,
  userId,
  targetUserId = null,
  type = null,
  relatedStartupId = null,
  investmentInterestId = null,
  mentorshipRequestId = null,
}) {
  if (!isObjectId(conversationId)) {
    throw httpError(400, "conversationId must be a valid conversation id.");
  }
  if (targetUserId && !isObjectId(targetUserId)) {
    throw httpError(400, "targetUserId must be a valid user id.");
  }

  const filter = {
    _id: conversationId,
    participants: userId,
  };
  if (type) filter.type = type;

  const conversation = await Conversation.findOne(filter);
  if (!conversation) {
    const conversationExists = await Conversation.exists({ _id: conversationId });
    throw httpError(
      404,
      "Conversation not found or unauthorized.",
      conversationExists ? "CONVERSATION_MISMATCH" : "CONVERSATION_NOT_FOUND",
    );
  }

  if (
    targetUserId &&
    !conversation.participants.some((participantId) => sameId(participantId, targetUserId))
  ) {
    throw httpError(404, "Conversation not found for the selected participant.");
  }

  if (relatedStartupId) {
    const startup = await resolveStartup(relatedStartupId);
    if (!sameId(conversation.relatedStartupId, startup._id)) {
      throw httpError(404, "Conversation not found for this startup context.");
    }
  }
  if (investmentInterestId && !sameId(conversation.investmentInterestId, investmentInterestId)) {
    throw httpError(404, "Conversation not found for this investment interest.");
  }
  if (mentorshipRequestId && !sameId(conversation.mentorshipRequestId, mentorshipRequestId)) {
    throw httpError(404, "Conversation not found for this mentorship request.");
  }

  return populateConversationById(conversation._id);
}

async function populateConversationById(conversationId) {
  const conversation = await populateConversation(Conversation.findById(conversationId));
  if (!conversation) {
    throw httpError(404, "Conversation not found.");
  }
  return withParticipantIdentity(conversation);
}

function populateConversation(query) {
  return query
    .populate(
      "participants",
      "name email avatarUrl headline bio activeRole role roles linkedStartupId",
    )
    .populate("relatedStartupId", "name slug logoUrl stage industry fundingGoal")
    .populate("relatedPitchId", "title fundingAsk elevatorPitch")
    .populate("investmentInterestId", "amountRange message status founderNotes")
    .populate("investmentDealRoom.documents.addedBy", "name email avatarUrl")
    .populate(
      "mentorshipRequestId",
      "message goals focusAreas status initiatedBy requestedBy scheduledAt meetingNotes",
    )
    .populate("mentorshipWorkspace.resources.addedBy", "name email avatarUrl");
}

async function resolveStartup(startupId) {
  const key = idString(startupId).trim();
  if (!key) {
    throw httpError(400, "relatedStartupId must be a valid startup id.");
  }

  const lookup = [{ id: key }, { slug: key.toLowerCase() }];
  if (mongoose.isValidObjectId(key)) {
    lookup.unshift({ _id: key });
  }

  const startup = await Startup.findOne({ $or: lookup });
  if (!startup) {
    throw httpError(404, "Startup context not found.");
  }
  return startup;
}

async function resolveInvestmentInterest({
  investmentInterestId,
  userId,
  targetUserId,
  startupObjectId = null,
}) {
  if (!isObjectId(investmentInterestId)) {
    throw httpError(400, "investmentInterestId must be a valid investment interest id.");
  }

  const interest = await InvestmentInterest.findById(investmentInterestId).populate(
    "startupId",
    "name slug ownerId founderIds",
  );
  if (!interest) {
    throw httpError(404, "Investment interest not found.");
  }
  if (startupObjectId && !sameId(interest.startupId, startupObjectId)) {
    throw httpError(400, "Investment interest does not belong to this startup.");
  }

  const participantIds = [idString(userId), idString(targetUserId)];
  if (!participantIds.includes(idString(interest.investorId))) {
    throw httpError(403, "Investment conversation must include the interested investor.");
  }

  const startup = interest.startupId;
  const directFounderMatch = [startup?.ownerId, ...(startup?.founderIds || [])].some((founderId) =>
    participantIds.includes(idString(founderId)),
  );
  const membershipFounderMatches = await Promise.all(
    participantIds.map((participantId) =>
      canManageStartup(participantId, startup, { founderOnly: true }),
    ),
  );

  if (!directFounderMatch && !membershipFounderMatches.some(Boolean)) {
    throw httpError(403, "Investment conversation must include a founder for the startup.");
  }

  return interest;
}

async function resolveInvestmentInterestForUser({
  investmentInterestId,
  userId,
  startupObjectId = null,
}) {
  if (!isObjectId(investmentInterestId)) {
    throw httpError(400, "investmentInterestId must be a valid investment interest id.");
  }

  const interest = await InvestmentInterest.findById(investmentInterestId).populate(
    "startupId",
    "name slug ownerId founderIds",
  );
  if (!interest) {
    throw httpError(404, "Investment interest not found.");
  }
  if (startupObjectId && !sameId(interest.startupId, startupObjectId)) {
    throw httpError(400, "Investment interest does not belong to this startup.");
  }

  const isInvestor = sameId(interest.investorId, userId);
  const isFounder = await canManageStartup(userId, interest.startupId, { founderOnly: true });
  if (!isInvestor && !isFounder) {
    throw httpError(403, "Investment conversation must include the investor or startup founder.");
  }

  return interest;
}

async function inferInvestmentTargetUserId(interest, userId) {
  if (sameId(interest.investorId, userId)) {
    const founderId = getPrimaryFounderId(interest.startupId);
    if (!founderId) throw httpError(404, "Startup founder not found for this deal room.");
    return founderId;
  }

  if (await canManageStartup(userId, interest.startupId, { founderOnly: true })) {
    return idString(interest.investorId);
  }

  throw httpError(403, "Investment conversation must include the investor or startup founder.");
}

async function resolveMentorshipRequest({
  mentorshipRequestId,
  userId,
  targetUserId,
  startupObjectId = null,
}) {
  if (!isObjectId(mentorshipRequestId)) {
    throw httpError(400, "mentorshipRequestId must be a valid mentorship request id.");
  }

  const mentorshipRequest = await MentorshipRequest.findById(mentorshipRequestId).populate(
    "startupId",
    "name slug ownerId founderIds",
  );
  if (!mentorshipRequest) {
    throw httpError(404, "Mentorship request not found.");
  }
  if (
    startupObjectId &&
    mentorshipRequest.startupId &&
    !sameId(mentorshipRequest.startupId, startupObjectId)
  ) {
    throw httpError(400, "Mentorship request does not belong to this startup.");
  }

  const participantIds = [idString(userId), idString(targetUserId)];
  if (
    !participantIds.includes(idString(mentorshipRequest.mentorId)) ||
    !participantIds.includes(idString(mentorshipRequest.founderId))
  ) {
    throw httpError(403, "Mentorship conversation must include the mentor and founder.");
  }

  return mentorshipRequest;
}

async function resolveMentorshipRequestForUser({
  mentorshipRequestId,
  userId,
  startupObjectId = null,
}) {
  if (!isObjectId(mentorshipRequestId)) {
    throw httpError(400, "mentorshipRequestId must be a valid mentorship request id.");
  }

  const mentorshipRequest = await MentorshipRequest.findById(mentorshipRequestId).populate(
    "startupId",
    "name slug ownerId founderIds",
  );
  if (!mentorshipRequest) {
    throw httpError(404, "Mentorship request not found.");
  }
  if (
    startupObjectId &&
    mentorshipRequest.startupId &&
    !sameId(mentorshipRequest.startupId, startupObjectId)
  ) {
    throw httpError(400, "Mentorship request does not belong to this startup.");
  }

  if (!sameId(mentorshipRequest.mentorId, userId) && !sameId(mentorshipRequest.founderId, userId)) {
    throw httpError(403, "Mentorship conversation must include the mentor or founder.");
  }

  return mentorshipRequest;
}

function inferMentorshipTargetUserId(mentorshipRequest, userId) {
  if (sameId(mentorshipRequest.mentorId, userId)) return idString(mentorshipRequest.founderId);
  if (sameId(mentorshipRequest.founderId, userId)) return idString(mentorshipRequest.mentorId);
  throw httpError(403, "Mentorship conversation must include the mentor or founder.");
}

async function authorizeConversationContext({
  type,
  userId,
  targetUserId,
  currentUser,
  targetUser,
  startup = null,
  investmentInterest = null,
  mentorshipRequest = null,
}) {
  if (type === CONVERSATION_TYPES.INVESTMENT) {
    if (investmentInterest) return;

    const currentIsInvestor = userHasRole(currentUser, USER_ROLES.INVESTOR);
    const targetIsInvestor = userHasRole(targetUser, USER_ROLES.INVESTOR);
    if (!currentIsInvestor && !targetIsInvestor) {
      throw httpError(403, "Investment conversations require an investor participant.");
    }

    if (startup && !(await eitherParticipantCanManageStartup(userId, targetUserId, startup))) {
      throw httpError(403, "Investment conversations require a startup founder participant.");
    }
    return;
  }

  if (type === CONVERSATION_TYPES.MENTORSHIP) {
    if (mentorshipRequest) return;

    const currentIsMentor = userHasRole(currentUser, USER_ROLES.MENTOR);
    const targetIsMentor = userHasRole(targetUser, USER_ROLES.MENTOR);
    if (!currentIsMentor && !targetIsMentor) {
      throw httpError(403, "Mentorship conversations require a mentor participant.");
    }

    if (startup && !(await eitherParticipantCanManageStartup(userId, targetUserId, startup))) {
      throw httpError(403, "Mentorship conversations require a startup founder participant.");
    }
    return;
  }

  if (type === CONVERSATION_TYPES.STARTUP && startup) {
    const currentCanManage = await canManageStartup(userId, startup);
    const targetCanManage = await canManageStartup(targetUserId, startup);
    if (!currentCanManage && !targetCanManage) {
      throw httpError(403, "Startup conversations require a startup participant.");
    }
  }
}

async function eitherParticipantCanManageStartup(userId, targetUserId, startup) {
  const [currentCanManage, targetCanManage] = await Promise.all([
    canManageStartup(userId, startup, { founderOnly: true }),
    canManageStartup(targetUserId, startup, { founderOnly: true }),
  ]);
  return currentCanManage || targetCanManage;
}

async function withParticipantIdentity(conversationOrConversations) {
  const isArray = Array.isArray(conversationOrConversations);
  const source = isArray
    ? conversationOrConversations
    : [conversationOrConversations].filter(Boolean);
  const conversations = source.map((conversation) =>
    typeof conversation.toObject === "function" ? conversation.toObject() : conversation,
  );
  if (!conversations.length) return isArray ? [] : null;

  const participantIds = [
    ...new Set(
      conversations
        .flatMap((conversation) => conversation.participants || [])
        .map((participant) => idString(participant))
        .filter(Boolean),
    ),
  ];
  const participantObjectIds = participantIds.filter((participantId) =>
    mongoose.isValidObjectId(participantId),
  );
  const linkedStartupKeys = [
    ...new Set(
      conversations
        .flatMap((conversation) => conversation.participants || [])
        .map((participant) => participant?.linkedStartupId)
        .map((startupId) => idString(startupId))
        .filter(Boolean),
    ),
  ];

  const linkedStartupLookup = buildStartupLookup(linkedStartupKeys);
  const [memberships, profiles, linkedStartups] = await Promise.all([
    participantObjectIds.length
      ? StartupMembership.find({
          userId: { $in: participantObjectIds },
          status: "active",
        })
          .populate("startupId", "name slug id logoUrl")
          .lean()
      : [],
    participantObjectIds.length
      ? Profile.find({ userId: { $in: participantObjectIds } })
          .select("userId experience")
          .lean()
      : [],
    linkedStartupLookup.length
      ? Startup.find({ $or: linkedStartupLookup }).select("name slug id logoUrl").lean()
      : [],
  ]);

  const membershipsByUser = new Map();
  memberships.forEach((membership) => {
    const membershipUserId = idString(membership.userId);
    if (!membershipsByUser.has(membershipUserId)) {
      membershipsByUser.set(membershipUserId, []);
    }
    membershipsByUser.get(membershipUserId).push(membership);
  });

  const profilesByUser = new Map(profiles.map((profile) => [idString(profile.userId), profile]));
  const startupsByKey = new Map();
  linkedStartups.forEach((startup) => {
    [startup._id, startup.id, startup.slug]
      .map((key) => idString(key))
      .filter(Boolean)
      .forEach((key) => startupsByKey.set(key, startup));
  });

  const enriched = conversations.map((conversation) => {
    const participantContexts = (conversation.participants || []).map((participant) =>
      buildParticipantContext(participant, conversation, {
        membershipsByUser,
        profilesByUser,
        startupsByKey,
      }),
    );
    const contextsByUser = new Map(participantContexts.map((context) => [context.userId, context]));

    return {
      ...conversation,
      participants: (conversation.participants || []).map((participant) => ({
        ...participant,
        conversationContext: contextsByUser.get(idString(participant)) || null,
      })),
      participantContexts,
    };
  });

  return isArray ? enriched : enriched[0] || null;
}

function buildParticipantContext(participant, conversation, contextMaps) {
  const userId = idString(participant);
  const memberships = contextMaps.membershipsByUser.get(userId) || [];
  const relatedStartup = normalizePopulatedRef(conversation.relatedStartupId);
  const role = pickParticipantRole(participant, conversation, memberships);
  const roleLabel = formatRole(role);
  const company = pickParticipantCompany({
    participant,
    conversation,
    memberships,
    relatedStartup,
    profile: contextMaps.profilesByUser.get(userId),
    startupsByKey: contextMaps.startupsByKey,
  });

  return {
    userId,
    role,
    roleLabel,
    companyName: company.name,
    startupId: company.startupId,
    line: company.name ? `${roleLabel} • ${company.name}` : roleLabel,
  };
}

function pickParticipantRole(participant, conversation, memberships) {
  const roles = userRoles(participant);
  const relatedStartupId = idString(conversation.relatedStartupId);
  const relatedMembership = memberships.find((membership) =>
    sameId(membership.startupId, relatedStartupId),
  );

  if (conversation.type === CONVERSATION_TYPES.INVESTMENT && roles.has(USER_ROLES.INVESTOR)) {
    return USER_ROLES.INVESTOR;
  }
  if (conversation.type === CONVERSATION_TYPES.MENTORSHIP && roles.has(USER_ROLES.MENTOR)) {
    return USER_ROLES.MENTOR;
  }
  if (conversation.type === CONVERSATION_TYPES.STARTUP && roles.has(USER_ROLES.STUDENT)) {
    return USER_ROLES.STUDENT;
  }
  if (roles.has(participant?.activeRole)) return participant.activeRole;
  if (roles.has(participant?.role)) return participant.role;
  if (relatedMembership && ["founder", "cofounder"].includes(relatedMembership.role)) {
    return USER_ROLES.FOUNDER;
  }
  return roles.values().next().value || USER_ROLES.FOUNDER;
}

function pickParticipantCompany({
  participant,
  conversation,
  memberships,
  relatedStartup,
  profile,
  startupsByKey,
}) {
  const relatedStartupId = idString(relatedStartup);
  const relatedMembership = memberships.find((membership) =>
    sameId(membership.startupId, relatedStartupId),
  );
  if (relatedMembership?.startupId?.name) {
    return {
      name: relatedMembership.startupId.name,
      startupId: idString(relatedMembership.startupId),
    };
  }

  if (relatedStartup?.name && hasRelationshipContext(conversation.type)) {
    return {
      name: relatedStartup.name,
      startupId: idString(relatedStartup),
    };
  }

  const linkedStartup = startupsByKey.get(idString(participant?.linkedStartupId));
  if (linkedStartup?.name) {
    return {
      name: linkedStartup.name,
      startupId: idString(linkedStartup),
    };
  }

  const firstMembershipWithStartup = memberships.find((membership) => membership.startupId?.name);
  if (firstMembershipWithStartup?.startupId?.name) {
    return {
      name: firstMembershipWithStartup.startupId.name,
      startupId: idString(firstMembershipWithStartup.startupId),
    };
  }

  return {
    name: profileCompany(profile),
    startupId: "",
  };
}

function buildStartupLookup(keys) {
  if (!keys.length) return [];
  const lookup = [{ id: { $in: keys } }, { slug: { $in: keys.map((key) => key.toLowerCase()) } }];
  const objectIds = keys.filter((key) => mongoose.isValidObjectId(key));
  if (objectIds.length) {
    lookup.unshift({ _id: { $in: objectIds } });
  }
  return lookup;
}

function profileCompany(profile) {
  const experience = profile?.experience || [];
  const current = experience.find((item) => item?.current && item.company);
  const anyCompany = current || experience.find((item) => item?.company);
  return anyCompany?.company || "";
}

function hasRelationshipContext(type) {
  return [
    CONVERSATION_TYPES.INVESTMENT,
    CONVERSATION_TYPES.MENTORSHIP,
    CONVERSATION_TYPES.STARTUP,
  ].includes(type);
}

function userHasRole(user, role) {
  return userRoles(user).has(role);
}

function userRoles(user) {
  return new Set([user?.activeRole, user?.role, ...(user?.roles || [])].filter(Boolean));
}

function formatRole(role) {
  const labels = {
    [USER_ROLES.FOUNDER]: "Founder",
    [USER_ROLES.INVESTOR]: "Investor",
    [USER_ROLES.MENTOR]: "Mentor",
    [USER_ROLES.STUDENT]: "Student",
  };
  return labels[role] || normalizeLabel(role);
}

function normalizeLabel(value) {
  return String(value || "Member")
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizePopulatedRef(ref) {
  if (!ref) return null;
  return typeof ref.toObject === "function" ? ref.toObject() : ref;
}

function getPrimaryFounderId(startup) {
  const founderIds = startup?.founderIds || [];
  return (
    idString(Array.isArray(founderIds) ? founderIds[0] : founderIds) || idString(startup?.ownerId)
  );
}

function isObjectId(value) {
  const key = idString(value);
  return Boolean(key && mongoose.isValidObjectId(key));
}

function sameId(left, right) {
  const leftId = idString(left);
  const rightId = idString(right);
  return Boolean(leftId && rightId && leftId === rightId);
}

function idString(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof mongoose.Types.ObjectId || value._bsontype === "ObjectId") {
    return value.toString();
  }
  if (value._id && value._id !== value) return idString(value._id);
  if (value.id && typeof value.id !== "function" && value.id !== value) return idString(value.id);
  return value.toString ? value.toString() : "";
}

export async function getConversationMessages(conversationId, userId, page = 1, limit = 50) {
  await requireParticipantConversation(conversationId, userId);

  const skip = (page - 1) * limit;
  const [messages, total] = await Promise.all([
    Message.find({ conversationId })
      .populate("senderId", "name email avatarUrl")
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(Number(limit)),
    Message.countDocuments({ conversationId }),
  ]);

  // Mark unread messages as read
  await Message.updateMany(
    { conversationId, senderId: { $ne: userId }, readBy: { $ne: userId } },
    { $addToSet: { readBy: userId } },
  );

  return {
    messages,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      hasNext: skip + messages.length < total,
    },
  };
}

export async function sendMessage(conversationId, senderId, content = "", files = []) {
  const conversation = await requireParticipantConversation(conversationId, senderId);
  const cleanContent = String(content || "").trim();
  if (!cleanContent && !files.length) {
    throw httpError(400, "Message content or attachment is required.");
  }

  const attachments = [];
  try {
    for (const file of files) {
      const attachmentId = new mongoose.Types.ObjectId();
      attachments.push(
        await saveConversationAttachment({
          conversationId,
          attachmentId,
          file,
        }),
      );
    }

    const message = await Message.create({
      conversationId,
      senderId,
      content: cleanContent,
      attachments,
      readBy: [senderId],
    });

    const attachmentSummary = summarizeAttachments(attachments);
    conversation.lastMessage = cleanContent.slice(0, 100) || attachmentSummary;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    const sender = await User.findById(senderId);
    const otherParticipants = conversation.participants.filter(
      (p) => p.toString() !== senderId.toString(),
    );

    for (const recipientId of otherParticipants) {
      await createNotification({
        recipientId,
        senderId,
        type: "message",
        entityType: "conversation",
        entityId: conversation._id,
        title: `New message from ${sender?.name || "User"}`,
        message: (cleanContent || attachmentSummary).slice(0, 120),
      });
    }

    return Message.findById(message._id).populate("senderId", "name email avatarUrl");
  } catch (error) {
    await removeStoredAttachments(attachments);
    throw error;
  }
}

export async function getConversationAttachment({ conversationId, attachmentId, userId }) {
  await requireParticipantConversation(conversationId, userId);

  if (!isObjectId(attachmentId)) {
    throw httpError(404, "Attachment not found.");
  }

  const message = await Message.findOne({
    conversationId,
    "attachments._id": attachmentId,
  }).select("+attachments.storageKey");
  if (!message) {
    throw httpError(404, "Attachment not found.");
  }

  const attachment = message.attachments.id(attachmentId);
  if (!attachment) {
    throw httpError(404, "Attachment not found.");
  }

  return getStoredAttachmentFile(attachment);
}

async function requireParticipantConversation(conversationId, userId) {
  if (!isObjectId(conversationId)) {
    throw httpError(404, "Conversation not found or unauthorized.");
  }

  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
  });

  if (!conversation) {
    throw httpError(404, "Conversation not found or unauthorized.");
  }

  return conversation;
}

function summarizeAttachments(attachments) {
  if (!attachments.length) return "";
  if (attachments.length === 1) return `Shared ${attachments[0].name}`;
  return `Shared ${attachments.length} files`;
}
