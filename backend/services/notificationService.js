import Notification from "../models/Notification.js";

/**
 * Creates and persists a notification in the database.
 */
export const ACTIONABLE_REQUEST_TYPES = [
  "intro_request",
  "application",
  "mentorship",
  "mentorship_request",
  "connection_request",
  "investment_interest",
];

export async function createNotification({
  recipientId,
  senderId,
  type,
  entityType = "general",
  entityId = null,
  title,
  message,
  startupId = null,
  startupName = null,
  status = null,
}) {
  try {
    if (!recipientId || !senderId) return null;
    // Don't notify self
    if (recipientId.toString() === senderId.toString()) return null;

    const resolvedStatus =
      status !== null
        ? status
        : ACTIONABLE_REQUEST_TYPES.includes(type)
          ? "pending"
          : null;

    const notification = await Notification.create({
      recipient: recipientId,
      recipientId,
      sender: senderId,
      senderId,
      type,
      entityType,
      entityId: entityId ? entityId.toString() : null,
      title,
      message,
      startupId,
      startupName,
      status: resolvedStatus,
      read: false,
    });

    return notification;
  } catch (error) {
    console.error("Failed to create notification:", error.message);
    return null;
  }
}
