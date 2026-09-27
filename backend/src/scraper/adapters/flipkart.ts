import * as cheerio from "cheerio";
import type { Page } from "playwright";
import type { SiteAdapter, ExtractedProduct } from "./types";
import { fetchHtml, parseJsonLd, parseOpenGraph, deepFindPrice } from "./shared";
import { parsePrice } from "../../utils/parser.utils";

export class FlipkartAdapter implements SiteAdapter {
  name = "flipkart";

  canHandle(url: string): boolean {
    return /flipkart\.com/i.test(url);
  }

  normalizeUrl(rawUrl: string): { platformId: string; cleanUrl: string } | null {
    try {
      const parsed = new URL(rawUrl.trim());
      const hostname = parsed.hostname.toLowerCase();
      if (!hostname.includes("flipkart.com")) return null;

      const pid = parsed.searchParams.get("pid")?.trim();

      // Check path for /p/itm...
      let cleanPath = parsed.pathname;
      if (cleanPath.startsWith("/dl/")) {
        cleanPath = cleanPath.substring(3);
      }
      if (!cleanPath.startsWith("/")) {
        cleanPath = "/" + cleanPath;
      }

      // If pid exists in query
      if (pid) {
        return {
          platformId: pid,
          cleanUrl: `https://www.flipkart.com${cleanPath}?pid=${pid}`,
        };
      }

      // If pid is not in query, check for itm... ID in pathname
      const itmMatch = cleanPath.match(/\/p\/(itm[a-zA-Z0-9]+)/i);
      if (itmMatch) {
        const itmId = itmMatch[1];
        return {
          platformId: itmId,
          cleanUrl: `https://www.flipkart.com${cleanPath}`,
        };
      }

      return {
        platformId: cleanPath.replace(/^\/+|\/+$/g, "").replace(/\//g, "-") || "flipkart-product",
        cleanUrl: `https://www.flipkart.com${cleanPath}`,
      };
    } catch {
      return null;
    }
  }

  async fetchFast(url: string): Promise<ExtractedProduct | null> {
    const html = await fetchHtml(url);
    if (!html) return null;

    const $ = cheerio.load(html);

    // Anti-bot detection
    const titleText = $("title").text().trim().toLowerCase();
    if (
      titleText.includes("access denied") ||
      titleText.includes("attention required") ||
      titleText.includes("robot check")
    ) {
      return null;
    }

    const norm = this.normalizeUrl(url);

    // 1. JSON-LD
    const ld = parseJsonLd($);
    if (ld && ld.price) {
      return {
        ...ld,
        platformId: norm?.platformId,
        cleanUrl: norm?.cleanUrl || url,
      };
    }

    // 2. __NEXT_DATA__
    const nextData = $("#__NEXT_DATA__").contents().text();
    if (nextData) {
      try {
        const parsed = JSON.parse(nextData);
        const price = deepFindPrice(parsed);
        if (price) {
          const ogTitle = $('meta[property="og:title"]').attr("content") || $("h1").first().text().trim();
          const ogImage = $('meta[property="og:image"]').attr("content") || $("img[src*='/image/']").first().attr("src");
          return {
            price,
            currency: "INR",
            title: ogTitle || undefined,
            thumbnail: ogImage || undefined,
            platformId: norm?.platformId,
            cleanUrl: norm?.cleanUrl || url,
            source: "next-data",
          };
        }
      } catch {
        // Ignore
      }
    }

    // 3. OpenGraph
    const og = parseOpenGraph($);
    if (og && og.price) {
      return {
        ...og,
        platformId: norm?.platformId,
        cleanUrl: norm?.cleanUrl || url,
      };
    }

    // 4. Static DOM Selectors
    const domSelectors = [".Nx9b7S", "._30jeq3", "._16Jgda", ".Nx9bqj"];
    for (const selector of domSelectors) {
      const text = $(selector).first().text();
      if (text) {
        const price = parsePrice(text);
        if (price && Number.isFinite(price) && price > 0) {
          const title = $('meta[property="og:title"]').attr("content") || $("h1").first().text().trim();
          const thumbnail =
            $('meta[property="og:image"]').attr("content") ||
            $("img[src*='/image/']").first().attr("src");

          return {
            price,
            currency: "INR",
            title: title || undefined,
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

  async extractFromPage(page: Page, url: string): Promise<ExtractedProduct | null> {
    const norm = this.normalizeUrl(url);

    // Try HTML parse of rendered page first
    const html = await page.content();
    const $ = cheerio.load(html);

    const ld = parseJsonLd($);
    if (ld && ld.price) {
      return { ...ld, platformId: norm?.platformId, cleanUrl: norm?.cleanUrl || url };
    }

    const og = parseOpenGraph($);
    if (og && og.price) {
      return { ...og, platformId: norm?.platformId, cleanUrl: norm?.cleanUrl || url };
    }

    // Live DOM selectors
    const selectors = [
      "div.Nx9bqj",
      "div._30jeq3",
      '[class*="_30jeq3"]',
      ".Nx9b7S",
      "._16Jgda",
    ];

    for (const sel of selectors) {
      const text = await page.locator(sel).first().textContent({ timeout: 3000 }).catch(() => null);
      if (text) {
        const price = parsePrice(text);
        if (price && Number.isFinite(price) && price > 0) {
          const pageTitle = (await page.title().catch(() => "")) || $("h1").first().text().trim();
          const domImg = await page
            .locator("img[src*='/image/']")
            .first()
            .getAttribute("src")
            .catch(() => null);

          return {
            price,
            currency: "INR",
            title: pageTitle || undefined,
            thumbnail: domImg || $('meta[property="og:image"]').attr("content") || undefined,
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
