import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import {
  DASHBOARD_PASSWORD_HASH,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  AUTH_COOKIE_NAME,
  NODE_ENV,
} from "../../constants";

interface AuthPayload {
  sub: string;
}

/**
 * POST /api/auth/login
 * Body: { password: string }
 * Sets an httpOnly cookie `auth_token` and returns { ok: true }.
 */
export function login(req: Request, res: Response): void {
  const { password } = req.body ?? {};

  if (!password || typeof password !== "string") {
    res.status(400).json({ error: "BadRequest", message: "Password is required." });
    return;
  }

  if (!DASHBOARD_PASSWORD_HASH) {
    res.status(500).json({
      error: "ServerMisconfigured",
      message: "DASHBOARD_PASSWORD_HASH is not set on the server.",
    });
    return;
  }

  const ok = bcrypt.compareSync(password, DASHBOARD_PASSWORD_HASH);
  if (!ok) {
    res.status(401).json({ error: "Unauthorized", message: "Incorrect password." });
    return;
  }

  if (!JWT_SECRET) {
    res.status(500).json({
      error: "ServerMisconfigured",
      message: "JWT_SECRET is not set on the server.",
    });
    return;
  }

  const token = jwt.sign({ sub: "owner" } as AuthPayload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);

  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/",
  });

  res.status(200).json({ ok: true });
}

/**
 * POST /api/auth/logout
 * Clears the auth cookie.
 */
export function logout(_req: Request, res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, { path: "/" });
  res.status(200).json({ ok: true });
}

/**
 * GET /api/auth/status
 * Public endpoint for the frontend to check whether the current session is valid.
 */
export function status(req: Request, res: Response): void {
  const token = (req as any).cookies?.[AUTH_COOKIE_NAME];
  if (!token || !JWT_SECRET) {
    res.status(200).json({ authenticated: false });
    return;
  }
  try {
    jwt.verify(token, JWT_SECRET);
    res.status(200).json({ authenticated: true });
  } catch {
    res.status(200).json({ authenticated: false });
  }
}

/**
 * Express middleware that requires a valid JWT.
 * Accepts either the httpOnly cookie OR `Authorization: Bearer <token>`.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  // Defensive: if JWT_SECRET is missing, fail closed rather than open.
  if (!JWT_SECRET) {
    res.status(500).json({
      error: "ServerMisconfigured",
      message: "JWT_SECRET is not set on the server.",
    });
    return;
  }

  const cookieToken = (req as any).cookies?.[AUTH_COOKIE_NAME];
  const headerToken = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.substring(7).trim()
    : null;

  const token = cookieToken || headerToken;

  if (!token) {
    res.status(401).json({ error: "Unauthorized", message: "No session token provided." });
    return;
  }

  try {
    (req as any).user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized", message: "Invalid or expired session." });
  }
}
