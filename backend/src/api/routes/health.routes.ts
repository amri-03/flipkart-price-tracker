import { Router } from "express";
import { prisma } from "../../services/db.service";
import { redis } from "../../queue/redis";
import { NODE_ENV } from "../../constants";

const router = Router();

/**
 * GET /api/health
 * Public, unauthenticated. Returns 200 when both Postgres and Redis are
 * reachable, 503 otherwise. Intended for Uptime Kuma / load balancer probes.
 */
router.get("/health", async (_req, res) => {
  const checks: Record<string, string> = {};
  let healthy = true;

  // Postgres probe
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db = "ok";
  } catch (err: any) {
    checks.db = "fail";
    healthy = false;
  }

  // Redis probe
  try {
    await redis.ping();
    checks.redis = "ok";
  } catch (err: any) {
    checks.redis = "fail";
    healthy = false;
  }

  res.status(healthy ? 200 : 503).json({
    status: healthy ? "ok" : "degraded",
    checks,
    uptime: process.uptime(),
    environment: NODE_ENV,
  });
});

export default router;
