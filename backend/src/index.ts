import express from "express";
import cors from "cors";
import { PORT, NODE_ENV } from "./constants";
import productRoutes from "./api/routes/product.routes";
import alertRoutes from "./api/routes/alert.routes";
import authRoutes from "./api/routes/auth.routes";
import { requireAuth } from "./api/middleware/auth.middleware";
import { initializeCronScheduler } from "./jobs/cron.jobs";

const app = express();

app.use(cors());
app.use(express.json());

// Basic service availability check
app.get("/health", (req, res) => {
  res.json({ status: "ok", environment: NODE_ENV });
});

// Mount the public authentication routes
app.use("/api/auth", authRoutes);

// Mount the secured API endpoints using requireAuth middleware guard
app.use("/api/products", requireAuth, productRoutes);
app.use("/api", requireAuth, alertRoutes);


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
