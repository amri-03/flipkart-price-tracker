# Flipkart Price Tracker

> **Branch note:** `main` is the default branch and contains the stable curated release. For the latest development changes (which may be unstable), use [`dev`](https://github.com/amri-03/flipkart-price-tracker/tree/dev).

A lightweight personal price tracking dashboard for Flipkart. Built with React, Tailwind CSS, TypeScript, and Playwright to automatically bypass Akamai bot defenses.

## Features

*   **Automated Price Ingestion**  
    `node-cron` orchestrates automated pricing updates in the background on a customizable schedule, recording price movement history over time.
*   **Akamai Bot Resilience**  
    Bypasses e-commerce scraper-blocks using headless Playwright Chromium instances. Leverages a robust three-tier selector fallback mechanism (`JSON-LD Product Schema` $\rightarrow$ `Open Graph SEO Meta Tags` $\rightarrow$ `DOM Selectors`) to guarantee extraction reliability.
*   **Interactive Price History**  
    Beautiful, responsive line graphs powered by **Recharts** with Indian Rupee (₹) currency formatting, custom hover tooltips, and chronological data sorting.
*   **Smart Alerts & Spam Protection**  
    Set target price thresholds. Features database-driven `cooldownHours` windows and unique constraint indexing to prevent email/message spamming.
*   **Multi-Channel Dispatch**  
    Send real-time alerts immediately when a product drops to or below your target price. Out-of-the-box routing supports:
    *   **Discord Webhooks**
    *   **Telegram Bot API**
    *   **SMTP Email Mailers**
*   **100% Self-Hosted**  
    Run completely on your own hardware using a local PostgreSQL instance. No third-party subscriptions, no telemetry, and no vendor lock-in.

## Demo

<details>
<summary>Screenshots & Interface Demo</summary>

### Personal Dashboard Preview

```
┌────────────────────────────────────────────────────────────────────────┐
│  🏷️ Flipkart Price Tracker                     [ Personal Dashboard ]  │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   ┌─────────────────────────────────────────────────────────┐          │
│   │ Paste Flipkart product link here...   [ Track Product ] │          │
│   └─────────────────────────────────────────────────────────┘          │
│                                                                        │
│   Tracked Items (3)                                                    │
│   ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐    │
│   │ iPhone 15         │ │ Wireless Mouse    │ │ Mechanical KB     │    │
│   │ Price: ₹65,999    │ │ Price: ₹1,499     │ │ Price: ₹4,299     │    │
│   │ [Chart] [Alerts]  │ │ [Chart] [Alerts]  │ │ [Chart] [Alerts]  │    │
│   └───────────────────┘ └───────────────────┘ └───────────────────┘    │
│                                                                        │
│   📈 Price History Chart (iPhone 15)                                   │
│   ┌─────────────────────────────────────────────────────────┐          │
│   │  ₹67,000 ───●                                           │          │
│   │  ₹66,000 ───────●                                       │          │
│   │  ₹65,000 ───────────●                                   │          │
│   │          12 Oct   14 Oct   16 Oct                       │          │
│   └─────────────────────────────────────────────────────────┘          │
└────────────────────────────────────────────────────────────────────────┘
```

</details>

## Quick Start

Defaults work out of the box: clone the repository, run the containers, and start tracking prices. The database setup is handled automatically via container networking. You only need to edit the environment variables in `backend/.env` to configure your preferred notification channels (Discord webhooks, Telegram bots, or SMTP mail keys).

When you first spin up the stack, the API server will automatically apply database migrations and start the background cron scheduler.

Looking to contribute, run tests, or perform a manual/developer setup? Please refer to the **[Contributing Guide (CONTRIBUTING.md)](CONTRIBUTING.md)** for native environment prerequisites and guidelines.

### Docker Compose (Recommended)

```bash
git clone https://github.com/amri-03/flipkart-price-tracker.git
cd flipkart-price-tracker

cp backend/.env.example backend/.env       # optional, recommended for alerts
```

Run `docker compose up --build -d` to build and start the containers.

When the containers are healthy, Nginx will serve the web dashboard on port 80 and the API will listen on port 5000. On the first startup, the backend automatically runs database migrations (`npx prisma migrate deploy`) and boots the cron scheduler.

Open `http://localhost` in your browser to access the web dashboard. The backend REST API endpoints are accessible at `http://localhost:5000/api`. If you want to change the bound ports, configure the port overrides in your `.env` file.

## Developer Setup

### Native Linux / macOS

```bash
git clone https://github.com/amri-03/flipkart-price-tracker.git
cd flipkart-price-tracker
cd backend
npm install                     # Install all backend API package dependencies
npx playwright install chromium # Download headless Chromium browser binaries for scraper
npx prisma generate             # Generate Prisma client type definitions for query builder
npx prisma db push              # Synchronize database schema and create tables locally
npm run dev &                   # Launch the Express server in development background process
cd ../frontend
npm install                     # Install all frontend user interface dependencies
npm run dev                     # Start Vite development server and launch web dashboard
```

**Requirements**: Node.js (v20+ recommended) to run the server and compile frontend assets, npm to manage packages, and a running PostgreSQL instance to store product and price histories. Playwright requires Chromium browser binaries to fetch Flipkart pages and extract prices.

Open `http://localhost:5173` to access the dashboard, and `http://localhost:5000` to interact with the backend API.

### Native Windows

**One command launcher** (automatically installs dependencies, configures local database, and runs both servers):
```bash
git clone https://github.com/amri-03/flipkart-price-tracker.git
cd flipkart-price-tracker
powershell -ExecutionPolicy Bypass -File .\start-windows.ps1
```

**Manual installation** (do it by hand):
```cmd
# Setup backend server
cd backend
npm install                     # Install all backend API package dependencies
npx playwright install chromium # Download headless Chromium browser binaries for scraper
npx prisma generate             # Generate Prisma client type definitions for query builder
npx prisma db push              # Synchronize database schema and create tables locally
start npm run dev               # Spawn backend API server in a separate cmd shell window

# Setup frontend dashboard
cd ..\frontend
npm install                     # Install all frontend user interface dependencies
start npm run dev               # Spawn Vite development server in a separate cmd shell window
```

**Requirements**: Node.js (v20+ recommended) to run package manager and runtimes, and a running PostgreSQL instance to store tracked items. Ensure your `DATABASE_URL` in `backend/.env` is configured correctly.

Open `http://localhost:5173` to access the dashboard, and `http://localhost:5000` to interact with the backend API.

## Environmental Configuration Matrix

Configure these variables inside your `backend/.env` file.

| Variable | Default Value | Description / Options |
| :--- | :--- | :--- |
| `PORT` | `5000` | The host port binding for the backend Express application. |
| `DATABASE_URL` | *Required* | Connection string to your PostgreSQL instance. |
| `SCRAPER_CRON_SCHEDULE` | `"0 3 * * *"` | Standard 5-field cron expression mapping when price checks trigger (Default: 3:00 AM IST daily). |
| `DISCORD_WEBHOOK_URL` | *Optional* | Target webhook URL to post formatted card embeds directly to a Discord server. |
| `TELEGRAM_BOT_TOKEN` | *Optional* | Authentication token generated by Telegram's `@BotFather`. |
| `TELEGRAM_CHAT_ID` | *Optional* | Target chat ID for message delivery (find your ID using [@userinfobot](https://t.me/userinfobot)). |
| `SMTP_HOST` | *Optional* | The hostname of your SMTP email delivery server. |
| `SMTP_PORT` | `587` | The port your SMTP mail server listens on (typically `587` for TLS or `465` for SSL). |
| `SMTP_USER` | *Optional* | Your authentication username for the SMTP mail server. |
| `SMTP_PASS` | *Optional* | Your password/app key for the SMTP server. |
| `NOTIFICATION_FROM_EMAIL`| `"no-reply@tracker.io"`| The email sender alias that appears on price drop notifications. |
| `VITE_API_BASE_URL` | `"http://localhost:5000/api"`| (Frontend) The base endpoint routing frontend requests to the backend server. |

## Diagnostics & Operational Commands

Quick cheat-sheet for running common administration and testing commands inside the workspace.

### Monitor Real-Time Crawler Logs
Watch Playwright extraction logs, cron starts, and notification dispatches:
```bash
docker compose logs -f backend
```

### Access Local Database tables (Prisma Studio)
Inspect raw product records, price histories, and active alert rows in a GUI spreadsheet:
```bash
cd backend
npx prisma studio
```
Access the dashboard at [http://localhost:5555](http://localhost:5555).

### Run Scraper Command-Line Dry Run
Manually trigger a script to scrape and extract metrics for a specific Flipkart URL:
```bash
cd backend
npx ts-node ../testing/test-scraper.ts "<FLIPKART_PRODUCT_URL>"
```

## Security & Privacy

*   **Zero External Tracking**: All scraping queries and alerts run locally on your host. There are no tracking scripts, analytics cookies, or external servers monitoring the items you track.
*   **Environment Safety**: The `backend/.env` file containing your sensitive database credentials and API tokens must be kept private and never committed or pushed to public repositories. This file is ignored by default in our [.gitignore](backend/.gitignore).
*   **Public Access & SSL**: If you deploy this container publicly on a VPS or cloud provider, **do not** expose raw ports `80` or `5000` to the open web. It is highly recommended to place this stack behind an SSL-secured reverse proxy (such as Caddy, Cloudflare Tunnels, Nginx, or Traefik) to protect dashboard configurations.

