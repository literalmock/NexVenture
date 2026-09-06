import Connection from "../models/Connection.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { createNotification } from "./notificationService.js";

export async function sendConnectionRequest(requesterId, recipientId) {
  if (requesterId.toString() === recipientId.toString()) {
    throw new Error("You cannot connect with yourself.");
  }

  const requester = await User.findById(requesterId);
  const recipient = await User.findById(recipientId);
  if (!recipient) throw new Error("Recipient not found.");

  // Check if existing connection either way
  let connection = await Connection.findOne({
    $or: [
      { requesterId, recipientId },
      { requesterId: recipientId, recipientId: requesterId },
    ],
  });

  if (connection) {
    if (connection.status === "accepted") {
      throw new Error("You are already connected.");
    }
    if (connection.status === "pending") {
      throw new Error("Connection request is already pending.");
    }
    // If was rejected, can re-open
    connection.requesterId = requesterId;
    connection.recipientId = recipientId;
    connection.status = "pending";
    await connection.save();
  } else {
    connection = await Connection.create({
      requesterId,
      recipientId,
      status: "pending",
    });
  }

  await createNotification({
    recipientId,
    senderId: requesterId,
    type: "connection_request",
    entityType: "connection",
    entityId: connection._id,
    title: "New Connection Request",
    message: `${requester?.name || "A user"} sent you a connection request.`,
  });

  return connection;
}

export async function listConnections(userId, status) {
  const filter = {
    $or: [{ requesterId: userId }, { recipientId: userId }],
  };
  if (status) filter.status = status;

  const connections = await Connection.find(filter)
    .populate("requesterId", "name email avatarUrl headline bio location skills activeRole roles")
    .populate("recipientId", "name email avatarUrl headline bio location skills activeRole roles")
    .sort({ updatedAt: -1 });

  return connections;
}

export async function updateConnectionStatus(connectionId, userId, status) {
  const connection = await Connection.findById(connectionId);
  if (!connection) throw new Error("Connection not found.");

  if (connection.recipientId.toString() !== userId.toString() && status === "accepted") {
    throw new Error("Only the recipient can accept a connection request.");
  }

  connection.status = status;
  await connection.save();

  if (status === "accepted") {
    // Open message thread
    let conversation = await Conversation.findOne({
      participants: { $all: [connection.requesterId, connection.recipientId] },
      type: "direct",
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [connection.requesterId, connection.recipientId],
        type: "direct",
        lastMessage: "Connected on NexVenture.",
        lastMessageAt: new Date(),
      });

      await Message.create({
        conversationId: conversation._id,
        senderId: userId,
        content: `Hi! We are now connected on NexVenture.`,
      });
    }

    await createNotification({
      recipientId: connection.requesterId,
      senderId: userId,
      type: "request_accepted",
      entityType: "connection",
      entityId: connection._id,
      title: "Connection Request Accepted!",
      message: `Your connection request has been accepted. You can now chat directly.`,
    });
  }

  return connection;
}
