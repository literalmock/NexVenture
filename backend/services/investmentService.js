import Conversation from "../models/Conversation.js";
import InvestmentInterest, {
  ACTIVE_INVESTMENT_INTEREST_STATUSES,
} from "../models/InvestmentInterest.js";
import Message from "../models/Message.js";
import Pitch from "../models/Pitch.js";
import Startup from "../models/Startup.js";
import User from "../models/User.js";
import { INVESTMENT_DEAL_STATUS, INVESTMENT_STATUS } from "../utils/enums.js";
import { httpError } from "../utils/httpError.js";
import { requireCanManageStartup, sameId } from "./accessService.js";
import { createNotification } from "./notificationService.js";

const INTEREST_STATUS_PRIORITY = {
  [INVESTMENT_STATUS.ACCEPTED]: 3,
  [INVESTMENT_STATUS.PENDING]: 2,
  [INVESTMENT_STATUS.FOUNDER_REVIEW]: 1,
};

export async function expressInterest(investorId, startupId, data) {
  const startup = await resolveStartup(startupId);

  if (!startup) throw new Error("Startup not found.");
  if (
    sameId(startup.ownerId, investorId) ||
    (startup.founderIds || []).some((founderId) => sameId(founderId, investorId))
  ) {
    throw httpError(403, "You cannot express investment interest in your own startup.");
  }

  const investor = await User.findById(investorId);

  const existingInterest = await findActiveInvestmentInterest(investorId, startup._id);
  if (existingInterest) {
    const dealRoom =
      existingInterest.status === INVESTMENT_STATUS.ACCEPTED
        ? await ensureDealRoomForAcceptedInterest(existingInterest)
        : null;
    const interest = await populateInterestById(existingInterest._id);
    return {
      interest: serializeInterestWithDealRoom(interest, dealRoom),
      created: false,
      dealRoom,
    };
  }

  let interest;
  try {
    interest = await InvestmentInterest.create({
      investorId,
      startupId: startup._id,
      pitchId: data.pitchId || null,
      amountRange: data.amountRange || "$25,000 - $50,000",
      message: data.message || "I am interested in learning more about your startup.",
      status: INVESTMENT_STATUS.PENDING,
    });
  } catch (error) {
    if (error.code !== 11000) throw error;
    const duplicateInterest = await findActiveInvestmentInterest(investorId, startup._id);
    if (!duplicateInterest) throw error;
    const dealRoom =
      duplicateInterest.status === INVESTMENT_STATUS.ACCEPTED
        ? await ensureDealRoomForAcceptedInterest(duplicateInterest)
        : null;
    const interest = await populateInterestById(duplicateInterest._id);
    return {
      interest: serializeInterestWithDealRoom(interest, dealRoom),
      created: false,
      dealRoom,
    };
  }

  // Notify all startup founders
  const founders = startup.founderIds?.length ? startup.founderIds : [startup.ownerId];
  for (const founderId of founders) {
    if (founderId) {
      await createNotification({
        recipientId: founderId,
        senderId: investorId,
        type: "investment_interest",
        entityType: "investment",
        entityId: interest._id,
        title: `Investment Interest: ${startup.name}`,
        message: `${investor?.name || "An investor"} expressed investment interest of ${interest.amountRange}.`,
        startupId: startup._id.toString(),
        startupName: startup.name,
      });
    }
  }

  return {
    interest: serializeInterestWithDealRoom(await populateInterestById(interest._id)),
    created: true,
    dealRoom: null,
  };
}

export async function listInterests({ startupId, investorId, status, page = 1, limit = 20 }) {
  const filter = {};
  if (startupId) {
    const startup = await resolveStartup(startupId);
    if (startup) filter.startupId = startup._id;
  }
  if (investorId) filter.investorId = investorId;
  if (status) filter.status = status;

  const skip = (page - 1) * limit;
  const [interests, total] = await Promise.all([
    populateInterestQuery(InvestmentInterest.find(filter))
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    InvestmentInterest.countDocuments(filter),
  ]);
  const decoratedInterests = await decorateInterestsWithDealRooms(interests);

  return {
    interests: decoratedInterests,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      hasNext: skip + decoratedInterests.length < total,
    },
  };
}

export async function updateInterestStatus(interestId, userId, { status, founderNotes }) {
  const normalizedStatus = normalizeInvestmentStatus(status);
  if (!Object.values(INVESTMENT_STATUS).includes(normalizedStatus)) {
    throw httpError(400, "Choose a valid investment interest status.");
  }

  const interest = await InvestmentInterest.findById(interestId).populate("startupId");
  if (!interest) throw httpError(404, "Investment interest not found.");

  if (sameId(interest.investorId, userId)) {
    if (normalizedStatus !== INVESTMENT_STATUS.WITHDRAWN) {
      throw httpError(403, "Investors can only withdraw their own investment interests.");
    }
  } else {
    await requireCanManageStartup(userId, interest.startupId, { founderOnly: true });
  }

  interest.status = normalizedStatus;
  if (founderNotes !== undefined) interest.founderNotes = founderNotes;
  await interest.save();

  if (normalizedStatus === INVESTMENT_STATUS.ACCEPTED) {
    const { dealRoom, initialized } = await ensureInvestmentDealRoom(interest, userId);

    if (initialized) {
      await createDealRoomCreatedNotifications({ interest, founderId: userId, dealRoom });
    }

    return serializeInterestWithDealRoom(await populateInterestById(interest._id), dealRoom);
  } else if (normalizedStatus === INVESTMENT_STATUS.REJECTED) {
    await createNotification({
      recipientId: interest.investorId,
      senderId: userId,
      type: "request_response",
      entityType: "investment",
      entityId: interest._id,
      title: "Investment Interest Update",
      message: `The founder of ${interest.startupId?.name || "the startup"} is not taking investments at this time.`,
    });
  }

  return serializeInterestWithDealRoom(await populateInterestById(interest._id));
}

export async function listDealRooms({ userId, startupId, status, page = 1, limit = 20 }) {
  const filter = {
    participants: userId,
    type: "investment",
    investmentDealRoom: { $exists: true, $ne: null },
  };

  if (status) {
    if (!Object.values(INVESTMENT_DEAL_STATUS).includes(status)) {
      throw httpError(400, "Choose a valid deal room status.");
    }
    filter["investmentDealRoom.status"] = status;
  }

  if (startupId) {
    const startup = await resolveStartup(startupId);
    if (!startup) {
      return {
        dealRooms: [],
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
  const rawDealRooms = await populateDealRoomQuery(
    Conversation.find(filter).sort({ lastMessageAt: -1, updatedAt: -1 }),
  );
  const dedupedDealRooms = dedupeDealRooms(rawDealRooms);
  const dealRooms = dedupedDealRooms.slice(skip, skip + Number(limit));

  return {
    dealRooms,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: dedupedDealRooms.length,
      hasNext: skip + dealRooms.length < dedupedDealRooms.length,
    },
  };
}

export async function reconcileInvestmentInterestLifecycle() {
  const duplicateGroups = await InvestmentInterest.aggregate([
    { $match: { status: { $in: ACTIVE_INVESTMENT_INTEREST_STATUSES } } },
    {
      $group: {
        _id: { investorId: "$investorId", startupId: "$startupId" },
        interestIds: { $push: "$_id" },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]);

  for (const group of duplicateGroups) {
    const interests = await InvestmentInterest.find({ _id: { $in: group.interestIds } })
      .populate("startupId")
      .sort({ createdAt: 1 });
    const conversations = await Conversation.find({
      type: "investment",
      investmentInterestId: { $in: group.interestIds },
    });
    const canonicalInterest = chooseCanonicalInterest(interests, conversations);
    if (!canonicalInterest) continue;

    const duplicateInterestIds = interests
      .filter((interest) => !sameId(interest._id, canonicalInterest._id))
      .map((interest) => interest._id);
    if (duplicateInterestIds.length) {
      await InvestmentInterest.updateMany(
        { _id: { $in: duplicateInterestIds } },
        {
          $set: {
            status: INVESTMENT_STATUS.WITHDRAWN,
            founderNotes: `Archived duplicate investment interest. Canonical interest: ${canonicalInterest._id}.`,
          },
          $unset: { conversationId: "" },
        },
      );
      await Conversation.updateMany(
        {
          type: "investment",
          investmentInterestId: { $in: duplicateInterestIds },
        },
        {
          $set: {
            investmentInterestId: null,
            investmentDealRoom: null,
          },
        },
      );
    }

    if (canonicalInterest.status === INVESTMENT_STATUS.ACCEPTED) {
      const founderId = getPrimaryFounderId(canonicalInterest.startupId);
      if (founderId) {
        await ensureInvestmentDealRoom(canonicalInterest, founderId);
      }
    }
  }

  await InvestmentInterest.createIndexes();
}

export async function getDealRoom(userId, dealRoomId) {
  if (!isObjectId(dealRoomId)) throw httpError(404, "Deal room not found.");

  const dealRoom = await populateDealRoomQuery(
    Conversation.findOne({
      _id: dealRoomId,
      participants: userId,
      type: "investment",
      investmentDealRoom: { $exists: true, $ne: null },
    }),
  );

  if (!dealRoom) throw httpError(404, "Deal room not found.");
  return dealRoom;
}

export async function updateDealRoom(userId, dealRoomId, data = {}) {
  if (!isObjectId(dealRoomId)) throw httpError(404, "Deal room not found.");

  const dealRoom = await Conversation.findOne({
    _id: dealRoomId,
    participants: userId,
    type: "investment",
    investmentDealRoom: { $exists: true, $ne: null },
  });

  if (!dealRoom) throw httpError(404, "Deal room not found.");

  dealRoom.investmentDealRoom.status =
    dealRoom.investmentDealRoom.status || INVESTMENT_DEAL_STATUS.ACCEPTED;
  dealRoom.investmentDealRoom.meeting = dealRoom.investmentDealRoom.meeting || {};
  dealRoom.investmentDealRoom.documents = dealRoom.investmentDealRoom.documents || [];

  const updates = [];
  if (data.status !== undefined) {
    if (!Object.values(INVESTMENT_DEAL_STATUS).includes(data.status)) {
      throw httpError(400, "Choose a valid deal room status.");
    }
    dealRoom.investmentDealRoom.status = data.status;
    updates.push(`status to ${formatDealStatus(data.status)}`);
  }

  if (data.meeting !== undefined) {
    const meeting = data.meeting || {};
    if (meeting.scheduledAt !== undefined) {
      dealRoom.investmentDealRoom.meeting.scheduledAt = meeting.scheduledAt
        ? new Date(meeting.scheduledAt)
        : null;
    }
    if (meeting.location !== undefined) {
      dealRoom.investmentDealRoom.meeting.location = String(meeting.location).trim().slice(0, 200);
    }
    if (meeting.notes !== undefined) {
      dealRoom.investmentDealRoom.meeting.notes = String(meeting.notes).trim().slice(0, 1000);
    }
    dealRoom.investmentDealRoom.meeting.updatedBy = userId;
    updates.push("meeting details");
  }

  const document = data.document || data.sharedDocument;
  if (document !== undefined) {
    const title = String(document?.title || "").trim();
    const url = String(document?.url || "").trim();
    const notes = String(document?.notes || "").trim();
    if (!title || !url) {
      throw httpError(400, "Document title and URL are required.");
    }
    dealRoom.investmentDealRoom.documents.push({
      title: title.slice(0, 160),
      url: url.slice(0, 500),
      notes: notes.slice(0, 500),
      addedBy: userId,
      addedAt: new Date(),
    });
    updates.push("private document");
  }

  if (updates.length === 0) {
    throw httpError(400, "Choose a deal room field to update.");
  }

  dealRoom.lastMessage = `Deal room updated: ${updates.join(", ")}.`;
  dealRoom.lastMessageAt = new Date();
  await dealRoom.save();

  await notifyDealRoomParticipants({ dealRoom, actorId: userId, updates });
  return getDealRoom(userId, dealRoom._id);
}

async function findActiveInvestmentInterest(investorId, startupId) {
  const interests = await InvestmentInterest.find({
    investorId,
    startupId,
    status: { $in: ACTIVE_INVESTMENT_INTEREST_STATUSES },
  }).sort({ createdAt: 1 });
  return chooseCanonicalInterest(interests);
}

function chooseCanonicalInterest(interests, conversations = []) {
  const dealRoomInterestIds = new Set(
    conversations
      .filter((conversation) => conversation.investmentDealRoom)
      .map((conversation) => getDocumentId(conversation.investmentInterestId))
      .filter(Boolean),
  );

  return [...interests].sort((left, right) => {
    const leftScore =
      (INTEREST_STATUS_PRIORITY[left.status] || 0) * 100 +
      (dealRoomInterestIds.has(getDocumentId(left._id)) ? 10 : 0);
    const rightScore =
      (INTEREST_STATUS_PRIORITY[right.status] || 0) * 100 +
      (dealRoomInterestIds.has(getDocumentId(right._id)) ? 10 : 0);
    if (leftScore !== rightScore) return rightScore - leftScore;
    return new Date(left.createdAt || 0).getTime() - new Date(right.createdAt || 0).getTime();
  })[0];
}

async function ensureDealRoomForAcceptedInterest(interest) {
  const populatedInterest = await InvestmentInterest.findById(interest._id).populate("startupId");
  if (!populatedInterest || populatedInterest.status !== INVESTMENT_STATUS.ACCEPTED) return null;
  const founderId = getPrimaryFounderId(populatedInterest.startupId);
  if (!founderId) return null;
  const { dealRoom } = await ensureInvestmentDealRoom(populatedInterest, founderId);
  return dealRoom;
}

async function decorateInterestsWithDealRooms(interests) {
  const decorated = [];
  for (const interest of interests) {
    let dealRoom = null;
    if (interest.status === INVESTMENT_STATUS.ACCEPTED) {
      dealRoom = await ensureDealRoomForAcceptedInterest(interest);
    } else if (interest.conversationId) {
      dealRoom = await populateDealRoomQuery(
        Conversation.findOne({
          _id: interest.conversationId,
          type: "investment",
          investmentInterestId: interest._id,
          investmentDealRoom: { $exists: true, $ne: null },
        }),
      );
    }
    decorated.push(serializeInterestWithDealRoom(interest, dealRoom));
  }
  return decorated;
}

function serializeInterestWithDealRoom(interest, dealRoom = null) {
  if (!interest) return null;
  const interestObject = toPlainObject(interest);
  const dealRoomObject = dealRoom ? toPlainObject(dealRoom) : null;
  const conversationId =
    getDocumentId(dealRoomObject?._id) || getDocumentId(interestObject.conversationId);

  return {
    ...interestObject,
    conversationId: conversationId || null,
    dealRoomId: conversationId || null,
    dealRoom: dealRoomObject,
  };
}

export async function ensureInvestmentDealRoom(interest, founderId) {
  if (interest.status !== INVESTMENT_STATUS.ACCEPTED) {
    throw httpError(409, "Deal rooms are available after investment interest is accepted.");
  }

  const startupId = interest.startupId?._id || interest.startupId;
  let dealRoom = await Conversation.findOne({
    investmentInterestId: interest._id,
    type: "investment",
  });

  if (!dealRoom) {
    const candidates = await Conversation.find({
      participants: { $all: [interest.investorId, founderId], $size: 2 },
      type: "investment",
      relatedStartupId: startupId,
    }).sort({ lastMessageAt: -1, updatedAt: -1 });
    dealRoom =
      candidates.find((candidate) => candidate.investmentDealRoom) ||
      candidates.find((candidate) => !candidate.investmentInterestId) ||
      candidates[0] ||
      null;
  }

  const initialized = !dealRoom?.investmentDealRoom;

  if (!dealRoom) {
    dealRoom = await Conversation.create({
      participants: [interest.investorId, founderId],
      type: "investment",
      relatedStartupId: startupId,
      relatedPitchId: interest.pitchId || null,
      investmentInterestId: interest._id,
      investmentDealRoom: buildInitialDealRoom(interest),
      lastMessage: "Investment Deal Room initialized.",
      lastMessageAt: new Date(),
    });
  } else {
    dealRoom.participants = [interest.investorId, founderId];
    dealRoom.relatedStartupId = startupId;
    dealRoom.relatedPitchId = dealRoom.relatedPitchId || interest.pitchId || null;
    dealRoom.investmentInterestId = interest._id;
    dealRoom.investmentDealRoom = {
      ...(dealRoom.investmentDealRoom?.toObject?.() || dealRoom.investmentDealRoom || {}),
      status: dealRoom.investmentDealRoom?.status || INVESTMENT_DEAL_STATUS.ACCEPTED,
      amountRange: dealRoom.investmentDealRoom?.amountRange || interest.amountRange,
      meeting: dealRoom.investmentDealRoom?.meeting || {
        scheduledAt: null,
        location: "",
        notes: "",
        updatedBy: null,
      },
      documents: dealRoom.investmentDealRoom?.documents || [],
    };
    dealRoom.lastMessage = initialized
      ? "Investment Deal Room initialized."
      : dealRoom.lastMessage || "Investment Deal Room active.";
    dealRoom.lastMessageAt = new Date();
    await dealRoom.save();
  }

  if (!sameId(interest.conversationId, dealRoom._id)) {
    interest.conversationId = dealRoom._id;
    await interest.save();
  }

  await archiveDuplicateDealRoomsForInterest({ interest, founderId, startupId, dealRoom });

  if (initialized) {
    await Message.create({
      conversationId: dealRoom._id,
      senderId: founderId,
      content: `Hi! I accepted your investment interest for ${interest.startupId?.name || "our startup"}. This private deal room has the startup context, investment range, meeting details, shared documents, and chat in one place.`,
    });
  }

  return {
    dealRoom: await getDealRoom(founderId, dealRoom._id),
    initialized,
  };
}

async function archiveDuplicateDealRoomsForInterest({ interest, founderId, startupId, dealRoom }) {
  await Conversation.updateMany(
    {
      _id: { $ne: dealRoom._id },
      participants: { $all: [interest.investorId, founderId], $size: 2 },
      type: "investment",
      relatedStartupId: startupId,
      investmentDealRoom: { $exists: true, $ne: null },
    },
    {
      $set: {
        investmentInterestId: null,
        investmentDealRoom: null,
      },
    },
  );
}

function buildInitialDealRoom(interest) {
  return {
    status: INVESTMENT_DEAL_STATUS.ACCEPTED,
    amountRange: interest.amountRange || "",
    meeting: {
      scheduledAt: null,
      location: "",
      notes: "",
      updatedBy: null,
    },
    documents: [],
  };
}

function populateInterestQuery(query) {
  return query
    .populate("investorId", "name email avatarUrl headline bio location activeRole role roles")
    .populate(
      "startupId",
      "name slug logoUrl stage industry location fundingRaised fundingGoal founderIds ownerId",
    )
    .populate("pitchId", "title fundingAsk elevatorPitch");
}

function populateInterestById(interestId) {
  return populateInterestQuery(InvestmentInterest.findById(interestId));
}

function dedupeDealRooms(dealRooms) {
  const dealRoomByRelationship = new Map();
  for (const dealRoom of dealRooms) {
    const interest = dealRoom.investmentInterestId || {};
    const investorId =
      getDocumentId(interest.investorId) || getDealRoomInvestorId(dealRoom) || "unknown-investor";
    const startupId = getDocumentId(dealRoom.relatedStartupId) || "unknown-startup";
    const key = `${investorId}:${startupId}`;
    const existing = dealRoomByRelationship.get(key);
    if (!existing || compareDealRoomPriority(dealRoom, existing) < 0) {
      dealRoomByRelationship.set(key, dealRoom);
    }
  }
  return Array.from(dealRoomByRelationship.values());
}

function compareDealRoomPriority(left, right) {
  const leftAccepted = left.investmentInterestId?.status === INVESTMENT_STATUS.ACCEPTED ? 1 : 0;
  const rightAccepted = right.investmentInterestId?.status === INVESTMENT_STATUS.ACCEPTED ? 1 : 0;
  if (leftAccepted !== rightAccepted) return rightAccepted - leftAccepted;
  return new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime();
}

function getDealRoomInvestorId(dealRoom) {
  return (dealRoom.participants || [])
    .find((participant) => {
      const roles = [participant.activeRole, participant.role, ...(participant.roles || [])].filter(
        Boolean,
      );
      return roles.includes("investor");
    })
    ?._id?.toString();
}

async function resolveStartup(startupId) {
  const key = String(startupId || "").trim();
  if (!key) return null;
  const lookup = [{ slug: key }, { id: key }];
  if (isObjectId(key)) lookup.unshift({ _id: key });
  const startup = await Startup.findOne({
    $or: lookup,
  });
  return startup;
}

function getPrimaryFounderId(startup) {
  const founderIds = startup?.founderIds || [];
  return (
    getDocumentId(Array.isArray(founderIds) ? founderIds[0] : founderIds) ||
    getDocumentId(startup?.ownerId)
  );
}

function normalizeInvestmentStatus(status) {
  return status === "ignored" ? INVESTMENT_STATUS.FOUNDER_REVIEW : status;
}

async function createDealRoomCreatedNotifications({ interest, founderId, dealRoom }) {
  const startupName = interest.startupId?.name || "the startup";
  const investor = await User.findById(interest.investorId);

  await createNotification({
    recipientId: interest.investorId,
    senderId: founderId,
    type: "investment_deal_room",
    entityType: "investment_deal_room",
    entityId: dealRoom._id,
    title: "Investment Deal Room Created",
    message: `Your investment interest for ${startupName} was accepted. The private deal room is ready.`,
    startupId: interest.startupId?._id?.toString(),
    startupName,
  });

  await createNotification({
    recipientId: founderId,
    senderId: interest.investorId,
    type: "investment_deal_room",
    entityType: "investment_deal_room",
    entityId: dealRoom._id,
    title: "Investment Deal Room Created",
    message: `A private deal room with ${investor?.name || "the investor"} is ready for ${startupName}.`,
    startupId: interest.startupId?._id?.toString(),
    startupName,
  });
}

async function notifyDealRoomParticipants({ dealRoom, actorId, updates }) {
  const actor = await User.findById(actorId);
  const startupId = getDocumentId(dealRoom.relatedStartupId);
  const startup =
    dealRoom.relatedStartupId?.name || !startupId
      ? dealRoom.relatedStartupId
      : await Startup.findById(startupId);
  const startupName = startup?.name || "the startup";
  const recipients = (dealRoom.participants || []).filter(
    (participantId) => participantId.toString() !== actorId.toString(),
  );

  for (const recipientId of recipients) {
    await createNotification({
      recipientId,
      senderId: actorId,
      type: "deal_room_updated",
      entityType: "investment_deal_room",
      entityId: dealRoom._id,
      title: "Deal Room Updated",
      message: `${actor?.name || "A participant"} updated ${updates.join(", ")} for ${startupName}.`,
      startupId,
      startupName,
    });
  }
}

function populateDealRoomQuery(query) {
  return query
    .populate("participants", "name email avatarUrl headline bio activeRole role roles")
    .populate(
      "relatedStartupId",
      "name slug logoUrl stage industry location fundingRaised fundingGoal description founderIds ownerId",
    )
    .populate(
      "relatedPitchId",
      "title fundingAsk elevatorPitch problem solution market traction pitchDeckUrl demoUrl",
    )
    .populate(
      "investmentInterestId",
      "amountRange message status founderNotes createdAt investorId startupId pitchId",
    )
    .populate("investmentDealRoom.documents.addedBy", "name email avatarUrl");
}

function formatDealStatus(status) {
  return (
    {
      accepted: "Accepted",
      discussion: "Discussion",
      due_diligence: "Due Diligence",
      negotiation: "Negotiation",
      terms_agreed: "Terms Agreed",
      completed: "Completed",
    }[status] || status
  );
}

function isObjectId(value) {
  return /^[0-9a-fA-F]{24}$/.test(String(value || ""));
}

function getDocumentId(value) {
  return value?._id?.toString?.() || value?.toString?.() || null;
}

function toPlainObject(value) {
  return typeof value?.toObject === "function" ? value.toObject() : value;
}
