import Notification from "../models/Notification.js";
import Post from "../models/Post.js";
import Startup from "../models/Startup.js";
import User from "../models/User.js";
import { getUserIdFromToken } from "../utils/token.js";
import { getUnreadMessagesCount } from "../services/messageService.js";

const ARRAY_FIELDS = ["investorConnections", "eventRsvps", "bookmarkedStartupIds"];

export async function getWorkspace(req, res, next) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return unauthorized(res);

    return res.json({ success: true, workspace: serializeWorkspace(user.workspace) });
  } catch (error) {
    return next(error);
  }
}

export async function toggleBookmark(req, res, next) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return unauthorized(res);

    const startupId = req.params.startupId || req.body.startupId;
    if (!startupId) {
      return res.status(400).json({ success: false, error: "startupId is required." });
    }

    if (!user.workspace) user.workspace = {};
    const existing = user.workspace.bookmarkedStartupIds || [];
    const sid = String(startupId).trim();
    const isBookmarked = existing.includes(sid);

    const nextBookmarks = isBookmarked
      ? existing.filter((id) => id !== sid)
      : [...existing, sid];

    user.workspace.bookmarkedStartupIds = nextBookmarks;
    await user.save();

    return res.json({
      success: true,
      bookmarked: !isBookmarked,
      startupId: sid,
      bookmarkedStartupIds: nextBookmarks,
      message: !isBookmarked ? "Startup bookmarked." : "Removed from bookmarks.",
    });
  } catch (error) {
    return next(error);
  }
}

export async function getWorkspaceStats(req, res, next) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return unauthorized(res);

    const userId = user._id;
    const role = user.role || "founder";

    const [
      totalStartups,
      hiringStartups,
      postStats,
      incomingRequests,
      pendingRequests,
      outgoingRequests,
      approvedRequests,
      recentNotifications,
      unreadMessages,
    ] = await Promise.all([
      Startup.countDocuments(),
      Startup.countDocuments({ hiring: true }),
      getUserPostStats(userId),
      Notification.countDocuments({ recipient: userId, type: { $nin: ["message", "MESSAGE"] } }),
      Notification.countDocuments({ recipient: userId, status: "pending", type: { $nin: ["message", "MESSAGE"] } }),
      Notification.countDocuments({ sender: userId }),
      Notification.countDocuments({
        $or: [
          { recipient: userId, status: "approved" },
          { sender: userId, status: "approved" },
        ],
      }),
      Notification.find({
        recipient: userId,
        type: { $nin: ["message", "MESSAGE"] },
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("sender", "name role avatarUrl")
        .exec(),
      getUnreadMessagesCount(userId),
    ]);

    const userPostsCount = postStats.postsCount;
    const totalLikesReceived = postStats.likesCount;
    const totalCommentsReceived = postStats.commentCount;

    const currentWs = user.workspace || {};
    const rsvpsCount = currentWs.eventRsvps?.length || 0;
    const bookmarkedCount = currentWs.bookmarkedStartupIds?.length || 0;
    const investorConnectionsCount = currentWs.investorConnections?.length || 0;

    let metrics = [];

    if (role === "founder") {
      const incomingIntros = await Notification.countDocuments({
        recipient: userId,
        type: "intro_request",
      });
      const incomingApps = await Notification.countDocuments({
        recipient: userId,
        type: "application",
      });
      const profileViewsEst = 1200 + totalLikesReceived * 14 + incomingRequests * 8;

      metrics = [
        {
          label: "Profile views",
          value: profileViewsEst.toLocaleString(),
          signal: totalLikesReceived > 0 ? `+${totalLikesReceived * 6}%` : "+12%",
          type: "views",
        },
        {
          label: "Investor signals",
          value: String(incomingIntros + investorConnectionsCount),
          signal: pendingRequests > 0 ? `+${pendingRequests} new` : "Active",
          type: "investors",
        },
        {
          label: "Applications",
          value: String(incomingApps),
          signal: incomingApps > 0 ? `${incomingApps} pending` : "Open",
          type: "applications",
        },
        {
          label: "Ecosystem reach",
          value: `${Math.min(98, 45 + approvedRequests * 10 + userPostsCount * 8)}%`,
          signal: userPostsCount > 0 ? `${userPostsCount} posts` : "Growing",
          type: "progress",
        },
      ];
    } else if (role === "investor") {
      const sentIntros = await Notification.countDocuments({
        sender: userId,
        type: "intro_request",
      });

      metrics = [
        {
          label: "Deal flow matches",
          value: String(totalStartups),
          signal: `+${Math.max(1, Math.floor(totalStartups / 3))}`,
          type: "matches",
        },
        {
          label: "Watchlist",
          value: String(bookmarkedCount),
          signal: bookmarkedCount > 0 ? `${bookmarkedCount} saved` : "0 saved",
          type: "watchlist",
        },
        {
          label: "Intros requested",
          value: String(sentIntros + investorConnectionsCount),
          signal: approvedRequests > 0 ? `${approvedRequests} approved` : "In review",
          type: "portfolio",
        },
        {
          label: "Events & RSVPs",
          value: String(rsvpsCount),
          signal: rsvpsCount > 0 ? "Confirmed" : "Upcoming",
          type: "capital",
        },
      ];
    } else if (role === "mentor") {
      const mentorships = await Notification.countDocuments({
        recipient: userId,
        type: "mentorship",
      });

      metrics = [
        {
          label: "Active mentees",
          value: String(Math.max(1, approvedRequests)),
          signal: approvedRequests > 0 ? "+1" : "Ready",
          type: "teams",
        },
        {
          label: "Sessions & RSVPs",
          value: String(rsvpsCount),
          signal: rsvpsCount > 0 ? `${rsvpsCount} active` : "0 active",
          type: "sessions",
        },
        {
          label: "Mentorship requests",
          value: String(mentorships),
          signal: pendingRequests > 0 ? `${pendingRequests} new` : "Current",
          type: "rating",
        },
        {
          label: "Community signals",
          value: String(userPostsCount + totalCommentsReceived),
          signal: totalLikesReceived > 0 ? `+${totalLikesReceived} likes` : "Active",
          type: "hours",
        },
      ];
    } else {
      const studentApps = await Notification.countDocuments({
        sender: userId,
        type: "application",
      });
      const connectionsCount = outgoingRequests + approvedRequests;

      metrics = [
        {
          label: "Role matches",
          value: String(hiringStartups),
          signal: `+${hiringStartups} hiring`,
          type: "matches",
        },
        {
          label: "Profile signals",
          value: String(28 + studentApps * 6 + totalLikesReceived * 4),
          signal: "+15%",
          type: "views",
        },
        {
          label: "Applications",
          value: String(studentApps),
          signal: studentApps > 0 ? `${studentApps} active` : "0 active",
          type: "applications",
        },
        {
          label: "Connections",
          value: String(connectionsCount),
          signal: approvedRequests > 0 ? `+${approvedRequests} approved` : "Pending",
          type: "connections",
        },
      ];
    }

    return res.json({
      success: true,
      metrics,
      counts: {
        totalStartups,
        hiringStartups,
        bookmarkedCount,
        rsvpsCount,
        unreadNotifications: recentNotifications.filter((n) => !n.read).length,
        unreadMessages: Number(unreadMessages || 0),
        pendingRequests,
        approvedRequests,
        userPostsCount,
      },
      recentNotifications: recentNotifications.map((n) => ({
        id: n._id.toString(),
        title: n.title,
        message: n.message,
        type: n.type,
        status: n.status,
        read: n.read,
        createdAt: n.createdAt,
      })),
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateWorkspace(req, res, next) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return unauthorized(res);

    const currentWs = user.workspace || {};
    const baseWs = currentWs.toObject ? currentWs.toObject() : { ...currentWs };

    const { field, value } = req.body;
    if (field === "startupProfile") {
      baseWs.startupProfile = {
        name: clean(value?.name, 80),
        tagline: clean(value?.tagline, 180),
        stage: clean(value?.stage, 40) || "Pre-seed",
        website: clean(value?.website, 200),
      };
    } else if (ARRAY_FIELDS.includes(field)) {
      if (!Array.isArray(value)) {
        return res.status(400).json({ success: false, error: `${field} must be an array.` });
      }
      baseWs[field] = [...new Set(value.map((item) => clean(item, 120)).filter(Boolean))].slice(
        0,
        100,
      );
    } else if (field === "message") {
      const threadId = clean(value?.threadId, 120);
      const body = clean(value?.body, 1000);
      if (!threadId || !body) {
        return res.status(400).json({ success: false, error: "Thread and message are required." });
      }
      const messages = Array.isArray(baseWs.messages) ? [...baseWs.messages] : [];
      messages.push({ threadId, body, sentAt: new Date() });
      if (messages.length > 100) messages.splice(0, 1);
      baseWs.messages = messages;
    } else {
      return res.status(400).json({ success: false, error: "Unsupported workspace update." });
    }

    user.workspace = baseWs;
    user.markModified("workspace");
    await user.save();
    return res.json({ success: true, workspace: serializeWorkspace(user.workspace) });
  } catch (error) {
    return next(error);
  }
}

async function getUserPostStats(userId) {
  const [stats] = await Post.aggregate([
    { $match: { author: userId } },
    {
      $group: {
        _id: null,
        postsCount: { $sum: 1 },
        likesCount: {
          $sum: {
            $ifNull: ["$likesCount", { $size: { $ifNull: ["$likes", []] } }],
          },
        },
        commentCount: {
          $sum: {
            $ifNull: [
              "$commentCount",
              {
                $ifNull: ["$commentsCount", { $size: { $ifNull: ["$comments", []] } }],
              },
            ],
          },
        },
      },
    },
  ]);

  return {
    postsCount: stats?.postsCount || 0,
    likesCount: stats?.likesCount || 0,
    commentCount: stats?.commentCount || 0,
  };
}

async function getAuthenticatedUser(req) {
  const authorization = req.headers.authorization;
  const token = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : null;
  const userId = getUserIdFromToken(token);
  if (!userId) return null;
  return User.findById(userId).exec();
}

function serializeWorkspace(workspace) {
  return {
    startupProfile: workspace?.startupProfile || {},
    investorConnections: workspace?.investorConnections || [],
    eventRsvps: workspace?.eventRsvps || [],
    bookmarkedStartupIds: workspace?.bookmarkedStartupIds || [],
    messages: workspace?.messages || [],
  };
}

function unauthorized(res) {
  return res.status(401).json({ success: false, error: "Invalid or missing auth token." });
}

function clean(value, maxLength) {
  return String(value || "")
    .trim()
    .slice(0, maxLength);
}
