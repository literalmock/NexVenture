import { Router } from "express";
import * as applicationController from "../controllers/applicationController.js";
import * as opportunityController from "../controllers/opportunityController.js";
import { requireAuth } from "../middleware/auth.js";
import { requireAnyRole, requireRole } from "../middleware/authorization.js";

const router = Router();

router.get("/", opportunityController.listOpportunities);
router.get("/:id", opportunityController.getOpportunity);
router.patch(
  "/:id",
  requireAuth,
  requireAnyRole(["founder"]),
  opportunityController.updateOpportunity,
);
router.delete(
  "/:id",
  requireAuth,
  requireAnyRole(["founder"]),
  opportunityController.deleteOpportunity,
);

// Student apply endpoint
router.post(
  "/:id/apply",
  requireAuth,
  requireRole("student"),
  applicationController.applyToOpportunity,
);

export default router;
