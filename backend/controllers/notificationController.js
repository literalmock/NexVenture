import Notification from "../models/Notification.js";
import Startup from "../models/Startup.js";
import User from "../models/User.js";
import InvestmentInterest from "../models/InvestmentInterest.js";
import MentorshipRequest from "../models/MentorshipRequest.js";
import Application from "../models/Application.js";
import { ACTIONABLE_REQUEST_TYPES, createNotification } from "../services/notificationService.js";
import * as investmentService from "../services/investmentService.js";
import * as mentorService from "../services/mentorService.js";
import * as applicationService from "../services/applicationService.js";
import * as messageService from "../services/messageService.js";
import { broadcastToUser } from "../realtime/messageSocket.js";

/**
 * GET /notifications
 * Fetch notifications for authenticated user, newest first.
 */
export async function getNotifications(req, res, next) {
  try {
    const notifications = await Notification.find({
      $or: [{ recipient: req.userId }, { recipientId: req.userId }],
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("sender", "name avatarUrl role headline activeRole")
      .populate("senderId", "name avatarUrl role headline activeRole")
      .exec();

    const unreadCount = await Notification.countDocuments({
      $or: [{ recipient: req.userId }, { recipientId: req.userId }],
      read: false,
    });

    const pendingRequestsCount = await Notification.countDocuments({
      $or: [{ recipient: req.userId }, { recipientId: req.userId }],
      status: "pending",
      type: { $in: ACTIONABLE_REQUEST_TYPES },
    });

    const dtos = notifications.map(toNotificationDTO);

    return res.json({
      success: true,
      data: dtos,
      notifications: dtos,
      unreadCount,
      pendingRequestsCount,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /notifications/request
 * Send an intro request, partnership, or job application to a startup/founder.
 */
export async function sendRequest(req, res, next) {
  try {
    const { startupId, type = "intro_request", message, recipientId } = req.body;
    const sender = await User.findById(req.userId).exec();
    if (!sender) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    let targetRecipientId = recipientId;
    let targetStartupName = "";

    if (startupId) {
      const startup = await Startup.findOne({
        $or: [
          { _id: startupId.match(/^[0-9a-fA-F]{24}$/) ? startupId : null },
          { id: startupId },
          { slug: startupId },
        ],
      }).exec();
      if (startup) {
        targetStartupName = startup.name;
        const founderUser = await User.findOne({
          $or: [
            { _id: { $in: startup.founderIds || [] } },
            { _id: startup.ownerId },
            { linkedStartupId: startupId },
            { name: new RegExp(`^${startup.founder}$`, "i") },
          ],
        }).exec();

        if (founderUser) {
          targetRecipientId = founderUser._id;
        }
      }
    }

    if (!targetRecipientId) {
      const fallbackFounder = await User.findOne({
        $or: [{ role: "founder" }, { activeRole: "founder" }, { roles: "founder" }],
      }).exec();
      targetRecipientId = fallbackFounder ? fallbackFounder._id : sender._id;
    }

    if (targetRecipientId.toString() === req.userId.toString()) {
      return res.status(400).json({
        success: false,
        error: "You cannot send an introduction request to yourself.",
      });
    }

    const existing = await Notification.findOne({
      $and: [
        { $or: [{ recipient: targetRecipientId }, { recipientId: targetRecipientId }] },
        { $or: [{ sender: req.userId }, { senderId: req.userId }] },
      ],
      type,
      startupId: startupId || null,
      status: "pending",
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: "You already have a pending request with this startup.",
      });
    }

    const titleByType = {
      intro_request: `Intro Request from ${sender.name}`,
      application: `Job Application from ${sender.name}`,
      mentorship: `Mentorship Request from ${sender.name}`,
    };

    const defaultMsgByType = {
      intro_request: `${sender.name} (${sender.activeRole || sender.role}) requested an introduction${targetStartupName ? ` to ${targetStartupName}` : ""}.`,
      application: `${sender.name} applied for an open position at ${targetStartupName || "your company"}.`,
      mentorship: `${sender.name} sent a mentorship connection request.`,
    };

    const notification = await Notification.create({
      recipient: targetRecipientId,
      recipientId: targetRecipientId,
      sender: sender._id,
      senderId: sender._id,
      type,
      title: titleByType[type] || `New Request from ${sender.name}`,
      message: message ? String(message).trim().slice(0, 500) : defaultMsgByType[type],
      startupId: startupId || null,
      startupName: targetStartupName || null,
      status: "pending",
      read: false,
    });

    const populated = await notification.populate(
      "sender",
      "name avatarUrl role headline activeRole",
    );

    return res.status(201).json({
      success: true,
      data: toNotificationDTO(populated),
      notification: toNotificationDTO(populated),
      message: "Request sent successfully! The company founder has been notified.",
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * PATCH /notifications/:id/respond
 */
export async function respondToRequest(req, res, next) {
  try {
    const { action } = req.body;
    if (!["approve", "disapprove"].includes(action)) {
      return res.status(400).json({
        success: false,
        error: "Action must be either 'approve' or 'disapprove'.",
      });
    }

    const notification = await Notification.findOne({
      _id: req.params.id,
      $or: [{ recipient: req.userId }, { recipientId: req.userId }],
    })
      .populate("sender", "name avatarUrl role headline activeRole")
      .exec();

    if (!notification) {
      return res.status(404).json({ success: false, error: "Notification request not found." });
    }

    const responder = await User.findById(req.userId).select("name role activeRole").exec();
    const isApprove = action === "approve";
    const newStatus = isApprove ? "approved" : "rejected";

    notification.status = newStatus;
    notification.read = true;
    await notification.save();

    const senderId = notification.senderId || notification.sender?._id || notification.sender;
    const statusText = isApprove ? "approved" : "declined";

    // 1. Sync Investment Interest if this request is an investment
    if (
      notification.type === "investment_interest" ||
      notification.entityType === "investment" ||
      notification.entityType === "investment_interest"
    ) {
      try {
        let interest = null;
        if (notification.entityId) {
          interest = await InvestmentInterest.findById(notification.entityId);
        }
        if (!interest && notification.startupId && senderId) {
          interest = await InvestmentInterest.findOne({
            startupId: notification.startupId,
            investorId: senderId,
          }).sort({ createdAt: -1 });
        }
        if (interest) {
          await investmentService.updateInterestStatus(interest._id, req.userId, {
            status: isApprove ? "accepted" : "rejected",
          });
        }
      } catch (err) {
        console.error("Failed to sync investment interest status on notification approval:", err);
      }
    }

    // 2. Sync Mentorship Request if this request is mentorship
    if (
      notification.type === "mentorship" ||
      notification.type === "mentorship_request" ||
      notification.entityType === "mentorship" ||
      notification.entityType === "mentorship_request"
    ) {
      try {
        let mentorshipReq = null;
        if (notification.entityId) {
          mentorshipReq = await MentorshipRequest.findById(notification.entityId);
        }
        if (!mentorshipReq && senderId) {
          mentorshipReq = await MentorshipRequest.findOne({
            $or: [
              { requestedBy: senderId, mentorId: req.userId },
              { founderId: req.userId, mentorId: senderId },
              { founderId: senderId, mentorId: req.userId },
            ],
          }).sort({ createdAt: -1 });
        }
        if (mentorshipReq) {
          await mentorService.updateMentorshipRequestStatus(mentorshipReq._id, req.userId, {
            status: isApprove ? "accepted" : "rejected",
          });
        }
      } catch (err) {
        console.error("Failed to sync mentorship request status on notification approval:", err);
      }
    }

    // 3. Sync Application if this request is job/project application
    if (
      notification.type === "application" ||
      notification.entityType === "application"
    ) {
      try {
        let application = null;
        if (notification.entityId) {
          application = await Application.findById(notification.entityId);
        }
        if (!application && notification.startupId && senderId) {
          application = await Application.findOne({
            startupId: notification.startupId,
            applicantId: senderId,
          }).sort({ createdAt: -1 });
        }
        if (application) {
          await applicationService.updateApplicationStatus(application._id, req.userId, {
            status: isApprove ? "accepted" : "rejected",
          });
        }
      } catch (err) {
        console.error("Failed to sync application status on notification approval:", err);
      }
    }

    // 4. If this is an Intro Request, establish conversation and check for pending investment interest
    if (notification.type === "intro_request" && isApprove) {
      try {
        const conversation = await messageService.getOrCreateConversation({
          userId: req.userId,
          targetUserId: senderId,
          type: "startup",
          relatedStartupId: notification.startupId || null,
        });
        await messageService.sendMessage(
          conversation._id,
          req.userId,
          `Hi ${notification.sender?.name || "there"}, introduction accepted! Glad to connect regarding ${notification.startupName || "our startup"}.`,
        );

        if (notification.startupId) {
          const linkedInterest = await InvestmentInterest.findOne({
            startupId: notification.startupId,
            investorId: senderId,
          }).sort({ createdAt: -1 });
          if (linkedInterest && linkedInterest.status === "pending") {
            await investmentService.updateInterestStatus(linkedInterest._id, req.userId, {
              status: "accepted",
            });
          }
        }
      } catch (err) {
        console.error("Failed to initialize conversation on intro approval:", err);
      }
    }

    await createNotification({
      recipientId: senderId,
      senderId: req.userId,
      type: "request_response",
      title: isApprove ? "Request Approved! 🎉" : "Request Update",
      message: `${responder?.name || "The founder"} ${statusText} your ${notification.type.replace("_", " ")}${notification.startupName ? ` for ${notification.startupName}` : ""}.`,
      startupId: notification.startupId,
      startupName: notification.startupName,
      status: newStatus,
    });

    broadcastToUser(senderId, {
      type: "request:responded",
      notificationId: notification._id.toString(),
      status: newStatus,
      action,
    });

    return res.json({
      success: true,
      data: toNotificationDTO(notification),
      notification: toNotificationDTO(notification),
      message: `Request successfully ${newStatus}.`,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /notifications/rsvp
 */
export async function rsvpEvent(req, res, next) {
  try {
    const { eventId, eventName } = req.body;
    if (!eventId) {
      return res.status(400).json({ success: false, error: "eventId is required." });
    }

    const user = await User.findById(req.userId).exec();
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    if (!user.workspace) user.workspace = {};
    const rsvps = user.workspace.eventRsvps || [];
    const isRsvpd = rsvps.includes(eventId);

    if (isRsvpd) {
      user.workspace.eventRsvps = rsvps.filter((id) => id !== eventId);
    } else {
      user.workspace.eventRsvps = [...rsvps, eventId];

      const organizers = await User.find({
        $or: [{ role: "founder" }, { activeRole: "founder" }, { roles: "founder" }],
        _id: { $ne: req.userId },
      }).limit(2);

      for (const org of organizers) {
        await Notification.create({
          recipient: org._id,
          recipientId: org._id,
          sender: user._id,
          senderId: user._id,
          type: "rsvp",
          title: `New RSVP: ${eventName || "Ecosystem Event"}`,
          message: `${user.name} registered to attend ${eventName || "an event"}.`,
          eventId,
          status: "read",
          read: false,
        });
      }
    }

    await user.save();

    return res.json({
      success: true,
      rsvpd: !isRsvpd,
      eventRsvps: user.workspace.eventRsvps,
      message: !isRsvpd ? "Seat confirmed! You are registered." : "RSVP cancelled.",
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * PATCH /notifications/:id/read
 */
export async function markNotificationRead(req, res, next) {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, $or: [{ recipient: req.userId }, { recipientId: req.userId }] },
      { $set: { read: true } },
      { returnDocument: "after" },
    ).populate("sender", "name avatarUrl role headline activeRole");

    if (!notification) {
      return res.status(404).json({ success: false, error: "Notification not found." });
    }

    return res.json({
      success: true,
      data: toNotificationDTO(notification),
      notification: toNotificationDTO(notification),
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * PATCH /notifications/read-all or /notifications/mark-all-read
 */
export async function markAllNotificationsRead(req, res, next) {
  try {
    await Notification.updateMany(
      { $or: [{ recipient: req.userId }, { recipientId: req.userId }], read: false },
      { $set: { read: true } },
    );
    return res.json({ success: true, message: "All notifications marked as read." });
  } catch (error) {
    return next(error);
  }
}

// ─── DTO ────────────────────────────────────────────────────────────────────

function toNotificationDTO(n) {
  const senderObj = n.senderId || n.sender;
  return {
    id: n._id.toString(),
    _id: n._id.toString(),
    recipient: (n.recipientId || n.recipient || "").toString(),
    recipientId: (n.recipientId || n.recipient || "").toString(),
    sender: senderObj
      ? {
          id: (senderObj._id || senderObj).toString(),
          _id: (senderObj._id || senderObj).toString(),
          name: senderObj.name || "Member",
          avatarUrl: senderObj.avatarUrl || "",
          role: senderObj.activeRole || senderObj.role || "member",
          headline: senderObj.headline || "",
        }
      : null,
    senderId: senderObj ? (senderObj._id || senderObj).toString() : null,
    type: n.type,
    entityType: n.entityType || "general",
    entityId: n.entityId || null,
    title: n.title,
    message: n.message,
    startupId: n.startupId || null,
    startupName: n.startupName || null,
    eventId: n.eventId || null,
    status: ACTIONABLE_REQUEST_TYPES.includes(n.type) ? (n.status || "pending") : (n.status === "approved" || n.status === "rejected" ? n.status : null),
    read: Boolean(n.read),
    createdAt: n.createdAt,
  };
}
