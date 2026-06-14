import { Request, Response, NextFunction } from "express";
import { ADMIN_PASSWORD } from "../../constants";

/**
 * Express middleware to restrict route access behind a single environmental password.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  // If no password is configured, run in public mode
  if (!ADMIN_PASSWORD) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized", message: "Missing or invalid authorization header." });
    return;
  }

  const token = authHeader.substring(7).trim();

  if (token !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Unauthorized", message: "Incorrect password." });
    return;
  }

  next();
}
