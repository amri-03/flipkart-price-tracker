# 🚀 Flipkart Price Tracker

A modern, full-stack price tracking and automated alerting application for Flipkart products. Built with a robust headless scraping engine, automated cron execution, and real-time user notification dispatch.

---

## ⚡ Project Roadmap & Status

| Phase | Milestone | Status |
| :--- | :--- | :---: |
| **Phase 1** | Scraper Prototype & Playwright Akamai Bypass | **Completed** |
| **Phase 2** | Express REST API & automated `node-cron` checks | **Completed** |
| **Phase 3** | React SPA Client Dashboard (Vite, TS, Tailwind) | **Completed** |
| **Phase 4** | Refinement, Docker Containerization & Jitter Spacing | **Completed** |

---

## 🛠️ Technology Stack

* **Backend**: Node.js, TypeScript, Express.js
* **Database**: PostgreSQL with Prisma ORM
* **Scraper**: Playwright (headless Chromium) & Cheerio
* **Scheduler**: `node-cron`
* **Notifications**: Discord webhooks, Telegram bot API, and SMTP email
* **Frontend**: React 18, Vite, TanStack Query (React Query), Tailwind CSS

---

## 🔌 API Endpoints Reference

### 📦 Product Operations
* `POST /api/products` — Register and crawl a new Flipkart product URL.
* `GET /api/products` — List all currently tracked products.
* `GET /api/products/:id` — Get detailed card for a single product.
* `GET /api/products/:id/history` — Fetch historical price history points.
* `POST /api/products/:id/refresh` — Force trigger an immediate price scrape.
* `DELETE /api/products/:id` — Delete product, price histories, and alerts.

### 🔔 Alert Operations
* `POST /api/products/:productId/alerts` — Create an active price drop alert.
* `GET /api/products/:productId/alerts` — List alert conditions for a product.
* `PUT /api/alerts/:id` — Update or toggle alert state.
* `DELETE /api/alerts/:id` — Remove an alert rule.

---

## 📖 Project Operation Manual

This guide outlines how to boot, customize, and maintain your system inside the Docker environment.

### 1. Initial Container Boot-Up
To build and run all services (PostgreSQL, the Express API with Playwright, and the Nginx frontend client) in the background, navigate to the repository root directory in your terminal and execute:
```bash
docker-compose up --build -d
```

**What happens during boot-up:**
1. **PostgreSQL (`db`)** initializes and allocates a persistent storage volume (`pgdata`) to preserve your historical prices across restarts.
2. **Backend API (`backend`)** waits for the database to pass its health checks, applies all database migrations automatically via `npx prisma migrate deploy`, and then initializes the `node-cron` scheduler.
3. **Client Dashboard (`frontend`)** compiles your React files into lightweight assets and mounts them directly inside the Nginx container on HTTP Port 80.

To verify all containers are running cleanly:
```bash
docker-compose ps
```

### 2. Monitoring Real-Time Scrapes & Cron Logs
You can watch your Playwright browser instances and price extraction routines in real time by viewing the container logs:
```bash
docker logs -f flipkart_tracker_api
```

**What you will see:**
* Upon startup, the scheduler logs its target execution rule: `⏰ [CRON] Initializing Scheduler Engine. Target Rule: "0 3 * * *"`
* During a scheduled or manual refresh, the logs show the browser initiating:
  ```text
  🔍 Initializing scraper service...
  🌐 Fetching and parsing...
  [ALERT] Dispatched notification successfully to DISCORD for product "Apple iPhone 17..."
  ⏱️ [CRON DELAY] Sleeping 2 seconds before the next page request...
  ```

### 3. Configuring Custom Webhooks & Notification Settings
To activate real-time notifications for price drops, open the root `docker-compose.yml` file and populate your respective target values under the backend environment list:
```yaml
    environment:
      - PORT=5000
      - DATABASE_URL=postgresql://postgres:postgres_secure_pass@db:5432/flipkart_tracker?schema=public
      - SCRAPER_CRON_SCHEDULE=0 3 * * * # Adjust this standard cron string if you want more/less frequent scans
      
      # For Discord Alerts:
      - DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your-id/your-token
      
      # For Telegram Alerts:
      - TELEGRAM_BOT_TOKEN=123456789:ABCDefG...
      - TELEGRAM_CHAT_ID=987654321
      
      # For SMTP Email Alerts:
      - SMTP_HOST=smtp.mailtrap.io
      - SMTP_PORT=587
      - SMTP_USER=your-smtp-username
      - SMTP_PASS=your-smtp-password
      - NOTIFICATION_FROM_EMAIL=price-drop-alerts@yourdomain.com
```

*Note: After modifying `docker-compose.yml` environment values, restart your backend service to apply the updates:*
```bash
docker-compose up -d backend
```

### 4. Local Database Management (Optional Diagnostic Tool)
If you ever want to view, filter, or manipulate raw database records directly without writing SQL queries, you can launch Prisma Studio locally.
1. Navigate to the `backend/` folder on your host machine:
   ```bash
   cd backend
   ```
2. Launch the Prisma Studio interface:
   ```bash
   npx prisma studio
   ```
3. Open `http://localhost:5555` in your browser. This web console lets you explore your active products, raw price histories, and notification trigger thresholds in a clean, spreadsheet-like interface.

### 5. Safe Teardown
If you ever need to stop the application or free up system memory:
```bash
# Stops and suspends all containers safely
docker-compose down

# Stops containers AND deletes the persistent PostgreSQL database volumes (WARNING: This purges history logs)
docker-compose down -v
```

---

## 🏛️ Summary of Built Architecture

* **Ingestion Resiliency**: Flipkart HTML parsing is guarded against layout shifts through a three-tier fallback selector strategy (JSON-LD Schema $\rightarrow$ SEO Open Graph Meta tags $\rightarrow$ CSS Classes) coupled with headless Playwright Chromium fetching.
* **Database Schema**: A normalized, index-optimized database schema that guarantees automatic cleanup of history nodes on untracking using relational `ON DELETE CASCADE` rules.
* **Alerting Controls**: Avoids notification fatigue through a configurable `cooldownHours` suppression window and prevents duplicate configurations using database-level unique constraint indexing.
* **Performance**: A client built with React and TanStack (React) Query, keeping loading spinners and memory overhead low, paired with responsive rendering by Recharts.
