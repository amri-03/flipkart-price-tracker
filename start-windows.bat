@echo off
echo ===================================================
echo 🏷️  Flipkart Price Tracker - Native Windows Setup
echo ===================================================

:: Check for Node.js
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js (v20+) and try again.
    pause
    exit /b 1
)

:: Configure environment variables if they do not exist
if not exist "backend\.env" (
    copy "backend\.env.example" "backend\.env"
    echo [INFO] Created backend/.env template.
    echo Please make sure to configure your DATABASE_URL in backend/.env before proceeding.
)

echo [INFO] Installing backend dependencies...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Backend npm install failed.
    pause
    exit /b 1
)

echo [INFO] Installing Playwright Chromium...
call npx playwright install chromium

echo [INFO] Syncing database schema...
call npx prisma generate
call npx prisma db push

echo [INFO] Installing frontend dependencies...
cd ..\frontend
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Frontend npm install failed.
    pause
    exit /b 1
)

echo [INFO] Launching services...
cd ..
start "Flipkart Price Tracker - Backend" cmd /c "cd backend && npm run dev"
start "Flipkart Price Tracker - Frontend" cmd /c "cd frontend && npm run dev"

echo ===================================================
echo 🎉 Setup complete!
echo Backend API is launching on http://localhost:5000
echo Frontend dashboard is launching on http://localhost:5173
echo ===================================================
pause
