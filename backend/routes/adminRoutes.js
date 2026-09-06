import { Router } from "express";
import * as adminController from "../controllers/adminController.js";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/authorization.js";

const router = Router();

router.post("/reports", requireAuth, adminController.createReport);
router.get("/reports", requireAuth, requireAdmin, adminController.listReports);
router.patch("/reports/:id", requireAuth, requireAdmin, adminController.resolveReport);
router.patch("/users/:id/suspend", requireAuth, requireAdmin, adminController.suspendUser);
router.patch("/mentors/:id/verify", requireAuth, requireAdmin, adminController.verifyMentor);

export default router;
