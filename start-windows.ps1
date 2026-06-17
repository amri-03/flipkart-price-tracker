# Force console output to UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host ""
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "     Flipkart Price Tracker - Windows Setup        " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js installation
node -v 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Node.js is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install Node.js (v20+) and try again." -ForegroundColor Red
    Pause
    exit 1
}

# Configure environment variables (.env file wizard)
$envPath = "backend\.env"
$reconfigure = $false

if (Test-Path $envPath) {
    Write-Host "[INFO] An existing backend/.env configuration was found." -ForegroundColor Yellow
    $ans = Read-Host "Would you like to re-configure it? (y/n) [Default: n]"
    if ($ans -eq 'y' -or $ans -eq 'yes') {
        $reconfigure = $true
    }
} else {
    $reconfigure = $true
}

if ($reconfigure) {
    Write-Host ""
    Write-Host "---------------------------------------------------" -ForegroundColor Gray
    Write-Host "   Configuration Wizard                            " -ForegroundColor Cyan
    Write-Host "---------------------------------------------------" -ForegroundColor Gray
    Write-Host ""

    # DATABASE_URL input
    Write-Host "Enter your PostgreSQL Connection URL."
    Write-Host "Format: postgresql://username:password@localhost:5432/database_name?schema=public"
    $dbUrl = Read-Host "DATABASE_URL [Default: postgresql://postgres:postgres@localhost:5432/flipkart_tracker?schema=public]"
    if ([string]::IsNullOrWhiteSpace($dbUrl)) {
        $dbUrl = "postgresql://postgres:postgres@localhost:5432/flipkart_tracker?schema=public"
    }

    # ADMIN_PASSWORD input
    Write-Host ""
    Write-Host "Enter an Admin Password to secure your dashboard & REST API."
    $adminPassword = Read-Host "ADMIN_PASSWORD (press Enter to leave disabled/public mode)"

    # Telegram alerts configuration
    Write-Host ""
    $telegramOpt = Read-Host "Would you like to configure Telegram Alerts? (y/n) [Default: n]"
    $telegramToken = ""
    $telegramChatId = ""
    if ($telegramOpt -eq 'y' -or $telegramOpt -eq 'yes') {
        $telegramToken = Read-Host "TELEGRAM_BOT_TOKEN"
        $telegramChatId = Read-Host "TELEGRAM_CHAT_ID"
    }

    # Discord alerts configuration
    Write-Host ""
    $discordOpt = Read-Host "Would you like to configure Discord Webhooks? (y/n) [Default: n]"
    $discordWebhook = ""
    if ($discordOpt -eq 'y' -or $discordOpt -eq 'yes') {
        $discordWebhook = Read-Host "DISCORD_WEBHOOK_URL"
    }

    # SMTP alerts configuration
    Write-Host ""
    $smtpOpt = Read-Host "Would you like to configure Email (SMTP) alerts? (y/n) [Default: n]"
    $smtpHost = ""
    $smtpPort = "587"
    $smtpUser = ""
    $smtpPass = ""
    $smtpFrom = "no-reply@tracker.io"
    if ($smtpOpt -eq 'y' -or $smtpOpt -eq 'yes') {
        $smtpHost = Read-Host "SMTP_HOST"
        $smtpPortInput = Read-Host "SMTP_PORT [Default: 587]"
        if (-not [string]::IsNullOrWhiteSpace($smtpPortInput)) {
            $smtpPort = $smtpPortInput
        }
        $smtpUser = Read-Host "SMTP_USER"
        $smtpPass = Read-Host "SMTP_PASS"
        $smtpFromInput = Read-Host "NOTIFICATION_FROM_EMAIL [Default: no-reply@tracker.io]"
        if (-not [string]::IsNullOrWhiteSpace($smtpFromInput)) {
            $smtpFrom = $smtpFromInput
        }
    }

    # Generate custom .env content
    $envContent = @"
# --- Host Configuration ---
PORT=5000
NODE_ENV=development
"@

    if (-not [string]::IsNullOrWhiteSpace($adminPassword)) {
        $envContent += "`nADMIN_PASSWORD=`"$adminPassword`""
    }

    $envContent += @"

# --- Database Storage Link ---
DATABASE_URL="$dbUrl"

# --- Crawl Execution Configurations ---
SCRAPER_CRON_SCHEDULE="0 3 * * *"
SCRAPER_REQUEST_TIMEOUT_MS=15000
SCRAPER_USER_AGENT="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
"@

    if (-not [string]::IsNullOrWhiteSpace($discordWebhook)) {
        $envContent += "`n`n# --- Discord Alerts ---`nDISCORD_WEBHOOK_URL=`"$discordWebhook`""
    }

    if (-not [string]::IsNullOrWhiteSpace($telegramToken) -and -not [string]::IsNullOrWhiteSpace($telegramChatId)) {
        $envContent += "`n`n# --- Telegram Alerts ---`nTELEGRAM_BOT_TOKEN=`"$telegramToken`"`nTELEGRAM_CHAT_ID=`"$telegramChatId`""
    }

    if (-not [string]::IsNullOrWhiteSpace($smtpHost)) {
        $envContent += @"


# --- Email (SMTP) Alerts ---
SMTP_HOST="$smtpHost"
SMTP_PORT=$smtpPort
SMTP_USER="$smtpUser"
SMTP_PASS="$smtpPass"
NOTIFICATION_FROM_EMAIL="$smtpFrom"
"@
    }

    # Write config file to disk
    Set-Content -Path $envPath -Value $envContent -Encoding utf8
    Write-Host ""
    Write-Host "[SUCCESS] Created backend/.env configuration file." -ForegroundColor Green
    Write-Host ""
}

# Install Backend Dependencies
Write-Host "[INFO] Installing backend dependencies..." -ForegroundColor Green
Set-Location backend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Backend npm install failed." -ForegroundColor Red
    Pause
    exit 1
}

# Install Playwright Chromium
Write-Host "[INFO] Installing Playwright Chromium browser binaries..." -ForegroundColor Green
npx playwright install chromium
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Playwright browser installation failed." -ForegroundColor Red
    Pause
    exit 1
}

# Sync Database
Write-Host "[INFO] Generating Prisma Client..." -ForegroundColor Green
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Prisma Client generation failed." -ForegroundColor Red
    Pause
    exit 1
}

Write-Host "[INFO] Syncing database schema..." -ForegroundColor Green
npx prisma db push
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "===================================================" -ForegroundColor Red
    Write-Host "  [ERROR] Database Synchronization Failed!" -ForegroundColor Red
    Write-Host "===================================================" -ForegroundColor Red
    Write-Host "Prisma was unable to connect to the database." -ForegroundColor Red
    Write-Host "Please verify that:" -ForegroundColor Red
    Write-Host "  1. Your local PostgreSQL server is running." -ForegroundColor Red
    Write-Host "  2. The database credentials in backend/.env are valid." -ForegroundColor Red
    Write-Host "  3. The database specified actually exists." -ForegroundColor Red
    Write-Host ""
    Write-Host "You can edit your settings directly in backend/.env" -ForegroundColor Yellow
    Write-Host "and run this setup script again." -ForegroundColor Yellow
    Write-Host "===================================================" -ForegroundColor Red
    Write-Host ""
    Pause
    exit 1
}

# Install Frontend Dependencies
Write-Host "[INFO] Installing frontend dependencies..." -ForegroundColor Green
Set-Location ..\frontend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Frontend npm install failed." -ForegroundColor Red
    Pause
    exit 1
}

# Launch Dev Servers
Write-Host "[INFO] Launching development services..." -ForegroundColor Green
Set-Location ..
Start-Process cmd -ArgumentList '/k "cd backend && npm run dev"'
Start-Process cmd -ArgumentList '/k "cd frontend && npm run dev"'

Write-Host ""
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "     Setup Complete!                               " -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "Backend API is launching on http://localhost:5000" -ForegroundColor Green
Write-Host "Frontend dashboard is launching on http://localhost:5173" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""
Pause
