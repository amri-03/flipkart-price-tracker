import * as cheerio from "cheerio";
import { validateAndExtractFlipkartId } from "../utils/url.utils";
import { parsePrice } from "../utils/parser.utils";
import { fetchFast, extractProduct } from "../scraper/extract";
import { withContext } from "../scraper/browserPool";
import {
    NetworkFetchError,
    ParsingError,
    AntiBotBlockedError
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
     * Orchestrates fetching, validation, and parsing of a Flipkart product page.
     * Uses a fast-path HTTP fetch first, falling back to pooled Playwright contexts.
     */
    public async scrapeProduct(rawUrl: string): Promise<ScrapedProduct> {
        const { platformId, cleanUrl } = validateAndExtractFlipkartId(rawUrl);

        // 1. FAST PATH: Attempt lightweight HTTP request without Chromium
        try {
            const fast = await fetchFast(cleanUrl);
            if (fast && fast.price && fast.title && fast.thumbnail) {
                console.log(`⚡ [scraper] Fast-path resolved ${platformId} (${fast.source}) - ₹${fast.price}`);
                return {
                    platformId,
                    title: fast.title,
                    currentPrice: fast.price,
                    imageUrl: fast.thumbnail,
                    cleanUrl,
                };
            }
        } catch (err: any) {
            console.warn(`[scraper] Fast-path bypass for ${platformId}:`, err.message);
        }

        // 2. SLOW PATH: Fall back to pooled headless Chromium context
        console.log(`🌐 [scraper] Launching pooled Chromium context for ${platformId}...`);
        try {
            return await withContext(async (ctx) => {
                const page = await ctx.newPage();
                await page.goto(cleanUrl, {
                    waitUntil: "domcontentloaded",
                    timeout: 20000,
                });

                // Check for fast extraction on rendered DOM
                const extracted = await extractProduct(page, cleanUrl);
                const html = await page.content();
                const $ = cheerio.load(html);

                this.checkForAntiBotBlocks(html, $);

                const title = extracted?.title || this.extractTitle($);
                const currentPrice = extracted?.price || this.extractPrice($);
                const imageUrl = extracted?.thumbnail || this.extractImageUrl($);

                if (!title || !currentPrice || !imageUrl) {
                    const missing = [];
                    if (!title) missing.push("title");
                    if (!currentPrice) missing.push("price");
                    if (!imageUrl) missing.push("imageUrl");
                    throw new ParsingError(`Parsing failed. Missing required fields: [${missing.join(", ")}].`);
                }

                return {
                    platformId,
                    title,
                    currentPrice,
                    imageUrl,
                    cleanUrl,
                };
            });
        } catch (error: any) {
            if (error instanceof ParsingError || error instanceof AntiBotBlockedError) {
                throw error;
            }
            throw new NetworkFetchError(
                `Failed to retrieve page via Chromium pool: ${error.message || "Unknown error"}`
            );
        }
    }

    /**
     * Inspects the page to detect both hard bot blocks and soft redirects.
     */
    private checkForAntiBotBlocks(html: string, $: cheerio.CheerioAPI): void {
        const titleText = $("title").text().trim();
        const bodyText = $("body").text().toLowerCase();

        // 1. Check for standard CDN blocks
        const isAccessDenied =
            titleText.toLowerCase().includes("access denied") ||
            titleText.toLowerCase().includes("attention required");

        // 2. Check for soft-block redirects
        const isRedirectedToHome =
            titleText === "Buy Products Online at Best Price in India - All Categories | Flipkart.com";

        // 3. Check for Flipkart React App crash shell
        const isErrorShell =
            bodyText.includes("oops! something broke") ||
            bodyText.includes("unable to open this right now");

        // 4. Check for explicit CAPTCHA indicators
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

    private extractTitle($: cheerio.CheerioAPI): string | null {
        const ogTitle = $('meta[property="og:title"]').attr("content");
        if (ogTitle) return ogTitle.trim();

        const h1Text = $("h1").first().text();
        if (h1Text) return h1Text.trim();

        return null;
    }

    private extractPrice($: cheerio.CheerioAPI): number | null {
        let jsonLdPrice: number | null = null;
        $('script[type="application/ld+json"]').each((_, element) => {
            try {
                const rawJson = $(element).html();
                if (!rawJson) return;
                const json = JSON.parse(rawJson);
                const schema = Array.isArray(json) ? json[0] : json;
                if (schema?.["@type"] === "Product" && schema.offers?.price) {
                    jsonLdPrice = parsePrice(schema.offers.price.toString());
                }
            } catch {
                // Suppress
            }
        });
        if (jsonLdPrice) return jsonLdPrice;

        const domPriceSelectors = [".Nx9b7S", "._30jeq3", "._16Jgda", ".Nx9bqj"];
        for (const selector of domPriceSelectors) {
            const priceText = $(selector).first().text();
            if (priceText) {
                try {
                    return parsePrice(priceText);
                } catch {
                    // Suppress and continue
                }
            }
        }

        return null;
    }

    private extractImageUrl($: cheerio.CheerioAPI): string | null {
        const ogImage = $('meta[property="og:image"]').attr("content");
        if (ogImage) return ogImage.trim();

        let jsonLdImage: string | null = null;
        $('script[type="application/ld+json"]').each((_, element) => {
            try {
                const rawJson = $(element).html();
                if (!rawJson) return;
                const json = JSON.parse(rawJson);
                const schema = Array.isArray(json) ? json[0] : json;
                if (schema?.["@type"] === "Product" && schema.image) {
                    jsonLdImage = Array.isArray(schema.image) ? schema.image[0] : schema.image;
                }
            } catch {
                // Suppress
            }
        });
        if (jsonLdImage) return jsonLdImage;

        const productImg = $("img[src*='/image/']").first().attr("src");
        if (productImg) return productImg;

        return null;
    }
}