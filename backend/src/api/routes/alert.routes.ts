import { Router } from "express";
import * as alertController from "../controllers/alert.controller";

const router = Router();

// Nested under products scope in index.ts
router.post("/products/:productId/alerts", alertController.createAlert);
router.get("/products/:productId/alerts", alertController.listAlertsForProduct);

// Flat endpoints for global alert manipulation
router.put("/alerts/:id", alertController.updateAlert);
router.delete("/alerts/:id", alertController.deleteAlert);

export default router;
