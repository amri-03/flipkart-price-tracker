import express from "express";
import cors from "cors";
import { PORT, NODE_ENV } from "./constants";
import productRoutes from "./api/routes/product.routes";
import alertRoutes from "./api/routes/alert.routes";
import { initializeCronScheduler } from "./jobs/cron.jobs";

const app = express();

app.use(cors());
app.use(express.json());

// Basic service availability check
app.get("/health", (req, res) => {
  res.json({ status: "ok", environment: NODE_ENV });
});

// Mount the frozen API endpoints
app.use("/api/products", productRoutes);
app.use("/api", alertRoutes);

// Global default error-handler catch middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled Server Error:", err);
  res.status(500).json({
    error: "InternalServerError",
    message: err.message || "An unexpected error occurred on the server.",
  });
});

// Initialize background tasks
initializeCronScheduler();

app.listen(PORT, () => {
  console.log(`🚀 Flipkart Tracker Server running on port ${PORT} [${NODE_ENV}]`);
});
