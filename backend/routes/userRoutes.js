import { Router } from "express";
import * as userController from "../controllers/userController.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/me", requireAuth, (req, res, next) => {
  req.params.id = req.userId;
  userController.getUser(req, res, next);
});

router.patch("/me", requireAuth, userController.updateMe);
router.get("/", optionalAuth, userController.getUsers);
router.get("/:id", userController.getUser);

export default router;
