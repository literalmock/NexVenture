import { Router } from "express";
import * as connectionController from "../controllers/connectionController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, connectionController.listConnections);
router.post("/:userId", requireAuth, connectionController.sendRequest);
router.post("/", requireAuth, connectionController.sendRequest);
router.patch("/:id", requireAuth, connectionController.updateConnection);

export default router;
