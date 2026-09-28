import dotenv from "dotenv";
import path from "path";

// Locate and load environmental variables from the backend root
dotenv.config({ path: path.join(__dirname, "../.env") });

export const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
export const NODE_ENV = process.env.NODE_ENV || "development";
export const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// --- Auth / JWT configuration ---
// DASHBOARD_PASSWORD_HASH_B64: base64-encoded bcrypt hash of the dashboard
// password. Base64 avoids `$` chars, which Docker Compose and dotenv would
// otherwise try to interpolate as variables.
export const DASHBOARD_PASSWORD_HASH_B64 = (process.env.DASHBOARD_PASSWORD_HASH_B64 || "").trim();
export const JWT_SECRET = (process.env.JWT_SECRET || "").trim();
export const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || "7d").trim();
export const AUTH_COOKIE_NAME = "auth_token";
export const SENTRY_DSN = (process.env.SENTRY_DSN || "").trim();

// Decode the bcrypt hash once at module load. Empty string if unset.
export const DASHBOARD_PASSWORD_HASH = DASHBOARD_PASSWORD_HASH_B64
  ? Buffer.from(DASHBOARD_PASSWORD_HASH_B64, "base64").toString("utf8")
  : "";
