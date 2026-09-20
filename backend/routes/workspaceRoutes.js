import { Router } from "express";
import {
  getWorkspace,
  getWorkspaceStats,
  toggleBookmark,
  updateWorkspace,
} from "../controllers/workspaceController.js";

const router = Router();

router.get("/", getWorkspace);
router.get("/stats", getWorkspaceStats);
router.patch("/", updateWorkspace);
router.post("/bookmarks", toggleBookmark);
router.post("/bookmarks/:startupId", toggleBookmark);

export default router;
