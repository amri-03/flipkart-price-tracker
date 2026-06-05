export class ScraperError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ScraperError";
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class InvalidUrlError extends ScraperError {
    constructor(message: string) {
        super(message);
        this.name = "InvalidUrlError";
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

/**
 * Thrown when the HTTP request fails, times out, or returns a non-200 status code.
 */
export class NetworkFetchError extends ScraperError {
    constructor(message: string) {
        super(message);
        this.name = "NetworkFetchError";
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

/**
 * Thrown when Flipkart returns valid HTML but our parsing logic cannot extract required data fields.
 */
export class ParsingError extends ScraperError {
    constructor(message: string) {
        super(message);
        this.name = "ParsingError";
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

/**
 * Thrown when Flipkart's anti-bot protections (security gates/CAPTCHAs) are triggered.
 */
export class AntiBotBlockedError extends ScraperError {
    constructor(message: string) {
        super(message);
        this.name = "AntiBotBlockedError";
        Object.setPrototypeOf(this, new.target.prototype);
    }
}