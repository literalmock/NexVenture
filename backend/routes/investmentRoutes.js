import { Router } from "express";
import * as investmentController from "../controllers/investmentController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/deal-rooms", requireAuth, investmentController.listDealRooms);
router.get("/deal-rooms/:id", requireAuth, investmentController.getDealRoom);
router.patch("/deal-rooms/:id", requireAuth, investmentController.updateDealRoom);
router.get("/interests", requireAuth, investmentController.listInterests);
router.get("/", requireAuth, investmentController.listInterests);
router.patch("/:id", requireAuth, investmentController.updateInterest);

export default router;
