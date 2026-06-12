import { ScraperService } from "../backend/src/services/scraper.service";
import * as fs from "fs";
import * as path from "path";

async function run() {
    const urlArg = process.argv[2];

    if (!urlArg) {
        console.error("❌ Error: Please provide a valid Flipkart product URL as an argument.");
        process.exit(1);
    }

    console.log(`🔍 Initializing scraper service...`);
    const scraper = new ScraperService();
    console.log(`🌐 Fetching and parsing...\n`);

    try {
        const startTime = Date.now();
        const result = await scraper.scrapeProduct(urlArg);
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log("✅ SCRAPING SUCCESSFUL!");
        console.log("--------------------------------------------------");
        console.log(JSON.stringify(result, null, 2));
        console.log("--------------------------------------------------");
        console.log(`⏱️  Duration: ${duration} seconds`);
    } catch (error: any) {
        console.error("\n❌ SCRAPING FAILED!");
        console.error("--------------------------------------------------");
        console.error(`Error Type:    ${error.name}`);
        console.error(`Error Message: ${error.message}`);
        console.error("--------------------------------------------------");

        // DIAGNOSTIC DUMP: Fetch raw HTML manually to see what Flipkart returned
        try {
            const axios = require("axios");
            const response = await axios.get(urlArg, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                }
            });
            const dumpPath = path.join(__dirname, "../backend/temp_diagnostic.html");
            fs.writeFileSync(dumpPath, response.data);
            console.log(`\n💾 DIAGNOSTIC: Raw HTML has been written to: \n   ${path.resolve(dumpPath)}`);
            console.log("👉 Open this file in your browser to check if it's a real block or a normal product page.");
        } catch (dumpErr: any) {
            console.error("Could not write diagnostic dump file:", dumpErr.message);
        }

        process.exit(1);
    }
}

run();
