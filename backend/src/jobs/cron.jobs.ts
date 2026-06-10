import cron from "node-cron";
import { prisma } from "../services/db.service";
import { ScraperService } from "../services/scraper.service";
import { AlertService } from "../services/alert.service";

const scraperService = new ScraperService();
const alertService = new AlertService();

// Standard delay utility
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Initializes the automated recurring pricing scan.
 */
export function initializeCronScheduler(): void {
  // Pull cron configurations from backend env configurations (Default: 3:00 AM daily)
  const schedule = process.env.SCRAPER_CRON_SCHEDULE || "0 3 * * *";

  console.log(`⏰ [CRON] Initializing Scheduler Engine. Target Rule: "${schedule}"`);

  cron.schedule(schedule, async () => {
    console.log("⏰ [CRON START] Starting automated recurring price crawl...");

    try {
      const products = await prisma.product.findMany();

      if (products.length === 0) {
        console.log("⏰ [CRON INFO] No products registered for tracking. Exiting crawl.");
        return;
      }

      console.log(`⏰ [CRON INFO] Found ${products.length} registered products to scan.`);

      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        console.log(`\n⏰ [CRON CRAWL (${i + 1}/${products.length})] Processing "${product.title.substring(0, 40)}..."`);

        try {
          // 1. Fetch updated metrics via Playwright
          const scraped = await scraperService.scrapeProduct(product.url);

          // 2. Write history and update current price in a single safe transaction
          await prisma.$transaction(async (tx) => {
            await tx.product.update({
              where: { id: product.id },
              data: { currentPrice: scraped.currentPrice },
            });

            await tx.priceHistory.create({
              data: {
                productId: product.id,
                price: scraped.currentPrice,
              },
            });
          });

          // 3. Dispatch alert checks to Telegram/Discord/Email
          await alertService.checkAndDispatchAlerts(
            product.id,
            scraped.currentPrice,
            product.title,
            product.url
          );

        } catch (crawlError: any) {
          // Ensure a failure on a single product doesn't crash the loop
          console.error(`❌ [CRON ERROR] Failed to update product "${product.id}":`, crawlError.message);
        }

        // 4. Inject 2-second rate delay jitter to preserve server IP health
        if (i < products.length - 1) {
          console.log("⏱️  [CRON DELAY] Sleeping 2 seconds before the next page request...");
          await sleep(2000);
        }
      }

      console.log("\n⏰ [CRON COMPLETE] All price crawl updates completed successfully.");
    } catch (cronError: any) {
      console.error("❌ [CRON GLOBAL EXCEPTION] Critical scheduler error:", cronError.message);
    }
  });
}
