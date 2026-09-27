import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { PORT, NODE_ENV } from "./constants";
import productRoutes from "./api/routes/product.routes";
import alertRoutes from "./api/routes/alert.routes";
import authRoutes from "./api/routes/auth.routes";
import { requireAuth } from "./api/middleware/auth.middleware";
import { apiLimiter, writeLimiter } from "./api/middleware/rateLimit.middleware";
import { initializeCronScheduler } from "./jobs/cron.jobs";
import { scrapeWorker } from "./queue/scrapeWorker";
import { closeBrowser } from "./scraper/browserPool";
import { redis } from "./queue/redis";

const app = express();

app.use(cors({
  origin: true,      // reflect request origin (needed for credentialed requests in dev)
  credentials: true, // allow cookies from the browser
}));
app.use(express.json());
app.use(cookieParser());

// Basic service availability check (public, unauthenticated)
app.get("/health", (_req, res) => {
  res.json({ status: "ok", environment: NODE_ENV });
});

// Broad rate limit on everything under /api
app.use("/api", apiLimiter);

// Public auth routes (login/logout/status)
app.use("/api/auth", authRoutes);

// Protected routes: requireAuth + stricter writeLimiter
app.use("/api/products", requireAuth, writeLimiter, productRoutes);
app.use("/api", requireAuth, writeLimiter, alertRoutes);

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled Server Error:", err);
  res.status(500).json({
    error: "InternalServerError",
    message: err.message || "An unexpected error occurred on the server.",
  });
});

initializeCronScheduler();

const server = app.listen(PORT, () => {
  console.log(`Flipkart Tracker Server running on port ${PORT} [${NODE_ENV}]`);
});

const shutdown = async (signal: string) => {
  console.log(`\n[server] ${signal} signal received. Shutting down gracefully...`);
  server.close(() => {
    console.log("[server] HTTP server closed.");
  });

  try {
    await scrapeWorker.close();
    console.log("[worker] Scrape worker closed.");
    await closeBrowser();
    console.log("[browser] Browser pool closed.");
    await redis.quit();
    console.log("[redis] Redis connection closed.");
  } catch (err: any) {
    console.error("[server] Error during graceful shutdown:", err.message);
  } finally {
    process.exit(0);
  }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
