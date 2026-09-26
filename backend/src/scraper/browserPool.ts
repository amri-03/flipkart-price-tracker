import { chromium, Browser, BrowserContext } from "playwright";

let browser: Browser | null = null;
let launching: Promise<Browser> | null = null;

const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export async function getBrowser(): Promise<Browser> {
  if (browser && browser.isConnected()) return browser;
  if (launching) return launching;

  launching = chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--disable-gpu",
    ],
  });
  console.log("[browser] Launching new Chromium instance (first launch or after disconnect)...");

  try {
    browser = await launching;
  } finally {
    launching = null;
  }

  browser.on("disconnected", () => {
    console.warn("[browser] Disconnected from Chromium instance. Will relaunch on next job.");
    browser = null;
  });

  return browser;
}

/**
 * Executes an operation inside a fresh, isolated BrowserContext sharing the parent Chromium process.
 * Automatically blocks heavy media/styling assets to minimize memory footprint and latency.
 */
export async function withContext<T>(
  fn: (ctx: BrowserContext) => Promise<T>,
  opts: { userAgent?: string } = {}
): Promise<T> {
  const b = await getBrowser();
  const ctx = await b.newContext({
    userAgent: opts.userAgent ?? DEFAULT_UA,
    viewport: { width: 1366, height: 768 },
    locale: "en-IN",
    timezoneId: "Asia/Kolkata",
  });

  // Block heavy resources at network level to save RAM & network bandwidth
  await ctx.route("**/*", (route) => {
    const type = route.request().resourceType();
    if (["image", "font", "media", "stylesheet"].includes(type)) {
      return route.abort();
    }
    return route.continue();
  });

  try {
    return await fn(ctx);
  } finally {
    await ctx.close().catch(() => {});
  }
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    console.log("[browser] Closing pooled browser instance...");
    await browser.close().catch(() => {});
    browser = null;
  }
}
