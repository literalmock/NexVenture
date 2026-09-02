import { Router } from "express";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  respondToRequest,
  rsvpEvent,
  sendRequest,
} from "../controllers/notificationController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, getNotifications);
router.post("/request", requireAuth, sendRequest);
router.post("/rsvp", requireAuth, rsvpEvent);
router.patch("/:id/respond", requireAuth, respondToRequest);
router.patch("/:id/read", requireAuth, markNotificationRead);
router.patch("/mark-all-read", requireAuth, markAllNotificationsRead);

export default router;
