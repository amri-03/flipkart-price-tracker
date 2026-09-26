import type { Page } from "playwright";
import * as cheerio from "cheerio";
import { parsePrice } from "../utils/parser.utils";

export interface ExtractedProduct {
  price: number;
  currency?: string;
  title?: string;
  thumbnail?: string;
  source: "json-ld" | "next-data" | "og" | "dom";
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/**
 * FAST PATH: Fetches raw HTML via standard HTTP GET and parses with Cheerio.
 * Does NOT launch or require Chromium if Flipkart serves the data statically.
 */
export async function fetchFast(url: string): Promise<ExtractedProduct | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s fast-path timeout

    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-IN,en;q=0.9",
        "Cache-Control": "no-cache",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const html = await res.text();
    const result = parseHtml(html);
    if (result) {
      console.log(`[extract] fast-path HIT for ${url} (source: ${result.source})`);
    } else {
      console.log(`[extract] fast-path MISS for ${url} — falling back to Chromium`);
    }
    return result;
  } catch {
    return null;
  }
}

export function parseHtml(html: string): ExtractedProduct | null {
  const $ = cheerio.load(html);

  // 1. Check for Anti-Bot Challenge Screens
  const titleText = $("title").text().trim().toLowerCase();
  if (
    titleText.includes("access denied") ||
    titleText.includes("attention required") ||
    titleText.includes("robot check")
  ) {
    return null;
  }

  // 2. JSON-LD Structured Metadata
  const ldScripts = $('script[type="application/ld+json"]');
  for (let i = 0; i < ldScripts.length; i++) {
    try {
      const raw = $(ldScripts[i]).contents().text();
      if (!raw) continue;
      const data = JSON.parse(raw);
      const node = Array.isArray(data) ? data.find((n) => n?.offers) : data;

      if (node?.offers) {
        const offers = Array.isArray(node.offers) ? node.offers[0] : node.offers;
        const rawVal = offers.price ?? offers.lowPrice;
        const price = typeof rawVal === "number" ? rawVal : parsePrice(String(rawVal));

        if (price && Number.isFinite(price) && price > 0) {
          const thumbnail = Array.isArray(node.image) ? node.image[0] : node.image;
          return {
            price,
            currency: offers.priceCurrency ?? "INR",
            title: node.name || $("h1").first().text().trim() || undefined,
            thumbnail: typeof thumbnail === "string" ? thumbnail : undefined,
            source: "json-ld",
          };
        }
      }
    } catch {
      // Ignore JSON parse errors and continue
    }
  }

  // 3. __NEXT_DATA__ Embedded Payload (Flipkart hydration store)
  const nextData = $("#__NEXT_DATA__").contents().text();
  if (nextData) {
    try {
      const parsed = JSON.parse(nextData);
      const price = deepFindPrice(parsed);
      if (price) {
        const ogTitle = $('meta[property="og:title"]').attr("content") || $("h1").first().text().trim();
        const ogImage = $('meta[property="og:image"]').attr("content");
        return {
          price,
          currency: "INR",
          title: ogTitle || undefined,
          thumbnail: ogImage || undefined,
          source: "next-data",
        };
      }
    } catch {
      // Ignore malformed hydration store
    }
  }

  // 4. OpenGraph Product Meta Tags
  const ogPrice =
    $('meta[property="product:price:amount"]').attr("content") ??
    $('meta[property="og:price:amount"]').attr("content");

  if (ogPrice) {
    const price = parsePrice(ogPrice);
    if (price && Number.isFinite(price) && price > 0) {
      return {
        price,
        currency: $('meta[property="product:price:currency"]').attr("content") ?? "INR",
        title: $('meta[property="og:title"]').attr("content") || $("h1").first().text().trim() || undefined,
        thumbnail: $('meta[property="og:image"]').attr("content") || undefined,
        source: "og",
      };
    }
  }

  // 5. Static DOM Selectors
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
          source: "dom",
        };
      }
    }
  }

  return null;
}

function deepFindPrice(obj: any, depth = 0): number | null {
  if (depth > 8 || !obj || typeof obj !== "object") return null;

  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (typeof v === "number" && /price/i.test(k) && v > 0 && v < 10_000_000) {
      return v;
    }
    if (typeof v === "string" && /^\d+(\.\d+)?$/.test(v) && /price/i.test(k)) {
      const n = Number(v);
      if (n > 0) return n;
    }
    const found = deepFindPrice(v, depth + 1);
    if (found) return found;
  }
  return null;
}

/**
 * Fallback DOM and content extractor on an active Playwright page.
 */
export async function extractProduct(page: Page, url: string): Promise<ExtractedProduct | null> {
  const html = await page.content();
  const fromHtml = parseHtml(html);
  if (fromHtml) return fromHtml;

  // Last resort: query DOM directly on the active browser page
  const priceText = await page
    .locator('[class*="price"], ._30jeq3, .Nx9b7S, .Nx9bqj')
    .first()
    .textContent({ timeout: 4000 })
    .catch(() => null);

  if (priceText) {
    const price = parsePrice(priceText);
    if (price && Number.isFinite(price) && price > 0) {
      const pageTitle = await page.title().catch(() => "");
      const domImg = await page
        .locator("img[src*='/image/']")
        .first()
        .getAttribute("src")
        .catch(() => null);

      return {
        price,
        currency: "INR",
        title: pageTitle || undefined,
        thumbnail: domImg || undefined,
        source: "dom",
      };
    }
  }

  return null;
}
