import { validateAndExtractFlipkartId } from "../utils/url.utils";
import { InvalidUrlError } from "../utils/errors";

interface TestCase {
    name: string;
    input: string;
    expectedOutput?: { platformId: string; cleanUrl: string };
    shouldThrow: boolean;
    expectedErrorMessage?: string;
}

const testCases: TestCase[] = [
    {
        name: "Valid standard desktop URL with UTM clutter",
        input: "https://www.flipkart.com/apple-iphone-15-black-128-gb/p/itm2d83c274b1263?pid=MOBGTAGPA3E4ZZGK&otracker=hp_omni_card_1&lid=LSTMOBGTAGPA3E4ZZGK",
        expectedOutput: {
            platformId: "MOBGTAGPA3E4ZZGK",
            cleanUrl: "https://www.flipkart.com/apple-iphone-15-black-128-gb/p/itm2d83c274b1263?pid=MOBGTAGPA3E4ZZGK",
        },
        shouldThrow: false,
    },
    {
        name: "Valid mobile app share link (dl.flipkart.com)",
        input: "https://dl.flipkart.com/dl/realme-c53-champion-gold-128-gb/p/itm984180d1952e4?pid=MOBGR8GYHAFNZEP8",
        expectedOutput: {
            platformId: "MOBGR8GYHAFNZEP8",
            cleanUrl: "https://www.flipkart.com/realme-c53-champion-gold-128-gb/p/itm984180d1952e4?pid=MOBGR8GYHAFNZEP8",
        },
        shouldThrow: false,
    },
    {
        name: "Invalid domain (Amazon Link)",
        input: "https://www.amazon.in/dp/B0CHX5R3P1",
        shouldThrow: true,
        expectedErrorMessage: "Invalid domain. Only Flipkart product links are supported.",
    },
    {
        name: "Malformed URL String",
        input: "not-a-valid-url-format",
        shouldThrow: true,
        expectedErrorMessage: "Malformed URL string. Please provide a valid HTTP/HTTPS link.",
    },
    {
        name: "Missing 'pid' query parameter",
        input: "https://www.flipkart.com/apple-iphone-15-black-128-gb/p/itm2d83c274b1263",
        shouldThrow: true,
        expectedErrorMessage: "Missing product identifier. Flipkart URLs must contain a 'pid' query parameter.",
    },
    {
        name: "Empty / Blank spaces input string",
        input: "   ",
        shouldThrow: true,
        expectedErrorMessage: "URL cannot be empty.",
    }
];

function runTests() {
    console.log("=== UNIT 1: RUNNING URL VALIDATOR & EXTRACTOR TESTS ===\n");
    let passedCount = 0;

    for (const tc of testCases) {
        try {
            const result = validateAndExtractFlipkartId(tc.input);

            if (tc.shouldThrow) {
                console.error(`❌ [FAIL] ${tc.name}`);
                console.error(`   Expected error to be thrown, but got success output instead.`);
            } else if (
                result.platformId === tc.expectedOutput?.platformId &&
                result.cleanUrl === tc.expectedOutput?.cleanUrl
            ) {
                console.log(`✅ [PASS] ${tc.name}`);
                passedCount++;
            } else {
                console.error(`❌ [FAIL] ${tc.name}`);
                console.error(`   Expected:`, tc.expectedOutput);
                console.error(`   Got:     `, result);
            }
        } catch (error: any) {
            if (tc.shouldThrow) {
                const isCorrectError = error instanceof InvalidUrlError;
                const isCorrectMessage = error.message === tc.expectedErrorMessage;

                if (isCorrectError && isCorrectMessage) {
                    console.log(`✅ [PASS] ${tc.name} (Correctly threw: "${error.message}")`);
                    passedCount++;
                } else {
                    console.error(`❌ [FAIL] ${tc.name}`);
                    console.error(`   Error validation misaligned.`);
                    console.error(`   Expected: InvalidUrlError with "${tc.expectedErrorMessage}"`);
                    console.error(`   Got:      ${error.name} with "${error.message}"`);
                }
            } else {
                console.error(`❌ [FAIL] ${tc.name}`);
                console.error(`   Unexpected error thrown:`, error);
            }
        }
    }

    console.log(`\n=== RESULT: Passed ${passedCount}/${testCases.length} assertions ===`);
    if (passedCount !== testCases.length) {
        process.exit(1);
    }
}

runTests();