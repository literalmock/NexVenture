import { Router } from "express";
import authRoutes from "./authRoutes.js";
import healthRoutes from "./healthRoutes.js";
import notificationRoutes from "./notificationRoutes.js";
import postRoutes from "./postRoutes.js";
import startupRoutes from "./startupRoutes.js";
import workspaceRoutes from "./workspaceRoutes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/health", healthRoutes);
router.use("/notifications", notificationRoutes);
router.use("/posts", postRoutes);
router.use("/startups", startupRoutes);
router.use("/workspace", workspaceRoutes);

export default router;
