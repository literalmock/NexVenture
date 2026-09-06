import { Router } from "express";
import * as mentorController from "../controllers/mentorController.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/authorization.js";

const router = Router();

router.get("/", mentorController.listMentors);
router.patch("/profile", requireAuth, requireRole("mentor"), mentorController.updateMentorProfile);
router.get("/:id", mentorController.getMentor);

export default router;
