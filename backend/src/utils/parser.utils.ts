/**
 * Safely parses currency strings (e.g., "₹65,999", "1,299.50") into floating point numbers.
 *
 * @param priceString - The raw price string extracted from the DOM.
 * @returns The normalized price as a number.
 * @throws {Error} If the string cannot be parsed into a valid positive number.
 */
export function parsePrice(priceString: string): number {
    if (!priceString || !priceString.trim()) {
        throw new Error("Price string cannot be empty.");
    }

    // Remove currency symbols (₹, $), commas, and spaces
    const sanitized = priceString.replace(/[₹$,\s]/g, "");
    const parsed = parseFloat(sanitized);

    if (isNaN(parsed) || parsed < 0) {
        throw new Error(`Unable to convert price string "${priceString}" to a valid number.`);
    }

    return parsed;
}