import { Router } from "express";
import {
  getWorkspace,
  getWorkspaceStats,
  updateWorkspace,
} from "../controllers/workspaceController.js";

const router = Router();

router.get("/", getWorkspace);
router.get("/stats", getWorkspaceStats);
router.patch("/", updateWorkspace);

export default router;
