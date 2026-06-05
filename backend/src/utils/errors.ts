/**
 * Base custom error class for scraper operations.
 */
export class ScraperError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ScraperError";
        // Ensure the prototype chain is correctly preserved for inheritance checks
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

/**
 * Thrown when an input URL is malformed, not a Flipkart domain, or lacks the required 'pid' parameter.
 */
export class InvalidUrlError extends ScraperError {
    constructor(message: string) {
        super(message);
        this.name = "InvalidUrlError";
        Object.setPrototypeOf(this, new.target.prototype);
    }
}