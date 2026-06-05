import { InvalidUrlError } from "./errors";

export interface ExtractedProductDetails {
    /**
     * The extracted unique Flipkart product ID / FSN.
     */
    platformId: string;

    /**
     * The sanitized, tracking-free canonical URL.
     */
    cleanUrl: string;
}

/**
 * Validates a URL and extracts the unique Flipkart Product Identifier (pid).
 *
 * @param urlString - The raw, untrusted URL string inputted by the user.
 * @returns An object containing the platform ID and normalized clean URL.
 * @throws {InvalidUrlError} If the URL is malformed, not a Flipkart domain, or lacks a "pid" query parameter.
 */
export function validateAndExtractFlipkartId(urlString: string): ExtractedProductDetails {
    // 1. Guard against empty, null, or blank inputs
    if (!urlString || !urlString.trim()) {
        throw new InvalidUrlError("URL cannot be empty.");
    }

    let parsedUrl: URL;

    // 2. Safely parse string into a valid URL object
    try {
        parsedUrl = new URL(urlString.trim());
    } catch (error) {
        throw new InvalidUrlError("Malformed URL string. Please provide a valid HTTP/HTTPS link.");
    }

    // 3. Normalize and validate hostname (supports dl.flipkart.com, www.flipkart.com, flipkart.com)
    const hostname = parsedUrl.hostname.toLowerCase();
    const isValidDomain = hostname === "flipkart.com" || hostname.endsWith(".flipkart.com");

    if (!isValidDomain) {
        throw new InvalidUrlError("Invalid domain. Only Flipkart product links are supported.");
    }

    // 4. Retrieve unique Product Identifier (pid)
    const pid = parsedUrl.searchParams.get("pid");
    if (!pid || !pid.trim()) {
        throw new InvalidUrlError("Missing product identifier. Flipkart URLs must contain a 'pid' query parameter.");
    }

    // 5. Normalize pathname (strip mobile /dl/ path components if originating from app share links)
    let cleanPath = parsedUrl.pathname;
    if (cleanPath.startsWith("/dl/")) {
        cleanPath = cleanPath.substring(3); // Strips the "/dl" prefix
    }
    if (!cleanPath.startsWith("/")) {
        cleanPath = "/" + cleanPath;
    }

    // 6. Assemble the canonical, clean tracking-free product URL
    const cleanUrl = `https://www.flipkart.com${cleanPath}?pid=${pid}`;

    return {
        platformId: pid.trim(),
        cleanUrl,
    };
}