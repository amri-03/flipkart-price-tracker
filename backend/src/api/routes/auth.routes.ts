import { Router, Request, Response } from "express";
import { ADMIN_PASSWORD } from "../../constants";

const router = Router();

/**
 * GET /api/auth/status
 * Public: Reports if the password gate is active.
 */
router.get("/status", (req: Request, res: Response) => {
  res.status(200).json({
    authRequired: !!ADMIN_PASSWORD,
  });
});

/**
 * POST /api/auth/verify
 * Public: Validates a password login attempt.
 */
router.post("/verify", (req: Request, res: Response) => {
  const { password } = req.body;

  if (!ADMIN_PASSWORD) {
    res.status(200).json({ success: true, message: "Authentication is not enabled." });
    return;
  }

  if (password === ADMIN_PASSWORD) {
    res.status(200).json({ success: true });
  } else {
    res.status(401).json({ success: false, message: "Incorrect password." });
  }
});

export default router;
