import { Worker, Job } from "bullmq";
import * as Sentry from "@sentry/node";
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

  if (!product.isActive) {
    console.log(`[worker] Product ${productId} is inactive. Skipping.`);
    return { skipped: true, reason: "Inactive" };
  }

  console.log(`[worker] Processing scrape for product "${product.title.substring(0, 30)}..." (${productId})`);

  try {
    const scraped = await scraperService.scrapeProduct(product.url);

    const updatedProduct = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id: productId },
        data: {
          currentPrice: scraped.currentPrice,
          title: scraped.title,
          imageUrl: scraped.imageUrl,
          url: scraped.cleanUrl,
          consecutiveFailures: 0,
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
  } catch (error: any) {
    console.error(`[worker] Scrape failed for ${productId}:`, error.message);

    const newFailures = product.consecutiveFailures + 1;
    const shouldDisable = newFailures >= 3;

    await prisma.product.update({
      where: { id: productId },
      data: {
        consecutiveFailures: newFailures,
        isActive: shouldDisable ? false : product.isActive,
      },
    });

    if (shouldDisable) {
      console.warn(`[worker] Product ${productId} auto-disabled after 3 consecutive failures.`);
    }

    throw error;
  }
}

export const scrapeWorker = new Worker<ScrapeJobPayload>(
  SCRAPE_QUEUE,
  processScrape,
  {
    connection: redis,
    concurrency: 2,
    limiter: { max: 10, duration: 60000 },
  }
);

scrapeWorker.on("completed", (job) => {
  console.log(`[worker] OK Scrape finished for ${job.data.productId}`);
});

scrapeWorker.on("failed", (job, err) => {
  Sentry.captureException(err, {
    tags: { queue: "scrape" },
    extra: {
      productId: job?.data?.productId,
      jobId: job?.id,
      attemptsMade: job?.attemptsMade,
    },
  });

  console.error(`[worker] FAIL Scrape failed for ${job?.data?.productId}:`, err.message);
});