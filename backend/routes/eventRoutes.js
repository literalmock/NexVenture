import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getUpcomingEvents, rsvpEvent } from "../controllers/eventController.js";

const router = Router();

router.get("/upcoming", getUpcomingEvents);
router.post("/:id/rsvp", requireAuth, rsvpEvent);
router.post("/rsvp", requireAuth, rsvpEvent);

export default router;
