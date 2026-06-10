# 🚀 Flipkart Price Tracker

A modern, full-stack price tracking and automated alerting application for Flipkart products. Built with a robust headless scraping engine, automated cron execution, and real-time user notification dispatch.

---

## ⚡ Project Roadmap & Status

| Phase | Milestone | Status |
| :--- | :--- | :---: |
| **Phase 1** | Scraper Prototype & Playwright Akamai Bypass | **Completed** |
| **Phase 2** | Express REST API & automated `node-cron` checks | **Completed** |
| **Phase 3** | React SPA Client Dashboard (Vite, TS, Tailwind) | **In Progress** |
| **Phase 4** | Refinement, Docker Containerization & Jitter Spacing | **Planned** |

---

## 🛠️ Technology Stack

* **Backend**: Node.js, TypeScript, Express.js
* **Database**: PostgreSQL with Prisma ORM
* **Scraper**: Playwright (headless Chromium) & Cheerio
* **Scheduler**: `node-cron`
* **Notifications**: Discord webhooks, Telegram bot API, and SMTP email
* **Frontend**: React 18, Vite, TanStack Query (React Query), Tailwind CSS

---

## 🚀 Quick Start

### 1. Prerequisites
Create a `.env` configuration file in the `backend/` folder matching this template:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/tracker_db"
PORT=5000
NODE_ENV=development
# Discord/Telegram/SMTP Credentials
DISCORD_WEBHOOK_URL=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
SMTP_HOST=
SMTP_USER=
SMTP_PASS=
```

### 2. Run the Backend
```bash
cd backend
npm install
npx prisma db push
npm run dev
```

### 3. Run the Frontend
```bash
cd frontend
npm install
npm run dev
```

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
