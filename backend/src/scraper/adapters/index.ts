import { FlipkartAdapter } from "./flipkart";
import { AmazonAdapter } from "./amazon";
import type { SiteAdapter } from "./types";

// Amazon adapter disabled: Amazon actively blocks raw HTTP fetches via
// TLS fingerprinting. Enabling it makes the app retry-fail every Amazon URL.
// To re-enable: uncomment the AmazonAdapter line below.
const adapters: SiteAdapter[] = [
  new FlipkartAdapter(),
  // new AmazonAdapter(),
];

export function getAdapter(url: string): SiteAdapter | null {
  return adapters.find((a) => a.canHandle(url)) ?? null;
}

export type { SiteAdapter, ExtractedProduct } from "./types";
