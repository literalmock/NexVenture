import { Router } from "express";
import * as mentorController from "../controllers/mentorController.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/authorization.js";

const router = Router();

router.post("/request", requireAuth, requireRole("founder"), mentorController.requestMentorship);
router.post(
  "/startups/:startupId/request",
  requireAuth,
  requireRole("mentor"),
  mentorController.requestFounderMentorship,
);
router.get("/workspaces", requireAuth, mentorController.listMentorshipWorkspaces);
router.get("/workspaces/:id", requireAuth, mentorController.getMentorshipWorkspace);
router.patch("/workspaces/:id", requireAuth, mentorController.updateMentorshipWorkspace);
router.get("/", requireAuth, mentorController.listMentorshipRequests);
router.patch("/:id", requireAuth, mentorController.updateMentorshipRequest);

export default router;
