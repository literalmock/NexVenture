import { Router } from "express";
import * as applicationController from "../controllers/applicationController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, applicationController.listApplications);
router.patch("/:id", requireAuth, applicationController.updateApplication);

export default router;
