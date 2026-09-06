import { WebSocket, WebSocketServer } from "ws";
import Conversation from "../models/Conversation.js";
import User from "../models/User.js";
import * as messageService from "../services/messageService.js";
import { getUserIdFromToken } from "../utils/token.js";

const MESSAGE_SOCKET_PATH = "/ws/messages";
const HEARTBEAT_MS = 30000;

export function attachMessageSocket(server) {
  const wss = new WebSocketServer({ noServer: true });
  const clientsByUserId = new Map();

  server.on("upgrade", async (request, socket, head) => {
    const url = new URL(request.url || "", "http://localhost");
    if (url.pathname !== MESSAGE_SOCKET_PATH) return;

    const token = url.searchParams.get("token");
    const userId = getUserIdFromToken(token);
    if (!userId) {
      rejectSocket(socket, 401);
      return;
    }

    try {
      const user = await User.findById(userId).select("_id isSuspended").exec();
      if (!user || user.isSuspended) {
        rejectSocket(socket, user?.isSuspended ? 403 : 401);
        return;
      }

      request.currentUser = user;
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } catch {
      rejectSocket(socket, 500);
    }
  });

  wss.on("connection", (ws, request) => {
    const userId = request.currentUser._id.toString();
    addClient(clientsByUserId, userId, ws);

    ws.isAlive = true;
    ws.userId = userId;
    sendJson(ws, { type: "connection:ready", userId });

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", (raw) => {
      handleSocketMessage(ws, clientsByUserId, raw).catch((error) => {
        sendJson(ws, {
          type: "error",
          error: error instanceof Error ? error.message : "WebSocket request failed.",
        });
      });
    });

    ws.on("close", () => {
      removeClient(clientsByUserId, userId, ws);
    });
  });

  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) {
        ws.terminate();
        return;
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, HEARTBEAT_MS);

  return {
    close() {
      clearInterval(heartbeat);
      for (const client of wss.clients) {
        client.terminate();
      }
      return new Promise((resolve) => wss.close(resolve));
    },
  };
}

async function handleSocketMessage(ws, clientsByUserId, raw) {
  const payload = parsePayload(raw);

  if (payload.type === "ping") {
    sendJson(ws, { type: "pong" });
    return;
  }

  if (payload.type === "conversation:join") {
    const conversation = await getParticipantConversation(payload.conversationId, ws.userId);
    ws.activeConversationId = conversation._id.toString();
    sendJson(ws, { type: "conversation:joined", conversationId: ws.activeConversationId });
    return;
  }

  if (payload.type === "typing:start" || payload.type === "typing:stop") {
    const conversation = await getParticipantConversation(payload.conversationId, ws.userId);
    broadcastToParticipants(
      clientsByUserId,
      conversation.participants,
      {
        type: payload.type,
        conversationId: conversation._id.toString(),
        userId: ws.userId,
      },
      { excludeSocket: ws },
    );
    return;
  }

  if (payload.type === "message:send") {
    const conversation = await getParticipantConversation(payload.conversationId, ws.userId);
    const content = String(payload.content || "").trim();
    if (!content) throw new Error("Message content cannot be empty.");

    const message = await messageService.sendMessage(conversation._id, ws.userId, content);
    const updatedConversation = await Conversation.findById(conversation._id)
      .populate("participants", "name email avatarUrl headline bio activeRole roles")
      .populate("relatedStartupId", "name slug logoUrl");

    sendJson(ws, {
      type: "message:sent",
      clientMessageId: payload.clientMessageId || null,
      conversationId: conversation._id.toString(),
      message,
      conversation: updatedConversation,
    });

    broadcastToParticipants(
      clientsByUserId,
      updatedConversation.participants,
      {
        type: "message:new",
        conversationId: conversation._id.toString(),
        message,
        conversation: updatedConversation,
      },
      { excludeSocket: ws },
    );
    return;
  }

  throw new Error("Unsupported WebSocket message type.");
}

async function getParticipantConversation(conversationId, userId) {
  if (!conversationId) throw new Error("conversationId is required.");
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
  }).select("_id participants");

  if (!conversation) throw new Error("Conversation not found or unauthorized.");
  return conversation;
}

function parsePayload(raw) {
  try {
    return JSON.parse(raw.toString());
  } catch {
    throw new Error("Invalid WebSocket payload.");
  }
}

function addClient(clientsByUserId, userId, ws) {
  const clients = clientsByUserId.get(userId) || new Set();
  clients.add(ws);
  clientsByUserId.set(userId, clients);
}

function removeClient(clientsByUserId, userId, ws) {
  const clients = clientsByUserId.get(userId);
  if (!clients) return;
  clients.delete(ws);
  if (!clients.size) clientsByUserId.delete(userId);
}

function broadcastToParticipants(clientsByUserId, participants, payload, { excludeSocket } = {}) {
  for (const participant of participants || []) {
    const userId = participant._id ? participant._id.toString() : participant.toString();
    const clients = clientsByUserId.get(userId);
    if (!clients) continue;
    for (const client of clients) {
      if (client !== excludeSocket) sendJson(client, payload);
    }
  }
}

function sendJson(ws, payload) {
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(payload));
}

function rejectSocket(socket, statusCode) {
  socket.write(`HTTP/1.1 ${statusCode} WebSocket Unauthorized\r\n\r\n`);
  socket.destroy();
}
