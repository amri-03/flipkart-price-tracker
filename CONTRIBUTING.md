# Contributing to Flipkart Price Tracker

Thanks for helping. The project is moving quickly, so the best contributions are focused, easy to review, and easy to test.

## Branch model

Flipkart Price Tracker has two branches:

- **`dev`** — where all PRs land. Things can be in flux here; the merge button gets used freely.
- **`main`** — what users run. Curated and tested by the maintainer. Fast-forwarded to a stable `dev` commit at each release.

**Open your PR against `dev`, not `main`.** The GitHub "base" dropdown defaults to `dev`. If you opened a PR against `main` by accident, click "Edit" on the PR and change the base — no rebase needed.

End-users cloning the repo will land on `main` by default. If you want to contribute, run `git checkout dev` after cloning to switch to the active development branch.

## Before You Start

- Search existing issues and pull requests before opening a new one.
- Prefer one bug fix or feature per pull request.
- Avoid broad rewrites, formatting-only changes, or moving many files unless the issue is specifically about structure.
- If you want to work on a large feature, open an issue first and describe the approach.

## Setup

Docker is the recommended path for normal testing:

```bash
git clone https://github.com/amri-03/flipkart-price-tracker.git
cd flipkart-price-tracker
cp backend/.env.example backend/.env
docker compose up -d --build
```

Manual development requires Node.js v20+ and a running PostgreSQL instance:

```bash
# Setup backend API server
cd backend
npm install
npx playwright install chromium
npx prisma generate
npx prisma db push
npm run dev

# Setup frontend Vite dev server (in a separate terminal)
cd frontend
npm install
npm run dev
```

Windows command line (CMD) is not recommended for native run scripts due to environment handling differences; please use a standard Unix-like shell or PowerShell with bypass flags for local developer setup.

## Running Checks

Run the smallest relevant checks for your change:

```bash
# Run backend URL validation unit test
cd backend
npx ts-node ../testing/test-unit-1.ts

# Run Playwright scraper dry-run test
cd backend
npx ts-node ../testing/test-scraper.ts "https://www.flipkart.com/apple-iphone-16-teal-128-gb/p/itmce4bb3f55cc2f?pid=MOBH4DQFSY9ETDUU"
```

For Docker-related changes:

```bash
docker compose config
docker compose up -d --build
docker compose logs --tail=120 backend
```

Mention what you ran in the pull request description. If you could not run a check, say so.

## Pull Requests

Good pull requests usually include:

- A short explanation of the bug or feature.
- The files or areas changed.
- Manual test steps or automated test results from running the actual app, not just the test suite.
- Screenshots or short recordings for UI changes.
- Links to related issues, for example `Fixes #123`.

Please keep PRs small. Large PRs that mix unrelated cleanup, formatting, refactors, and behavior changes are much harder to review.

> **Auto-generated PRs.** If you are running an LLM agent (Devin, Cursor, OpenHands, Claude Code, etc.) against this repo: please open an issue describing the problem first instead of opening a PR directly. Bulk agent-generated PRs that don't match the project's visual style or contribution format will be closed without review, even when the underlying fix is correct.

## Style and Visual Changes

Flipkart Price Tracker has an intentional visual style. PRs that ignore it will be closed without merge, no matter how correct the underlying code is.

Before submitting any change that affects what the app looks like — buttons, icons, fonts, colors, spacing, layout, CSS, HTML, SVG, or React components:

1. **Run the app locally** and view the change in a browser. Type-checks and unit tests are not enough.
2. **Attach a screenshot or short clip** of the change in the running app. Add a mobile screenshot too if the change affects mobile responsiveness.
3. **Match the design specs:** Avoid introducing custom Tailwind configurations unless requested. Use vanilla CSS and coordinate with the existing layout tokens for premium UI cohesion.
