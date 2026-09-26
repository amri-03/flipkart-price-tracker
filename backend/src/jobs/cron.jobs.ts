import cron from "node-cron";
import { prisma } from "../services/db.service";
import { enqueueScrape } from "../queue/scrapeQueue";

/**
 * Initializes the automated recurring pricing scan.
 * Enqueues active products to BullMQ with staggered intervals to prevent thundering herds.
 */
export function initializeCronScheduler(): void {
  const schedule = process.env.SCRAPER_CRON_SCHEDULE || "0 3 * * *";

  console.log(`⏰ [CRON] Initializing Scheduler Engine. Target Rule: "${schedule}"`);

  cron.schedule(schedule, async () => {
    console.log("⏰ [CRON START] Triggering automated recurring price crawl...");

    try {
      const products = await prisma.product.findMany({
        select: { id: true, title: true },
      });

      if (products.length === 0) {
        console.log("⏰ [CRON INFO] No products registered for tracking. Exiting crawl.");
        return;
      }

      console.log(`⏰ [CRON INFO] Found ${products.length} products. Enqueuing to BullMQ...`);

      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        // Stagger enqueues 3 seconds apart to avoid sudden spikes
        await enqueueScrape(product.id, { delayMs: i * 3000 });
      }

      console.log(`⏰ [CRON COMPLETE] Enqueued all ${products.length} products to scrape queue.`);
    } catch (cronError: any) {
      console.error("❌ [CRON GLOBAL EXCEPTION] Critical scheduler error:", cronError.message);
    }
  });
}
