─────────────────────────────────────────────── ⊹ ࣪ ˖

# 🏷️ Flipkart Price Tracker

A lightweight, self-hosted, privacy-first personal price tracking dashboard for Flipkart. Built with React, Tailwind CSS, TypeScript, and Playwright to automatically bypass Akamai bot defenses.

---

## ✨ Core Features

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

---

## 📸 Screenshots & Interface Demo

> [!NOTE]
> Add screenshots of your self-hosted instance here to complete the dashboard presentation.

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

---

## 🚀 Quick Start (Docker - Recommended)

Deploy the entire tracker ecosystem in under two minutes using Docker Compose.

### Step 1: Clone the Repository
```bash
git clone https://github.com/amri-03/flipkart-price-tracker.git
cd flipkart-price-tracker
```

### Step 2: Configure the Environment
Copy the environment template file:
```bash
cp backend/.env.example backend/.env
```
Docker Compose utilizes container-to-container service networking, so database URLs are automatically pre-configured. Open `backend/.env` and update your alert target credentials (e.g., webhook tokens, chat IDs, or mail hosts).

### Step 3: Run the Stack
Spin up the PostgreSQL database, the scraper server, and the Nginx web client:
```bash
docker compose up --build -d
```

During startup:
1.  **PostgreSQL** (`db`) boots up and binds to a persistent storage volume (`pgdata`).
2.  **Backend API** (`backend`) waits for the database, automatically applies schema migrations (`npx prisma migrate deploy`), and starts the cron scheduler.
3.  **Frontend client** (`frontend`) compiles React static assets and serves them via Nginx.

### Accessing the Applications
*   **Web Dashboard**: [http://localhost](http://localhost) (HTTP Port 80)
*   **Backend REST API**: [http://localhost:5000/api](http://localhost:5000/api)

---

## 🛠️ Manual / Developer Setup (Native)

For active development, you can run the components natively on your host machine.

### Prerequisites
*   Node.js (v20+ recommended)
*   PostgreSQL running locally or on a server

### 1. Backend Setup
1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Install the required Playwright Chromium binaries:
    ```bash
    npx playwright install chromium
    ```
4.  Configure `.env` with a local PostgreSQL connection (e.g., `DATABASE_URL="postgresql://user:pass@localhost:5432/tracker_db"`).
5.  Generate the Prisma client types and apply migrations:
    ```bash
    npx prisma generate
    npx prisma db push
    ```
6.  Start the Express API server in development mode:
    ```bash
    npm run dev
    ```

### 2. Frontend Setup
1.  Navigate to the frontend directory:
    ```bash
    cd ../frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Launch the Vite development server:
    ```bash
    npm run dev
    ```
    The Vite console will serve the interface locally on [http://localhost:5173](http://localhost:5173).

---

## ⚙️ Environmental Configuration Matrix

Configure these variables inside your `backend/.env` file.

| Variable | Default Value | Description / Options |
| :--- | :--- | :--- |
| `PORT` | `5000` | The host port binding for the backend Express application. |
| `DATABASE_URL` | *Required* | Connection string to your PostgreSQL instance. |
| `SCRAPER_CRON_SCHEDULE` | `"0 3 * * *"` | Standard 5-field cron expression mapping when price checks trigger (Default: 3:00 AM daily). |
| `DISCORD_WEBHOOK_URL` | *Optional* | Target webhook URL to post formatted card embeds directly to a Discord server. |
| `TELEGRAM_BOT_TOKEN` | *Optional* | Authentication token generated by Telegram's `@BotFather`. |
| `TELEGRAM_CHAT_ID` | *Optional* | Target user, group, or channel chat ID for Telegram message delivery. |
| `SMTP_HOST` | *Optional* | The hostname of your SMTP email delivery server. |
| `SMTP_PORT` | `587` | The port your SMTP mail server listens on (typically `587` for TLS or `465` for SSL). |
| `SMTP_USER` | *Optional* | Your authentication username for the SMTP mail server. |
| `SMTP_PASS` | *Optional* | Your password/app key for the SMTP server. |
| `NOTIFICATION_FROM_EMAIL`| `"no-reply@tracker.io"`| The email sender alias that appears on price drop notifications. |
| `VITE_API_BASE_URL` | `"http://localhost:5000/api"`| (Frontend) The base endpoint routing frontend requests to the backend server. |

> [!TIP]
> *   **Discord Webhooks**: Inside Discord, go to **Server Settings** $\rightarrow$ **Integrations** $\rightarrow$ **Webhooks** $\rightarrow$ **New Webhook** to copy your webhook URL.
> *   **Telegram Alerts**: Message `@BotFather` on Telegram and type `/newbot` to generate a bot token. Then message `@userinfobot` to retrieve your unique account `chatId`.

---

## 🔧 Diagnostics & Operational Commands

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
npx ts-node src/scripts/test-scraper.ts "<FLIPKART_PRODUCT_URL>"
```

---

## 🔒 Security & Privacy

*   **Zero External Tracking**: All scraping queries and alerts run locally on your host. There are no tracking scripts, analytics cookies, or external servers monitoring the items you track.
*   **Environment Safety**: The `.env` file containing sensitive connection credentials, Discord tokens, or email passwords is protected by Git via our [.gitignore](backend/.gitignore) rules. Never push this file to public repositories.
*   **Public Access & SSL**: If you deploy this container publicly on a VPS or cloud provider, **do not** expose raw ports `80` or `5000` to the open web. It is highly recommended to place this stack behind an SSL-secured reverse proxy (such as Caddy, Cloudflare Tunnels, Nginx, or Traefik) to protect dashboard configurations.
