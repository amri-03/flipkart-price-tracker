import { FlipkartAdapter } from "./flipkart";
import { AmazonAdapter } from "./amazon";
import type { SiteAdapter } from "./types";

const adapters: SiteAdapter[] = [new FlipkartAdapter(), new AmazonAdapter()];

export function getAdapter(url: string): SiteAdapter | null {
  return adapters.find((a) => a.canHandle(url)) ?? null;
}

export type { SiteAdapter, ExtractedProduct } from "./types";
