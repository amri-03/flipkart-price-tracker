# ⚙️ Setup & Installation Guide

This guide provides step-by-step instructions for configuring, deploying, and running the **Flipkart Price Tracker** on your local machine or VPS.

---

## 📋 Prerequisites

Before starting, ensure you have the following installed:
*   **Docker & Docker Compose** (Highly Recommended) — to run the entire ecosystem with one command.
*   **Node.js (v20+) & npm** (If running natively/developing).
*   **PostgreSQL** (If running natively).

---

## 🛠️ Step 1: Environment Configuration

The application requires environment variables to connect to your database and dispatch alerts.

1.  Navigate to the `backend/` directory:
    ```bash
    cd backend
    ```
2.  Copy the environment template file:
    ```bash
    cp .env.example .env
    ```
3.  Open `backend/.env` in a text editor and update the variables:

### Configuration Breakdown

*   `DATABASE_URL`: The PostgreSQL connection string. If using Docker, this is configured automatically in the container ecosystem.
*   `SCRAPER_CRON_SCHEDULE`: A cron expression indicating when price checks should run. The default `"0 3 * * *"` runs daily at 3:00 AM.
*   `DISCORD_WEBHOOK_URL`: (Optional) Paste your Discord webhook link to receive alerts in a server channel. 
    *   *To create one: Go to Server Settings $\rightarrow$ Integrations $\rightarrow$ Webhooks $\rightarrow$ Create Webhook $\rightarrow$ Copy Webhook URL.*
*   `TELEGRAM_BOT_TOKEN` & `TELEGRAM_CHAT_ID`: (Optional) Used to deliver notifications via Telegram.
    *   *To create a bot: Start a chat with `@BotFather` on Telegram, send `/newbot`, and copy the API token.*
    *   *To get your Chat ID: Start a chat with your new bot, then query `@userinfobot` to retrieve your account ID.*
*   `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS`: (Optional) SMTP relay credentials to deliver alerts straight to your inbox.
*   `NOTIFICATION_FROM_EMAIL`: The email sender name display alias (e.g. `no-reply@tracker.io`).

---

## 🐋 Option A: Deploying with Docker (Recommended)

Docker packages all dependencies—including the headless Chromium libraries required by Playwright—ensuring the tracker runs smoothly on any system.

1.  Navigate to the repository root directory:
    ```bash
    cd ..
    ```
2.  Build and boot up the containers in detached (background) mode:
    ```bash
    docker compose up --build -d
    ```
    *   **What happens under the hood**: Docker launches PostgreSQL (`db`), builds the scraper API and runs migrations (`backend`), and compiles the React app inside Nginx (`frontend`).
3.  Confirm all services are running cleanly:
    ```bash
    docker compose ps
    ```

### Accessing the Tracker
*   **Web Dashboard (Nginx)**: Open [http://localhost](http://localhost) (HTTP Port 80).
*   **REST API (Express)**: Open [http://localhost:5000/api](http://localhost:5000/api).

---

## 💻 Option B: Running Natively for Development

If you prefer to run the components natively on your host machine for development:

### 1. Backend Setup
1.  Navigate to the `backend/` folder:
    ```bash
    cd backend
    ```
2.  Install packages:
    ```bash
    npm install
    ```
3.  Install Chromium binaries for Playwright:
    ```bash
    npx playwright install chromium
    ```
4.  Apply the database schema and generate the Prisma Client types:
    ```bash
    npx prisma generate
    npx prisma db push
    ```
5.  Start the API server in watch mode:
    ```bash
    npm run dev
    ```

### 2. Frontend Setup
1.  Open a new terminal window and navigate to the `frontend/` folder:
    ```bash
    cd frontend
    ```
2.  Install packages:
    ```bash
    npm install
    ```
3.  Configure `frontend/.env` if you want to override the backend endpoint URL (defaults to `http://localhost:5000/api`).
4.  Launch the Vite development server:
    ```bash
    npm run dev
    ```
    The Vite console will serve the client at [http://localhost:5173](http://localhost:5173).

---

## 🧪 Testing the Codebase

We have isolated our testing utilities inside the root `testing/` folder.

### 1. Run Unit Tests (URL Parsing Validation)
Verify the URL validation and FSN parsing code:
```bash
# From the root directory:
cd backend
npx ts-node ../testing/test-unit-1.ts
```

### 2. Run Scraper Dry Run
Manually test Playwright crawling against a real Flipkart product URL:
```bash
# From the root directory:
cd backend
npx ts-node ../testing/test-scraper.ts "https://www.flipkart.com/apple-iphone-15-black-128-gb/p/itm2d83c274b1263?pid=MOBGTAGPA3E4ZZGK"
```
On success, this extracts the product details (Title, Current Price, Image URL) and dumps the JSON payload directly into your terminal.

---

## ❓ Troubleshooting & Common Pitfalls

### 1. Scheduler triggers at unexpected times (Timezone Offset)
*   **The Problem:** By default, Linux containers run on UTC time. A schedule like `"0 3 * * *"` (3:00 AM) triggers at exactly **8:30 AM IST** (Indian Standard Time, which is UTC+5:30).
*   **The Solution:** You can synchronize your containers with your local timezone by adding the `TZ` environment variable to your services in `docker-compose.yml`:
    ```yaml
    environment:
      - TZ=Asia/Kolkata
    ```
    Once restarted, a `0 3 * * *` schedule will execute at exactly 3:00 AM local time.

### 2. SMTP Alerts fail with `No recipients defined` (Windows `\r` line endings)
*   **The Problem:** If you edit your `.env` file on Windows (which uses CRLF line endings) and load it into Docker using `env_file`, Docker preserves the trailing carriage returns (`\r`). This can result in variables being read with a trailing control character (e.g. `no-reply@tracker.io\r`), which breaks SMTP address parsing.
*   **The Solution:** The backend contains a built-in sanitization helper (`cleanEnvVar`) that automatically trims spaces and strips trailing `\r` characters. If you face issues on other clients, convert your `.env` line endings to LF (Unix format) using your text editor (e.g., VS Code or Notepad++).

### 3. SMTP Mailtrap / Gmail alerts timeout or fail
*   **The Problem:** Home ISPs often block ports `25` and `587` to prevent spam, resulting in SMTP connection timeouts.
*   **The Solution:** For Mailtrap, use port **`2525`** instead of `587` to bypass local ISP blocks. For Gmail, ensure you are using a dedicated 16-character **App Password** (not your regular login password).

### 4. Database port conflicts (Port 5432)
*   **The Problem:** If you already have PostgreSQL installed directly on your host computer (running as a Windows service on port 5432), Docker Compose will fail to bind to port 5432.
*   **The Solution:** Either stop your host's local PostgreSQL service (via Windows Services console) before running `docker compose up`, or change the host port binding in your `docker-compose.yml` to `"5433:5432"` and connect pgAdmin to port `5433`.

### 5. Querying the Database returns `0 rows` or syntax errors
*   **The Problem:** You connect pgAdmin to the default port and see empty tables, or running `SELECT * FROM Product;` throws a syntax error.
*   **The Solution:** 
    *   Make sure you connect pgAdmin to the **Docker database container** using password `postgres_secure_pass` (not your host Postgres instance).
    *   Prisma maps singular models to lowercase, pluralized SQL tables. You must query **`products`**, **`alerts`**, or **`price_histories`**:
        ```sql
        SELECT * FROM products;
        ```

### 6. Quiet Window behaves unexpectedly
*   **The Quiet Window (Cooldown):** Determines how many hours the app must wait before sending another alert for the same product after one triggers. This prevents spam.
*   **Instantly triggering alerts:** Set the Quiet Window parameter to **`0`** in the UI to allow alert dispatches on every single crawl.

