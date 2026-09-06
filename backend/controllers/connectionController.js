import * as connectionService from "../services/connectionService.js";

export async function sendRequest(req, res, next) {
  try {
    const recipientId = req.params.userId || req.body.recipientId;
    if (!recipientId) {
      return res.status(400).json({ success: false, error: "Recipient ID is required." });
    }

    const connection = await connectionService.sendConnectionRequest(req.userId, recipientId);
    return res.status(201).json({ success: true, data: connection });
  } catch (error) {
    return next(error);
  }
}

export async function listConnections(req, res, next) {
  try {
    const connections = await connectionService.listConnections(req.userId, req.query.status);
    return res.json({ success: true, data: connections });
  } catch (error) {
    return next(error);
  }
}

export async function updateConnection(req, res, next) {
  try {
    const { status } = req.body;
    const connection = await connectionService.updateConnectionStatus(
      req.params.id,
      req.userId,
      status,
    );
    return res.json({ success: true, data: connection });
  } catch (error) {
    return next(error);
  }
}
