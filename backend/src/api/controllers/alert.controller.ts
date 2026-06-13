import { Request, Response, NextFunction } from "express";
import { prisma } from "../../services/db.service";

/**
 * POST /api/products/:productId/alerts
 * Configures an active alert on a tracked product.
 */
export async function createAlert(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { productId } = req.params as { productId: string };
    const { targetPrice, notificationChannel, cooldownHours } = req.body;

    // Validate product existence first
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      res.status(404).json({ error: "NotFound", message: "Target product not found." });
      return;
    }

    if (!targetPrice || typeof targetPrice !== "number") {
      res.status(400).json({ error: "InvalidInput", message: "A numeric 'targetPrice' value is required." });
      return;
    }

    const channel = notificationChannel || "TELEGRAM";
    if (!["TELEGRAM", "DISCORD", "EMAIL"].includes(channel)) {
      res.status(400).json({ error: "InvalidInput", message: "Invalid notification channel options." });
      return;
    }

    // Attempt creation with duplicate check catch
    try {
      const alert = await prisma.alert.create({
        data: {
          productId,
          targetPrice,
          notificationChannel: channel,
          cooldownHours: cooldownHours !== undefined ? cooldownHours : 24,
        },
      });
      res.status(201).json(alert);
    } catch (dbError: any) {
      // Prisma P2002 tracks Unique Constraints violations
      if (dbError.code === "P2002") {
        res.status(409).json({
          error: "Conflict",
          message: "An identical alert configuration already exists for this product and channel.",
        });
      } else {
        throw dbError;
      }
    }
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/products/alerts/:id
 * Toggles or updates alert parameters.
 */
export async function updateAlert(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const { targetPrice, isActive, cooldownHours } = req.body;

    const exists = await prisma.alert.findUnique({ where: { id } });
    if (!exists) {
      res.status(404).json({ error: "NotFound", message: "Alert configuration not found." });
      return;
    }

    const updated = await prisma.alert.update({
      where: { id },
      data: {
        targetPrice: targetPrice !== undefined ? targetPrice : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        cooldownHours: cooldownHours !== undefined ? cooldownHours : undefined,
      },
    });

    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/products/alerts/:id
 * Removes an alert configuration.
 */
export async function deleteAlert(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string };

    const exists = await prisma.alert.findUnique({ where: { id } });
    if (!exists) {
      res.status(404).json({ error: "NotFound", message: "Alert configuration not found." });
      return;
    }

    await prisma.alert.delete({ where: { id } });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/products/:productId/alerts
 * Returns all configured alert criteria for a single product.
 */
export async function listAlertsForProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { productId } = req.params as { productId: string };

    const exists = await prisma.product.findUnique({ where: { id: productId } });
    if (!exists) {
      res.status(404).json({ error: "NotFound", message: "Product not found." });
      return;
    }

    const alerts = await prisma.alert.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(alerts);
  } catch (error) {
    next(error);
  }
}
