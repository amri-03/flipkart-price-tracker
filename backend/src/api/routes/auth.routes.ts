import { Router } from "express";
import { login, logout, status } from "../middleware/auth.middleware";
import { loginLimiter } from "../middleware/rateLimit.middleware";

const router = Router();

/**
 * GET /api/auth/status
 * Public: reports whether the current session is authenticated.
 */
router.get("/status", status);

/**
 * POST /api/auth/login
 * Public + rate-limited: exchanges { password } for a session cookie.
 */
router.post("/login", loginLimiter, login);

/**
 * POST /api/auth/logout
 * Public: clears the session cookie.
 */
router.post("/logout", logout);

export default router;
