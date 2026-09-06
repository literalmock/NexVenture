import Pitch from "../models/Pitch.js";
import PitchLike from "../models/PitchLike.js";
import Startup from "../models/Startup.js";
import { httpError } from "../utils/httpError.js";
import { requireCanManageStartup } from "./accessService.js";
import { createNotification } from "./notificationService.js";

export async function createPitch(founderId, startupId, data) {
  const startup = await Startup.findOne({
    $or: [{ _id: startupId.match(/^[0-9a-fA-F]{24}$/) ? startupId : null }, { slug: startupId }],
  });

  if (!startup) {
    throw httpError(404, "Startup not found.");
  }

  await requireCanManageStartup(founderId, startup, { founderOnly: true });

  // If status is published, archive any previous published pitch
  if (data.status === "published" || !data.status) {
    await Pitch.updateMany({ startupId: startup._id, status: "published" }, { status: "archived" });
  }

  const pitch = await Pitch.create({
    ...data,
    startupId: startup._id,
    founderId,
    status: data.status || "published",
  });

  return pitch;
}

export async function listPitches({
  startupId,
  search,
  status = "published",
  page = 1,
  limit = 20,
  currentUserId,
}) {
  const filter = {};
  if (status) filter.status = status;

  if (startupId) {
    const startup = await Startup.findOne({
      $or: [{ _id: startupId.match(/^[0-9a-fA-F]{24}$/) ? startupId : null }, { slug: startupId }],
    });
    if (startup) {
      filter.startupId = startup._id;
    }
  }

  if (search) {
    const regex = new RegExp(search, "i");
    filter.$or = [
      { title: regex },
      { elevatorPitch: regex },
      { problem: regex },
      { solution: regex },
    ];
  }

  const skip = (page - 1) * limit;
  const [pitches, total] = await Promise.all([
    Pitch.find(filter)
      .populate("startupId", "name slug logoUrl industry stage location fundingRaised")
      .populate("founderId", "name email avatarUrl headline")
      .sort({ likesCount: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Pitch.countDocuments(filter),
  ]);

  let userLikes = new Set();
  if (currentUserId && pitches.length > 0) {
    const pitchIds = pitches.map((p) => p._id);
    const likes = await PitchLike.find({
      pitchId: { $in: pitchIds },
      userId: currentUserId,
    });
    userLikes = new Set(likes.map((l) => l.pitchId.toString()));
  }

  const pitchesWithLiked = pitches.map((p) => {
    const obj = p.toObject();
    obj.isLiked = userLikes.has(p._id.toString());
    return obj;
  });

  return {
    pitches: pitchesWithLiked,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      hasNext: skip + pitches.length < total,
    },
  };
}

export async function getPitchById(pitchId, currentUserId) {
  const pitch = await Pitch.findById(pitchId)
    .populate(
      "startupId",
      "name slug logoUrl industry stage location fundingRaised fundingGoal website",
    )
    .populate("founderId", "name email avatarUrl headline bio");

  if (!pitch) return null;

  // Increment views
  await Pitch.findByIdAndUpdate(pitchId, { $inc: { views: 1 } });

  let isLiked = false;
  if (currentUserId) {
    const like = await PitchLike.findOne({ pitchId, userId: currentUserId });
    isLiked = Boolean(like);
  }

  const pitchObj = pitch.toObject();
  pitchObj.views += 1;
  pitchObj.isLiked = isLiked;

  return pitchObj;
}

export async function updatePitch(pitchId, userId, data) {
  const pitch = await Pitch.findById(pitchId).select("startupId").exec();
  if (!pitch) throw httpError(404, "Pitch not found.");

  await requireCanManageStartup(userId, pitch.startupId, { founderOnly: true });

  if (data.status === "published") {
    await Pitch.updateMany(
      { _id: { $ne: pitch._id }, startupId: pitch.startupId, status: "published" },
      { status: "archived" },
    );
  }

  return Pitch.findByIdAndUpdate(pitchId, data, {
    returnDocument: "after",
    runValidators: true,
  });
}

export async function togglePitchLike(pitchId, userId) {
  const pitch = await Pitch.findById(pitchId);
  if (!pitch) throw new Error("Pitch not found.");

  const existing = await PitchLike.findOne({ pitchId, userId });
  let isLiked = false;

  if (existing) {
    await PitchLike.deleteOne({ _id: existing._id });
    await Pitch.findByIdAndUpdate(pitchId, { $inc: { likesCount: -1 } });
    isLiked = false;
  } else {
    await PitchLike.create({ pitchId, userId });
    await Pitch.findByIdAndUpdate(pitchId, { $inc: { likesCount: 1 } });
    isLiked = true;

    // Send notification to founder
    await createNotification({
      recipientId: pitch.founderId,
      senderId: userId,
      type: "pitch_like",
      entityType: "pitch",
      entityId: pitch._id,
      title: "New pitch upvote!",
      message: `Someone liked your pitch for ${pitch.title}`,
    });
  }

  const updated = await Pitch.findById(pitchId);
  return { isLiked, likesCount: updated.likesCount };
}
