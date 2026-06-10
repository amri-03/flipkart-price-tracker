import { chromium } from "playwright";
import * as cheerio from "cheerio";
import { validateAndExtractFlipkartId } from "../utils/url.utils";
import { parsePrice } from "../utils/parser.utils";
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
    // Using a highly reputable desktop Chrome agent footprint
    private readonly userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

    /**
     * Orchestrates the fetching, validation, and parsing of a Flipkart product page.
     */
    public async scrapeProduct(rawUrl: string): Promise<ScrapedProduct> {
        const { platformId, cleanUrl } = validateAndExtractFlipkartId(rawUrl);

        const html = await this.fetchHtml(cleanUrl);

        const $ = cheerio.load(html);
        this.checkForAntiBotBlocks(html, $);

        const title = this.extractTitle($);
        const currentPrice = this.extractPrice($);
        const imageUrl = this.extractImageUrl($);

        if (!title || !currentPrice || !imageUrl) {
            const missingFields = [];
            if (!title) missingFields.push("title");
            if (!currentPrice) missingFields.push("price");
            if (!imageUrl) missingFields.push("imageUrl");
            throw new ParsingError(`Parsing failed. Missing required fields: [${missingFields.join(", ")}].`);
        }

        return {
            platformId,
            title,
            currentPrice,
            imageUrl,
            cleanUrl,
        };
    }

    /**
     * Fetches the raw HTML body using a headless Playwright Chromium instance.
     */
    private async fetchHtml(url: string): Promise<string> {
        let browser;
        try {
            browser = await chromium.launch({ headless: true });
            const context = await browser.newContext({
                userAgent: this.userAgent,
                viewport: { width: 1280, height: 800 }
            });
            const page = await context.newPage();
            await page.goto(url, {
                waitUntil: "domcontentloaded",
                timeout: 15000 // 15 seconds navigation timeout
            });
            const html = await page.content();
            return html;
        } catch (error: any) {
            throw new NetworkFetchError(
                `Failed to retrieve page. Network error: ${error.message || "Unknown error"}`
            );
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }

    /**
     * Inspects the page to detect both hard bot blocks and soft redirects.
     */
    private checkForAntiBotBlocks(html: string, $: cheerio.CheerioAPI): void {
        const titleText = $("title").text().trim();
        const bodyText = $("body").text().toLowerCase();

        // 1. Check for standard CDN blocks
        const isAccessDenied = titleText.toLowerCase().includes("access denied") || titleText.toLowerCase().includes("attention required");

        // 2. Check for soft-block redirects (Flipkart homepage served instead of product detail page)
        const isRedirectedToHome = titleText === "Buy Products Online at Best Price in India - All Categories | Flipkart.com";

        // 3. Check for Flipkart React App crash shell ("Oops! Something broke...")
        const isErrorShell = bodyText.includes("oops! something broke") || bodyText.includes("unable to open this right now");

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

        const domPriceSelectors = [".Nx9b7S", "._30jeq3", "._16Jgda"];
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