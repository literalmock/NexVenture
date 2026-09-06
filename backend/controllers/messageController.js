import * as messageService from "../services/messageService.js";

export async function listConversations(req, res, next) {
  try {
    const conversations = await messageService.listConversations(req.userId);
    return res.json({ success: true, data: conversations });
  } catch (error) {
    return next(error);
  }
}

export async function getOrCreateConversation(req, res, next) {
  try {
    const {
      targetUserId,
      type,
      relatedStartupId,
      startupId,
      investmentInterestId,
      mentorshipRequestId,
      conversationId,
    } = req.body;
    if (!targetUserId && !conversationId && !investmentInterestId && !mentorshipRequestId) {
      return res.status(400).json({
        success: false,
        error:
          "targetUserId, conversationId, investmentInterestId, or mentorshipRequestId is required.",
      });
    }

    const conversation = await messageService.getOrCreateConversation({
      userId: req.userId,
      targetUserId,
      type,
      relatedStartupId: relatedStartupId || startupId || null,
      investmentInterestId,
      mentorshipRequestId,
      conversationId,
    });
    return res.json({ success: true, data: conversation });
  } catch (error) {
    return next(error);
  }
}

export async function getMessages(req, res, next) {
  try {
    const result = await messageService.getConversationMessages(
      req.params.id,
      req.userId,
      req.query.page,
      req.query.limit,
    );
    return res.json({
      success: true,
      data: result.messages,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
}

export async function sendMessage(req, res, next) {
  try {
    const { content } = req.body;
    const files = req.files || [];
    if ((!content || !content.trim()) && !files.length) {
      return res
        .status(400)
        .json({ success: false, error: "Message content or attachment is required." });
    }

    const message = await messageService.sendMessage(req.params.id, req.userId, content, files);
    return res.status(201).json({ success: true, data: message });
  } catch (error) {
    return next(error);
  }
}

export async function getAttachment(req, res, next) {
  try {
    const attachment = await messageService.getConversationAttachment({
      conversationId: req.params.conversationId,
      attachmentId: req.params.attachmentId,
      userId: req.userId,
    });
    res.setHeader("Content-Type", attachment.type);
    res.setHeader("Content-Length", attachment.size);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${String(attachment.name).replace(/"/g, "'")}"`,
    );
    return res.sendFile(attachment.absolutePath);
  } catch (error) {
    return next(error);
  }
}
