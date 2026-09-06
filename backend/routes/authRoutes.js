import { Router } from "express";
import {
  completeOnboarding,
  getCurrentUser,
  googleAuth,
  login,
  logout,
  resetPassword,
  signup,
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/login", login);
router.post("/signup", signup);
router.post("/google", googleAuth);
router.post("/logout", logout);
router.patch("/onboarding", requireAuth, completeOnboarding);
router.post("/reset-password", resetPassword);
router.get("/me", requireAuth, getCurrentUser);

export default router;
