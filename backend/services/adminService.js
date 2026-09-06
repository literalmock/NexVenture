import MentorProfile from "../models/MentorProfile.js";
import Report from "../models/Report.js";
import User from "../models/User.js";

export async function createReport(reporterId, data) {
  return Report.create({
    reporterId,
    targetType: data.targetType,
    targetId: data.targetId,
    reason: data.reason,
  });
}

export async function listReports({ status = "pending", page = 1, limit = 20 }) {
  const filter = status === "all" ? {} : { status };
  const skip = (page - 1) * limit;

  const [reports, total] = await Promise.all([
    Report.find(filter)
      .populate("reporterId", "name email avatarUrl")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Report.countDocuments(filter),
  ]);

  return {
    reports,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      hasNext: skip + reports.length < total,
    },
  };
}

export async function resolveReport(reportId, { actionTaken, status = "resolved" }) {
  return Report.findByIdAndUpdate(
    reportId,
    { actionTaken, status },
    { returnDocument: "after", runValidators: true },
  );
}

export async function toggleUserSuspension(userId, isSuspended) {
  return User.findByIdAndUpdate(userId, { isSuspended }, { returnDocument: "after" });
}

export async function verifyMentor(mentorId, isVerified) {
  return MentorProfile.findByIdAndUpdate(mentorId, { isVerified }, { returnDocument: "after" });
}
