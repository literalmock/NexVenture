import { Router } from "express";
import { listStartups } from "../controllers/startupController.js";

const router = Router();

router.get("/", listStartups);

export default router;
