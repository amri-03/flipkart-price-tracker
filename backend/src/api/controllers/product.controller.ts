import { Request, Response, NextFunction } from "express";
import { prisma } from "../../services/db.service";
import { ScraperService } from "../../services/scraper.service";
import { enqueueScrape } from "../../queue/scrapeQueue";
import { getAdapter } from "../../scraper/adapters";

const scraperService = new ScraperService();

/**
 * POST /api/products
 * Registers a new product URL. Returns immediately with a placeholder row;
 * the first scrape is scheduled 1 hour later by the worker.
 */
export async function createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { url } = req.body;

    if (!url || typeof url !== "string") {
      res.status(400).json({ error: "InvalidInput", message: "A valid 'url' string parameter is required." });
      return;
    }

    // 1. Normalize URL via the adapter registry (no scraping yet)
    const adapter = getAdapter(url);
    if (!adapter) {
      res.status(400).json({
        error: "UnsupportedUrl",
        message: "No site adapter registered for this URL. Supported: Flipkart, Amazon.",
      });
      return;
    }

    const norm = adapter.normalizeUrl?.(url);
    if (!norm) {
      res.status(400).json({
        error: "InvalidUrlError",
        message: "Could not extract a product identifier from this URL.",
      });
      return;
    }

    // 2. Upsert with placeholder — worker fills title/image/price on first scrape
    const result = await prisma.$transaction(
      async (tx) => {
        const existing = await tx.product.findUnique({
          where: { platformId: norm.platformId },
        });

        // Already tracked — just re-enqueue a fast refresh
        if (existing) {
          return existing;
        }

        return tx.product.create({
          data: {
            platformId: norm.platformId,
            url: norm.cleanUrl,
            title: "Pending first check",
            imageUrl: null,
            currentPrice: 0,
          },
        });
      },
      { timeout: 15_000, maxWait: 10_000 }
    );

    // 3. Enqueue delayed scrape (1 hour). If product already existed, use a short delay.
    const isNew = (result as any).title === "Pending first check";
    await enqueueScrape(result.id, {
      delayMs: isNew ? 60 * 60 * 1000 : 5_000,
      force: true,
    });

    res.status(202).json({
      ...result,
      queued: true,
      message: isNew
        ? "Product registered. First price check scheduled for 1 hour from now."
        : "Product already tracked. Refresh enqueued.",
    });
  } catch (error: any) {
    if (error.name === "InvalidUrlError") {
      res.status(400).json({ error: "InvalidUrlError", message: error.message });
    } else {
      next(error);
    }
  }
}

/**
 * GET /api/products
 * Returns all currently tracked items.
 */
export async function listProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json(products);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/products/:id
 * Retrieves detail mapping for a single product.
 */
export async function getProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string };

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      res.status(404).json({ error: "NotFound", message: "Product not found." });
      return;
    }

    res.status(200).json(product);
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/products/:id
 * Deletes a product, cascadingly purging its price histories and alert configurations.
 */
export async function deleteProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string };

    const exists = await prisma.product.findUnique({ where: { id } });
    if (!exists) {
      res.status(404).json({ error: "NotFound", message: "Product not found." });
      return;
    }

    await prisma.product.delete({
      where: { id },
    });

    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/products/:id/refresh
 * Enqueues a high-priority scrape job into BullMQ.
 * Returns immediately with product context for responsive UX.
 */
export async function refreshProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string };

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      res.status(404).json({ error: "NotFound", message: "Product not found." });
      return;
    }

    // Enqueue with priority=1 (ahead of background cron jobs) and force=true (bypasses dedup)
    await enqueueScrape(id, { priority: 1, force: true });

    res.status(200).json({
      ...product,
      queued: true,
      message: "Price refresh enqueued successfully.",
    });
  } catch (error: any) {
    next(error);
  }
}

/**
 * POST /api/products/refresh-all
 * Enqueues all active products for a refresh with 2-second staggered intervals.
 */
export async function refreshAllProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const products = await prisma.product.findMany({ select: { id: true } });

    for (let i = 0; i < products.length; i++) {
      await enqueueScrape(products[i].id, { delayMs: i * 2000, force: true });
    }

    res.status(200).json({
      queued: products.length,
      message: `Enqueued ${products.length} products for refresh.`,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/products/:id/history
 * Returns historical charts data.
 */
export async function getProductHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string };

    const exists = await prisma.product.findUnique({ where: { id } });
    if (!exists) {
      res.status(404).json({ error: "NotFound", message: "Product not found." });
      return;
    }

    const history = await prisma.priceHistory.findMany({
      where: { productId: id },
      orderBy: { recordedAt: "asc" },
    });

    res.status(200).json({ history });
  } catch (error) {
    next(error);
  }
}
