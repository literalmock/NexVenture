import { Router } from "express";
import * as investmentController from "../controllers/investmentController.js";
import * as opportunityController from "../controllers/opportunityController.js";
import * as pitchController from "../controllers/pitchController.js";
import * as startupController from "../controllers/startupController.js";
import { requireAuth } from "../middleware/auth.js";
import {
  requireAnyRole,
  requireStartupFounder,
  requireStartupMember,
} from "../middleware/authorization.js";

const router = Router();

// Startup CRUD
router.get("/", startupController.listStartups);
router.get("/mine", requireAuth, startupController.getMyStartup);
router.get("/:id", startupController.getStartup);
router.post("/", requireAuth, requireAnyRole(["founder"]), startupController.createOrUpdateStartup);

// Nested startup sub-resources
router.get(
  "/:startupId/members",
  requireAuth,
  requireStartupMember,
  startupController.listStartupMembers,
);
router.post(
  "/:startupId/members",
  requireAuth,
  requireStartupFounder,
  startupController.addStartupMember,
);
router.patch(
  "/:startupId/members/:memberId",
  requireAuth,
  requireStartupFounder,
  startupController.updateStartupMember,
);
router.delete(
  "/:startupId/members/:memberId",
  requireAuth,
  requireStartupFounder,
  startupController.removeStartupMember,
);
router.post("/:startupId/pitches", requireAuth, requireStartupFounder, pitchController.createPitch);
router.post(
  "/:startupId/investment-interests",
  requireAuth,
  requireAnyRole(["investor"]),
  investmentController.expressInterest,
);
router.post(
  "/:startupId/opportunities",
  requireAuth,
  requireStartupMember,
  opportunityController.createOpportunity,
);
router.patch("/:id", requireAuth, requireStartupFounder, startupController.updateStartup);
router.delete("/:id", requireAuth, requireStartupFounder, startupController.deleteStartup);

export default router;
