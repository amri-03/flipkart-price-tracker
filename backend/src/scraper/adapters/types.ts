import type { Page } from "playwright";

export interface ExtractedProduct {
  platformId?: string;
  price: number | null;
  currency: string;
  title?: string;
  thumbnail?: string;
  cleanUrl?: string;
  source: "json-ld" | "next-data" | "og" | "dom" | "api";
}

export interface SiteAdapter {
  /** Human-readable name for logs */
  name: string;

  /** Returns true if this adapter can handle the given URL */
  canHandle(url: string): boolean;

  /** Try the fast HTTP path. Return null to fall through to Playwright. */
  fetchFast(url: string): Promise<ExtractedProduct | null>;

  /** Playwright DOM fallback. Called only if fetchFast returns null. */
  extractFromPage(page: Page, url: string): Promise<ExtractedProduct | null>;

  /** Extracts normalized platform identifier and clean URL if possible */
  normalizeUrl?(url: string): { platformId: string; cleanUrl: string } | null;
}
