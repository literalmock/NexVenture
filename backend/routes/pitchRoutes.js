import { Router } from "express";
import * as pitchController from "../controllers/pitchController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Optional auth so like status can be returned if token present
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return requireAuth(req, res, next);
  }
  return next();
}

router.get("/", optionalAuth, pitchController.listPitches);
router.get("/:id", optionalAuth, pitchController.getPitch);
router.patch("/:id", requireAuth, pitchController.updatePitch);
router.post("/:id/like", requireAuth, pitchController.likePitch);
router.delete("/:id/like", requireAuth, pitchController.likePitch);

export default router;
