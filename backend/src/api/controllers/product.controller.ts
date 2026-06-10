import { Request, Response, NextFunction } from "express";
import { prisma } from "../../services/db.service";
import { ScraperService } from "../../services/scraper.service";

const scraperService = new ScraperService();

/**
 * POST /api/products
 * Registers and tracks a new product URL.
 */
export async function createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { url } = req.body;

    if (!url || typeof url !== "string") {
      res.status(400).json({ error: "InvalidInput", message: "A valid 'url' string parameter is required." });
      return;
    }

    // 1. Invoke the verified Playwright scraper
    const scraped = await scraperService.scrapeProduct(url);

    // 2. Perform transaction to insert/update Product and create a PriceHistory record
    const result = await prisma.$transaction(async (tx) => {
      // Upsert the Product record based on the unique platformId
      const product = await tx.product.upsert({
        where: { platformId: scraped.platformId },
        update: {
          currentPrice: scraped.currentPrice,
          url: scraped.cleanUrl, // Update to normalized URL if changed
        },
        create: {
          platformId: scraped.platformId,
          url: scraped.cleanUrl,
          title: scraped.title,
          imageUrl: scraped.imageUrl,
          currentPrice: scraped.currentPrice,
        },
      });

      // Write a new historical snapshot entry
      await tx.priceHistory.create({
        data: {
          productId: product.id,
          price: scraped.currentPrice,
        },
      });

      return product;
    });

    res.status(201).json(result);
  } catch (error: any) {
    if (error.name === "InvalidUrlError") {
      res.status(400).json({ error: "InvalidUrlError", message: error.message });
    } else if (error.name === "NetworkFetchError" || error.name === "AntiBotBlockedError") {
      res.status(502).json({ error: error.name, message: error.message });
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

    // Verify product exists before attempting delete
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
 * Force triggers an immediate check and updates the price.
 */
export async function refreshProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string };

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      res.status(404).json({ error: "NotFound", message: "Product not found." });
      return;
    }

    // Rescrape the canonical URL
    const scraped = await scraperService.scrapeProduct(product.url);

    const updatedProduct = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id },
        data: { currentPrice: scraped.currentPrice },
      });

      await tx.priceHistory.create({
        data: {
          productId: id,
          price: scraped.currentPrice,
        },
      });

      return updated;
    });

    res.status(200).json(updatedProduct);
  } catch (error: any) {
    if (error.name === "NetworkFetchError" || error.name === "AntiBotBlockedError") {
      res.status(502).json({ error: error.name, message: error.message });
    } else {
      next(error);
    }
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
