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

    // 0. Product-level snooze check: skip all alerts if snoozed
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { alertSnoozedUntil: true },
    });

    if (product?.alertSnoozedUntil && product.alertSnoozedUntil > now) {
      console.log(
        `[alerts] Skipping product ${productId} (snoozed until ${product.alertSnoozedUntil.toISOString()})`
      );
      return;
    }

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
            // 3. Update the DB state first to reset the cooldown window and prevent concurrency race conditions
            await prisma.alert.update({
              where: { id: alert.id },
              data: { lastTriggeredAt: now },
            });

            // 4. Router dispatch based on selected channel (non-blocking background call)
            this.dispatchNotification(
              alert.notificationChannel,
              productId,
              productTitle,
              currentPrice,
              targetPriceNum,
              productUrl
            )
              .then(() => {
                console.log(`[ALERT] Dispatched notification successfully to ${alert.notificationChannel} for product "${productTitle.substring(0, 30)}..."`);
              })
              .catch((error: any) => {
                console.error(`[ALERT ERROR] Failed to dispatch alert on channel ${alert.notificationChannel}:`, error.message);
              });
          } catch (error: any) {
            console.error(`[ALERT DB ERROR] Failed to update alert timestamp:`, error.message);
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
    productId: string,
    title: string,
    current: number,
    target: number,
    url: string
  ): Promise<void> {
    const message = `🚨 **PRICE DROP ALERT!** 🚨\n\n**Product:** ${title}\n**Current Price:** ₹${current.toLocaleString("en-IN")}\n**Target Price:** ₹${target.toLocaleString("en-IN")}\n\n👉 Buy Now: ${url}`;

    const cleanEnvVar = (val: string | undefined): string => {
      if (!val) return "";
      return val.replace(/^['"]|['"]$/g, "").trim();
    };

    if (channel === "DISCORD") {
      const webhookUrl = cleanEnvVar(process.env.DISCORD_WEBHOOK_URL);
      if (!webhookUrl) throw new Error("DISCORD_WEBHOOK_URL is missing in environment profiles.");
      await axios.post(webhookUrl, { content: message });
    } 
    
    else if (channel === "TELEGRAM") {
      const botToken = cleanEnvVar(process.env.TELEGRAM_BOT_TOKEN);
      const chatId = cleanEnvVar(process.env.TELEGRAM_CHAT_ID);
      if (!botToken || !chatId) {
        throw new Error("TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is missing in environmental profiles.");
      }
      const telegramApi = `https://api.telegram.org/bot${botToken}/sendMessage`;

      // Inline keyboard: taps send callback_query to the bot's webhook.
      // Webhook route (/api/telegram/webhook) is not wired yet -- buttons
      // appear but taps have no effect until deploy-time webhook registration.
      const replyMarkup = {
        inline_keyboard: [[
          { text: "\u23F0 Snooze 24h", callback_data: `snooze:${productId}:24` },
          { text: "\uD83D\uDED1 Stop tracking", callback_data: `stop:${productId}` },
        ]],
      };

      await axios.post(telegramApi, {
        chat_id: chatId,
        text: message.replace(/\*\*/g, ""),
        reply_markup: replyMarkup,
      });
    } 
    
    else if (channel === "EMAIL") {
      const host = cleanEnvVar(process.env.SMTP_HOST);
      const portStr = cleanEnvVar(process.env.SMTP_PORT);
      const port = portStr ? parseInt(portStr, 10) : 587;
      const user = cleanEnvVar(process.env.SMTP_USER);
      const pass = cleanEnvVar(process.env.SMTP_PASS);
      const from = cleanEnvVar(process.env.NOTIFICATION_FROM_EMAIL) || "no-reply@tracker.io";

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
        to: user.includes("@") ? user : from, // Sends notification to yourself
        subject: `[Price Drop] ${title.substring(0, 40)}...`,
        text: message.replace(/\*\*/g, ""),
      });
    }
  }
}
