import IORedis from "ioredis";
import { REDIS_URL } from "../constants";

export const redis = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null, // REQUIRED by BullMQ
  enableReadyCheck: false,
});

redis.on("error", (err) => console.error("[redis] error:", err.message));
redis.on("connect", () => console.log("[redis] connected successfully"));
