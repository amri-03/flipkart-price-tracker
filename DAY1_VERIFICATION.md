# Day 1 Verification — Empirical Results

**Date:** 2026-09-27
**Commit verified:** 58096a3 (dev branch)
**Environment:** Docker Desktop on Windows 11 + WSL 2, hostel network

## Checks performed

### 1. Fast-path extraction
Command: docker compose logs backend | Select-String "scraper|fast-path|Chromium"
Result:
- [extract] fast-path HIT ... (source: json-ld)
- Chromium **never launched** for tested URL
- Extracted: platformId: COMHGFYMMZYA4VYV, price ₹78,990, thumbnail captured

### 2. Chromium pool reuse
Command: docker compose logs backend | Select-String "Launching new Chromium" | Measure-Object
Result: Count: 0
Interpretation: Fast path handled 100% of the tested scrape; pool correctly lazy.

### 3. SIGTERM graceful shutdown
Command: docker compose stop backend
Result: container stopped in **7.4 seconds** — clean, no SIGKILL force-kill.
Restart via docker compose start backend succeeded in 3.6s.

## Verdict
Day 1 pipeline verified end-to-end:
- add product -> scrape via fast-path HTTP (no Chromium) -> DB write
- API serves product JSON correctly
- Dashboard renders product card with real metadata
- Queue accepts jobs (efresh-all returns {queued:N})
- Redis connection stable, BullMQ job tracking works
