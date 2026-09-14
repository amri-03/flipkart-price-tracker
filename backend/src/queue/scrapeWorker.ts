import { Worker, Job } from "bullmq";
import { redis } from "./redis";
import { SCRAPE_QUEUE, ScrapeJobPayload } from "./scrapeQueue";
import { prisma } from "../services/db.service";
import { ScraperService } from "../services/scraper.service";
import { AlertService } from "../services/alert.service";

const scraperService = new ScraperService();
const alertService = new AlertService();

async function processScrape(job: Job<ScrapeJobPayload>) {
  const { productId } = job.data;

  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    console.warn(`[worker] Product ${productId} not found in database. Skipping job.`);
    return { skipped: true, reason: "NotFound" };
  }

  console.log(`[worker] Processing scrape for product "${product.title.substring(0, 30)}..." (${productId})`);

  // 1. Scrape via ScraperService (leverages fetchFast, falls back to pooled Chromium)
  const scraped = await scraperService.scrapeProduct(product.url);

  // 2. Persist updated price & history in atomic database transaction
  const updatedProduct = await prisma.$transaction(async (tx) => {
    const updated = await tx.product.update({
      where: { id: productId },
      data: {
        currentPrice: scraped.currentPrice,
        title: scraped.title,
        imageUrl: scraped.imageUrl,
        url: scraped.cleanUrl,
      },
    });

    await tx.priceHistory.create({
      data: {
        productId,
        price: scraped.currentPrice,
      },
    });

    return updated;
  });

  // 3. Evaluate active alerts and dispatch notifications (Discord/Telegram/Email)
  await alertService.checkAndDispatchAlerts(
    product.id,
    scraped.currentPrice,
    scraped.title,
    scraped.cleanUrl
  );

  return {
    productId,
    price: scraped.currentPrice,
    title: scraped.title,
  };
}

export const scrapeWorker = new Worker<ScrapeJobPayload>(
  SCRAPE_QUEUE,
  processScrape,
  {
    connection: redis,
    concurrency: 2, // Max 2 concurrent browser contexts
    limiter: { max: 10, duration: 60000 }, // Rate limit to max 10 scrapes per minute
  }
);

scrapeWorker.on("completed", (job) => {
  console.log(`[worker] ✔ Scrape finished for ${job.data.productId}`);
});

scrapeWorker.on("failed", (job, err) => {
  console.error(`[worker] ✘ Scrape failed for ${job?.data?.productId}:`, err.message);
});
