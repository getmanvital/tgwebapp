# Quick deployment script for testing (Windows PowerShell)

Write-Host "Quick deployment for testing" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "[OK] Node.js installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js not installed! Install Node.js 18+ from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Check npm
try {
    $npmVersion = npm --version
    Write-Host "[OK] npm installed: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] npm not installed!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 1: Backend
Write-Host "Setting up Backend..." -ForegroundColor Yellow
Set-Location backend

# Check .env
if (-not (Test-Path .env)) {
    Write-Host "[WARN] .env not found, creating from example..." -ForegroundColor Yellow
    if (Test-Path .env.example) {
        Copy-Item .env.example .env
        Write-Host "[OK] .env created from .env.example" -ForegroundColor Green
        Write-Host "[WARN] IMPORTANT: Edit backend/.env and fill VK_API_TOKEN and VK_GROUP_ID!" -ForegroundColor Red
    } else {
        Write-Host "[WARN] .env.example not found, creating basic .env..." -ForegroundColor Yellow
        $envContent = "VK_API_TOKEN=your_vk_api_token_here`nVK_GROUP_ID=your_vk_group_id_here`nPORT=4000`nNODE_ENV=development`nMAX_COLLECTIONS_LIMIT=10`nMAX_PRODUCTS_LIMIT=20`nPHOTO_QUALITY=high`nUSE_LOCAL_DB=false`nENRICH_PRODUCTS=false"
        $envContent | Out-File -FilePath .env -Encoding utf8
        Write-Host "[OK] .env created" -ForegroundColor Green
        Write-Host "[WARN] IMPORTANT: Edit backend/.env and fill VK_API_TOKEN and VK_GROUP_ID!" -ForegroundColor Red
    }
} else {
    Write-Host "[OK] .env exists" -ForegroundColor Green
}

# Install dependencies
if (-not (Test-Path node_modules)) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host "[OK] Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "[OK] Backend dependencies already installed" -ForegroundColor Green
}

# Build
Write-Host "Building backend..." -ForegroundColor Yellow
npm run build
Write-Host "[OK] Backend built" -ForegroundColor Green

Set-Location ..

# Step 2: Frontend
Write-Host ""
Write-Host "Setting up Frontend..." -ForegroundColor Yellow
Set-Location frontend

# Check .env
if (-not (Test-Path .env)) {
    Write-Host "[WARN] .env not found, creating..." -ForegroundColor Yellow
    if (Test-Path .env.example) {
        Copy-Item .env.example .env
        Write-Host "[OK] .env created from .env.example" -ForegroundColor Green
    } else {
        "VITE_BACKEND_URL=http://localhost:4000" | Out-File -FilePath .env -Encoding utf8
        Write-Host "[OK] .env created" -ForegroundColor Green
    }
    Write-Host "[WARN] For production, change VITE_BACKEND_URL to HTTPS URL of your backend!" -ForegroundColor Yellow
} else {
    Write-Host "[OK] .env exists" -ForegroundColor Green
}

# Install dependencies
if (-not (Test-Path node_modules)) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host "[OK] Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "[OK] Frontend dependencies already installed" -ForegroundColor Green
}

# Build
Write-Host "Building frontend..." -ForegroundColor Yellow
npm run build
Write-Host "[OK] Frontend built" -ForegroundColor Green

Set-Location ..

Write-Host ""
Write-Host "[SUCCESS] Project is ready for deployment!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Start Backend:" -ForegroundColor Yellow
Write-Host "   cd backend" -ForegroundColor White
Write-Host "   npm start" -ForegroundColor White
Write-Host "   (or npm run dev for development)" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Start Frontend (in another terminal):" -ForegroundColor Yellow
Write-Host "   cd frontend" -ForegroundColor White
Write-Host "   npm run preview" -ForegroundColor White
Write-Host "   (or npm run dev for development)" -ForegroundColor Gray
Write-Host ""
Write-Host "3. For Telegram testing:" -ForegroundColor Yellow
Write-Host "   - Use ngrok to create HTTPS tunnel:" -ForegroundColor White
Write-Host "     ngrok http 5173" -ForegroundColor Gray
Write-Host "   - Use the received HTTPS URL in BotFather" -ForegroundColor White
Write-Host ""
Write-Host "4. Or deploy to server with HTTPS (see docs/DEPLOYMENT.md)" -ForegroundColor Yellow
Write-Host ""
