import * as cheerio from "cheerio";
import { getAdapter } from "../scraper/adapters";
import { withContext } from "../scraper/browserPool";
import {
  NetworkFetchError,
  ParsingError,
  AntiBotBlockedError,
} from "../utils/errors";

export interface ScrapedProduct {
  platformId: string;
  title: string;
  currentPrice: number;
  imageUrl: string;
  cleanUrl: string;
}

export class ScraperService {
  /**
   * Orchestrates fetching, validation, and parsing of a product page.
   * Routes through the SiteAdapter registry, using fast-path HTTP first
   * and falling back to pooled Playwright contexts when needed.
   */
  public async scrapeProduct(rawUrl: string): Promise<ScrapedProduct> {
    const adapter = getAdapter(rawUrl);
    if (!adapter) {
      throw new NetworkFetchError(
        `No site adapter registered for URL: ${rawUrl}`
      );
    }

    const norm = adapter.normalizeUrl?.(rawUrl) ?? {
      platformId: rawUrl,
      cleanUrl: rawUrl,
    };
    const { platformId, cleanUrl } = norm;

    // 1. FAST PATH: adapter-specific lightweight HTTP extraction
    try {
      const fast = await adapter.fetchFast(cleanUrl);
      if (fast && fast.price && fast.title && fast.thumbnail) {
        console.log(
          `[scraper] ${adapter.name} fast-path HIT (${fast.source}) - ${platformId} @ ${fast.currency}${fast.price}`
        );
        return {
          platformId: fast.platformId ?? platformId,
          title: fast.title,
          currentPrice: fast.price,
          imageUrl: fast.thumbnail,
          cleanUrl: fast.cleanUrl ?? cleanUrl,
        };
      }
    } catch (err: any) {
      console.warn(
        `[scraper] ${adapter.name} fast-path bypass for ${platformId}:`,
        err.message
      );
    }

    // 2. SLOW PATH: pooled Playwright fallback
    console.log(
      `[scraper] ${adapter.name} falling back to Chromium for ${platformId}...`
    );

    try {
      return await withContext(async (ctx) => {
        const page = await ctx.newPage();
        await page.goto(cleanUrl, {
          waitUntil: "domcontentloaded",
          timeout: 20000,
        });

        const html = await page.content();
        const $ = cheerio.load(html);

        // Anti-bot detection on rendered DOM
        this.checkForAntiBotBlocks(html, $);

        // Try adapter extraction first
        const extracted = await adapter.extractFromPage(page, cleanUrl);

        const title =
          extracted?.title ||
          $('meta[property="og:title"]').attr("content") ||
          $("h1").first().text().trim() ||
          null;
        const currentPrice = extracted?.price ?? null;
        const imageUrl =
          extracted?.thumbnail ||
          $('meta[property="og:image"]').attr("content") ||
          $("img[src*='/image/']").first().attr("src") ||
          null;

        if (!title || !currentPrice || !imageUrl) {
          const missing: string[] = [];
          if (!title) missing.push("title");
          if (!currentPrice) missing.push("price");
          if (!imageUrl) missing.push("imageUrl");
          throw new ParsingError(
            `Parsing failed. Missing required fields: [${missing.join(", ")}].`
          );
        }

        return {
          platformId: extracted?.platformId ?? platformId,
          title,
          currentPrice,
          imageUrl,
          cleanUrl: extracted?.cleanUrl ?? cleanUrl,
        };
      });
    } catch (error: any) {
      if (
        error instanceof ParsingError ||
        error instanceof AntiBotBlockedError
      ) {
        throw error;
      }
      throw new NetworkFetchError(
        `Failed to retrieve page via Chromium pool: ${
          error.message || "Unknown error"
        }`
      );
    }
  }

  /**
   * Inspects the page to detect bot blocks and soft redirects.
   */
  private checkForAntiBotBlocks(html: string, $: cheerio.CheerioAPI): void {
    const titleText = $("title").text().trim();
    const titleLower = titleText.toLowerCase();
    const bodyText = $("body").text().toLowerCase();

    const isAccessDenied =
      titleLower.includes("access denied") ||
      titleLower.includes("attention required");

    const isRedirectedToHome =
      titleText ===
      "Buy Products Online at Best Price in India - All Categories | Flipkart.com";

    const isErrorShell =
      bodyText.includes("oops! something broke") ||
      bodyText.includes("unable to open this right now");

    const hasCaptchaText =
      bodyText.includes("enter the characters you see below") ||
      bodyText.includes("verify you are a human") ||
      bodyText.includes("robot check");

    if (isAccessDenied || isRedirectedToHome || isErrorShell || hasCaptchaText) {
      let blockReason = "Unknown block";
      if (isAccessDenied) blockReason = "Access Denied / Firewall Block";
      if (isRedirectedToHome) blockReason = "Redirected to Homepage Shell";
      if (isErrorShell) blockReason = "React Route Crash / Soft Block";
      if (hasCaptchaText) blockReason = "CAPTCHA Screen Challenge";

      throw new AntiBotBlockedError(
        `Request blocked by security gate: [${blockReason}]. Page Title: "${titleText}"`
      );
    }
  }
}
