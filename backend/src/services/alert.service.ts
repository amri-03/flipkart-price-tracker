import axios from "axios";
import nodemailer from "nodemailer";
import { prisma } from "./db.service";

export class AlertService {
  /**
   * Evaluates active alerts for a product and dispatches notifications if prices drop.
   * 
   * @param productId - The database UUID of the product.
   * @param currentPrice - The newly scraped current price.
   * @param productTitle - The product name for payload formatting.
   * @param productUrl - Canonical URL of the item.
   */
  public async checkAndDispatchAlerts(
    productId: string,
    currentPrice: number,
    productTitle: string,
    productUrl: string
  ): Promise<void> {
    const now = new Date();

    // 1. Fetch active alerts configured for this product
    const activeAlerts = await prisma.alert.findMany({
      where: {
        productId,
        isActive: true,
      },
    });

    for (const alert of activeAlerts) {
      const targetPriceNum = Number(alert.targetPrice);

      // Check if price is lower than or equal to target threshold
      if (currentPrice <= targetPriceNum) {
        
        // 2. Validate quiet window (cooldown) to avoid spamming the user
        const lastTriggered = alert.lastTriggeredAt ? new Date(alert.lastTriggeredAt) : null;
        const cooldownMs = alert.cooldownHours * 60 * 60 * 1000;
        const isCooledDown = !lastTriggered || (now.getTime() - lastTriggered.getTime()) >= cooldownMs;

        if (isCooledDown) {
          try {
            // 3. Router dispatch based on selected channel
            await this.dispatchNotification(
              alert.notificationChannel,
              productTitle,
              currentPrice,
              targetPriceNum,
              productUrl
            );

            // 4. Update the DB state to reset the cooldown window
            await prisma.alert.update({
              where: { id: alert.id },
              data: { lastTriggeredAt: now },
            });

            console.log(`[ALERT] Dispatched notification successfully to ${alert.notificationChannel} for product "${productTitle.substring(0, 30)}..."`);
          } catch (error: any) {
            console.error(`[ALERT ERROR] Failed to dispatch alert on channel ${alert.notificationChannel}:`, error.message);
          }
        }
      }
    }
  }

  /**
   * Routes the payload to the respective communication provider.
   */
  private async dispatchNotification(
    channel: "TELEGRAM" | "DISCORD" | "EMAIL",
    title: string,
    current: number,
    target: number,
    url: string
  ): Promise<void> {
    const message = `🚨 **PRICE DROP ALERT!** 🚨\n\n**Product:** ${title}\n**Current Price:** ₹${current.toLocaleString("en-IN")}\n**Target Price:** ₹${target.toLocaleString("en-IN")}\n\n👉 Buy Now: ${url}`;

    if (channel === "DISCORD") {
      const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
      if (!webhookUrl) throw new Error("DISCORD_WEBHOOK_URL is missing in environment profiles.");
      await axios.post(webhookUrl, { content: message });
    } 
    
    else if (channel === "TELEGRAM") {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;
      if (!botToken || !chatId) {
        throw new Error("TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is missing in environmental profiles.");
      }
      const telegramApi = `https://api.telegram.org/bot${botToken}/sendMessage`;
      await axios.post(telegramApi, {
        chat_id: chatId,
        text: message.replace(/\*\*/g, ""), // Strip Discord bold markdowns for Telegram clean presentation
      });
    } 
    
    else if (channel === "EMAIL") {
      const host = process.env.SMTP_HOST;
      const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;
      const from = process.env.NOTIFICATION_FROM_EMAIL || "no-reply@tracker.io";

      if (!host || !user || !pass) {
        throw new Error("SMTP server configurations are incomplete in env profiles.");
      }

      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });

      await transporter.sendMail({
        from,
        to: user, // Sends notification to yourself
        subject: `[Price Drop] ${title.substring(0, 40)}...`,
        text: message.replace(/\*\*/g, ""),
      });
    }
  }
}
