import { Router } from "express";
import * as messageController from "../controllers/messageController.js";
import { requireAuth } from "../middleware/auth.js";
import { parseMessageMultipart } from "../middleware/multipartUpload.js";

const router = Router();

router.get("/", requireAuth, messageController.listConversations);
router.get("/unread-count", requireAuth, messageController.getUnreadCount);
router.post("/", requireAuth, messageController.getOrCreateConversation);
router.get("/:id/messages", requireAuth, messageController.getMessages);
router.post("/:id/messages", requireAuth, parseMessageMultipart, messageController.sendMessage);
router.get(
  "/:conversationId/attachments/:attachmentId",
  requireAuth,
  messageController.getAttachment,
);

export default router;
