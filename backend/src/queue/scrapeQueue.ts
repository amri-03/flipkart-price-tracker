import { Queue } from "bullmq";
import { redis } from "./redis";

export const SCRAPE_QUEUE = "scrape";

export interface ScrapeJobPayload {
  productId: string;
}

export const scrapeQueue = new Queue<ScrapeJobPayload>(SCRAPE_QUEUE, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { age: 3600, count: 500 }, // retain up to 1 hour or 500 jobs
    removeOnFail: { age: 86400 },                 // retain failures for 24 hours
  },
});

/**
 * Helper to enqueue a product scrape job with deterministic deduplication.
 */
export async function enqueueScrape(
  productId: string,
  opts: { priority?: number; delayMs?: number; force?: boolean } = {}
) {
  const jobId = opts.force
    ? `scrape-${productId}-${Date.now()}`
    : `scrape-${productId}`;

  return scrapeQueue.add(
    "scrape-product",
    { productId },
    {
      jobId,
      priority: opts.priority,
      delay: opts.delayMs,
    }
  );
}
