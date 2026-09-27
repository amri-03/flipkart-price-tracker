import * as cheerio from "cheerio";
import type { Page } from "playwright";
import type { SiteAdapter, ExtractedProduct } from "./types";
import { fetchHtml, parseJsonLd } from "./shared";
import { parsePrice } from "../../utils/parser.utils";

export class AmazonAdapter implements SiteAdapter {
  name = "amazon";
  private domains = /amazon\.(in|com|co\.uk|de|ca)|amzn\.(in|to|eu)/i;

  canHandle(url: string): boolean {
    return this.domains.test(url);
  }

  normalizeUrl(rawUrl: string): { platformId: string; cleanUrl: string } | null {
    try {
      const parsed = new URL(rawUrl.trim());
      const hostname = parsed.hostname.toLowerCase();

      // Extract 10-character alphanumeric ASIN
      const asinMatch =
        parsed.pathname.match(/(?:dp|gp\/product|d)\/([A-Z0-9]{10})/i) ||
        rawUrl.match(/[?&]asin=([A-Z0-9]{10})/i);

      if (asinMatch) {
        const asin = asinMatch[1].toUpperCase();
        // Canonicalize domain to amazon.in if amzn shortlink
        const domain = hostname.includes("amazon.") ? hostname : "www.amazon.in";
        return {
          platformId: asin,
          cleanUrl: `https://${domain}/dp/${asin}`,
        };
      }

      // Fallback clean url
      return {
        platformId: parsed.pathname.replace(/^\/+|\/+$/g, "").replace(/\//g, "-") || "amazon-product",
        cleanUrl: `https://${hostname}${parsed.pathname}`,
      };
    } catch {
      return null;
    }
  }

  async fetchFast(url: string): Promise<ExtractedProduct | null> {
    const html = await fetchHtml(url);
    if (!html) return null;

    const $ = cheerio.load(html);
    const norm = this.normalizeUrl(url);

    // 1. JSON-LD Structured Metadata
    const ld = parseJsonLd($);
    if (ld && ld.price) {
      return {
        ...ld,
        platformId: norm?.platformId,
        cleanUrl: norm?.cleanUrl || url,
      };
    }

    // 2. Offscreen / Standard price tags
    const priceSelectors = [
      "#priceblock_ourprice",
      "#priceblock_dealprice",
      "#corePriceDisplay_desktop_feature_div .a-price .a-offscreen",
      ".apexPriceToPay .a-offscreen",
      ".a-price .a-offscreen",
      "#price",
    ];

    let extractedPrice: number | null = null;
    for (const sel of priceSelectors) {
      const text = $(sel).first().text().trim();
      if (text) {
        const parsed = parsePrice(text);
        if (parsed && Number.isFinite(parsed) && parsed > 0) {
          extractedPrice = parsed;
          break;
        }
      }
    }

    // 3. Fallback: regex for priceAmount in embedded Amazon JS objects
    if (!extractedPrice) {
      const match =
        html.match(/"priceAmount"\s*:\s*([\d.]+)/) ||
        html.match(/"buyingPrice"\s*:\s*"?([\d.]+)"?/);
      if (match) {
        const p = Number(match[1]);
        if (Number.isFinite(p) && p > 0) {
          extractedPrice = p;
        }
      }
    }

    if (extractedPrice) {
      const title =
        $("#productTitle").text().trim() ||
        $('meta[name="title"]').attr("content") ||
        $('meta[property="og:title"]').attr("content");

      const thumbnail =
        $("#landingImage").attr("src") ||
        $("#imgBlkFront").attr("src") ||
        $('meta[property="og:image"]').attr("content");

      return {
        price: extractedPrice,
        currency: "INR",
        title: title || undefined,
        thumbnail: thumbnail || undefined,
        platformId: norm?.platformId,
        cleanUrl: norm?.cleanUrl || url,
        source: "dom",
      };
    }

    return null;
  }

  async extractFromPage(page: Page, url: string): Promise<ExtractedProduct | null> {
    const norm = this.normalizeUrl(url);

    // Try price selectors on live DOM
    const selectors = [
      "#corePriceDisplay_desktop_feature_div .a-price .a-offscreen",
      ".apexPriceToPay .a-offscreen",
      ".a-price .a-offscreen",
      "#priceblock_ourprice",
      "#priceblock_dealprice",
      "#price",
    ];

    for (const sel of selectors) {
      const text = await page.locator(sel).first().textContent({ timeout: 4000 }).catch(() => null);
      if (text) {
        const price = parsePrice(text);
        if (price && Number.isFinite(price) && price > 0) {
          const title =
            (await page.locator("#productTitle").first().textContent({ timeout: 2000 }).catch(() => null)) ||
            (await page.title().catch(() => ""));

          const thumbnail =
            (await page.locator("#landingImage").first().getAttribute("src").catch(() => null)) ||
            (await page.locator("#imgBlkFront").first().getAttribute("src").catch(() => null));

          return {
            price,
            currency: "INR",
            title: title ? title.trim() : undefined,
            thumbnail: thumbnail || undefined,
            platformId: norm?.platformId,
            cleanUrl: norm?.cleanUrl || url,
            source: "dom",
          };
        }
      }
    }

    return null;
  }
}
