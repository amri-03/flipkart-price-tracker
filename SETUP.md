# ⚙️ Setup & Installation Guide

This guide provides step-by-step instructions for configuring, deploying, and running the **Flipkart Price Tracker** on your local machine or VPS.

---

## 📋 Prerequisites

Before starting, ensure you have the following:
*   **Docker & Docker Compose** (Highly Recommended) — to run the entire ecosystem (including the database, backend, and frontend) with one command. **Note:** If you use Docker, you do NOT need to install PostgreSQL or Node.js on your local machine.
*   **Node.js (v20+) & npm** (Only required if running natively/developing).
*   **PostgreSQL** (Only required if running natively/developing).

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
*   `SCRAPER_CRON_SCHEDULE`: A cron expression indicating when price checks should run. The default `"0 3 * * *"` runs daily at 3:00 AM local time (Indian Standard Time / IST) since the container is synchronized to the local timezone.
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

All testing utilities are located inside the root `testing/` folder.

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
npx ts-node ../testing/test-scraper.ts "https://www.flipkart.com/apple-iphone-16-teal-128-gb/p/itmce4bb3f55cc2f?pid=MOBH4DQFSY9ETDUU"
```
On success, this extracts the product details (Title, Current Price, Image URL) and dumps the JSON payload directly into your terminal.

---

## ❓ Troubleshooting & Helper Guides

### 1. Database Port Conflicts (Port 5432 Already in Use)
*   **The Problem:** If you already have PostgreSQL installed directly on your host computer (running as a native service on port 5432), Docker Compose will fail to start the database container, logging a port conflict error (`Bind for 0.0.0.0:5432 failed: port is already allocated`).
*   **The Solution:** 
    *   Stop your host's local PostgreSQL service (e.g., in Windows, open **Services** console, find **postgresql-x64-15**, and click **Stop**) before running `docker compose up`.
    *   Alternatively, edit `docker-compose.yml` to change the database host port mapping from `"5432:5432"` to `"5433:5432"`.

### 2. How to Inspect Database Tables (pgAdmin / DBeaver)
If you want to view, verify, or query the data scraped by the application:
1.  Open your database client (such as pgAdmin or DBeaver) and create a **New Server Connection**.
2.  Configure the connection details:
    *   **Host Name / Address:** `localhost`
    *   **Port:** `5432` (or `5433` if you modified it in Step 1)
    *   **Maintenance Database:** `flipkart_tracker`
    *   **Username:** `postgres`
    *   **Password:** `postgres_secure_pass` (do not use your local Windows Postgres password)
3.  Once connected, open the Query Tool and run:
    ```sql
    SELECT * FROM products;
    ```
    *Note: Prisma maps models to lowercase, pluralized table names. Ensure you query `products`, `price_histories`, or `alerts` instead of singular model names.*

### 3. Understanding the "Quiet Window" (Cooldown Hours)
*   **How it works:** When creating an alert rule, the **Quiet Window (hrs)** setting acts as a cooldown period. Once a price drop triggers an alert, the app stores that timestamp. It will then block any further notifications for that specific product until the specified number of hours has elapsed. This prevents your phone or inbox from being spammed on every scraping cycle.
*   **How to trigger alerts on every check:** If you want to receive an alert on every single scraper run whenever the price is below your target, set the Quiet Window to **`0`**.

