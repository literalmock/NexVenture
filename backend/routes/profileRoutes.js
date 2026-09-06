import { Router } from "express";
import * as profileController from "../controllers/profileController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/me", requireAuth, (req, res, next) => {
  req.params.userId = req.userId;
  profileController.getProfile(req, res, next);
});

router.patch("/me", requireAuth, profileController.updateMyProfile);
router.get("/:userId", profileController.getProfile);

export default router;
