import * as cheerio from "cheerio";
import type { ExtractedProduct } from "./types";
import { parsePrice } from "../../utils/parser.utils";

export const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export async function fetchHtml(url: string, timeoutMs = 8000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      headers: {
        "User-Agent": DEFAULT_UA,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-IN,en;q=0.9",
        "Cache-Control": "no-cache",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export function parseJsonLd($: cheerio.CheerioAPI): ExtractedProduct | null {
  const scripts = $('script[type="application/ld+json"]');
  for (let i = 0; i < scripts.length; i++) {
    try {
      const raw = $(scripts[i]).contents().text();
      if (!raw) continue;
      const data = JSON.parse(raw);
      const items = Array.isArray(data) ? data : data?.["@graph"] ? data["@graph"] : [data];
      const node = items.find((n: any) => n?.offers || n?.["@type"] === "Product");

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
      // Ignore malformed JSON-LD scripts
    }
  }
  return null;
}

export function parseOpenGraph($: cheerio.CheerioAPI): ExtractedProduct | null {
  const priceStr =
    $('meta[property="product:price:amount"]').attr("content") ??
    $('meta[property="og:price:amount"]').attr("content");

  if (!priceStr) return null;
  const price = parsePrice(priceStr);
  if (!price || !Number.isFinite(price) || price <= 0) return null;

  return {
    price,
    currency: $('meta[property="product:price:currency"]').attr("content") ?? "INR",
    title: $('meta[property="og:title"]').attr("content") || $("h1").first().text().trim() || undefined,
    thumbnail: $('meta[property="og:image"]').attr("content") || undefined,
    source: "og",
  };
}

export function deepFindPrice(obj: any, depth = 0): number | null {
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
