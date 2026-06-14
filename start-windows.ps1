Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "🏷️  Flipkart Price Tracker - Native Windows Setup" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

# Check Node.js
node -v 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Node.js is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install Node.js (v20+) and try again." -ForegroundColor Red
    Pause
    exit 1
}

# Configure environment variables if they do not exist
if (-not (Test-Path "backend\.env")) {
    Copy-Item "backend\.env.example" "backend\.env"
    Write-Host "[INFO] Created backend/.env template." -ForegroundColor Yellow
    Write-Host "Please configure your DATABASE_URL in backend/.env before proceeding." -ForegroundColor Yellow
}

Write-Host "[INFO] Installing backend dependencies..." -ForegroundColor Green
Set-Location backend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Backend npm install failed." -ForegroundColor Red
    Pause
    exit 1
}

Write-Host "[INFO] Installing Playwright Chromium..." -ForegroundColor Green
npx playwright install chromium

Write-Host "[INFO] Syncing database schema..." -ForegroundColor Green
npx prisma generate
npx prisma db push

Write-Host "[INFO] Installing frontend dependencies..." -ForegroundColor Green
Set-Location ..\frontend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Frontend npm install failed." -ForegroundColor Red
    Pause
    exit 1
}

Write-Host "[INFO] Launching services..." -ForegroundColor Green
Set-Location ..
Start-Process cmd -ArgumentList '/k "cd backend && npm run dev"'
Start-Process cmd -ArgumentList '/k "cd frontend && npm run dev"'

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "🎉 Setup complete!" -ForegroundColor Green
Write-Host "Backend API is launching on http://localhost:5000" -ForegroundColor Green
Write-Host "Frontend dashboard is launching on http://localhost:5173" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Cyan
