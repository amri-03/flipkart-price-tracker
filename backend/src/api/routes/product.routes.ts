import { Router } from "express";
import * as productController from "../controllers/product.controller";

const router = Router();

router.post("/", productController.createProduct);
router.get("/", productController.listProducts);
router.get("/:id", productController.getProduct);
router.get("/:id/history", productController.getProductHistory);
router.delete("/:id", productController.deleteProduct);
router.post("/:id/refresh", productController.refreshProduct);

export default router;
