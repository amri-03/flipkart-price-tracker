import rateLimit from "express-rate-limit";

/**
 * Broad API rate limit — 120 requests per minute per IP.
 * Applied to all /api routes as a baseline defense.
 */
export const apiLimiter = rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "TooManyRequests", message: "Too many requests. Slow down." },
});

/**
 * Stricter limit for state-changing operations — 20 per minute per IP.
 * Applied to POST/PUT/DELETE under /api/products and /api/alerts.
 */
export const writeLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "TooManyRequests", message: "Too many write operations." },
});

/**
 * Login brute-force protection — 5 attempts per 15 minutes per IP.
 * Applied to POST /api/auth/login.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "TooManyRequests", message: "Too many login attempts. Try again later." },
});
