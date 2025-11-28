# Post-deploy скрипт для автоматической настройки после деплоя (Windows)
# Использование: .\scripts\post-deploy.ps1

$ErrorActionPreference = "Stop"

Write-Host "🚀 Running post-deploy setup..." -ForegroundColor Cyan
Write-Host ""

# Переходим в директорию backend
$backendPath = Join-Path $PSScriptRoot "..\backend"
if (-not (Test-Path $backendPath)) {
    Write-Host "❌ Error: backend directory not found" -ForegroundColor Red
    exit 1
}

Set-Location $backendPath

# Проверяем наличие .env файла
if (-not (Test-Path ".env")) {
    Write-Host "❌ Error: .env file not found in backend/" -ForegroundColor Red
    Write-Host "💡 Create .env from env.example and configure it" -ForegroundColor Yellow
    exit 1
}

# Загружаем переменные из .env
Get-Content .env | ForEach-Object {
    if ($_ -match '^([^#=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        $value = $value -replace '^["'']|["'']$', ''
        Set-Variable -Name $name -Value $value -Scope Script
    }
}

# Проверяем необходимые переменные
if (-not $TELEGRAM_BOT_TOKEN) {
    Write-Host "⚠️  Warning: TELEGRAM_BOT_TOKEN not set in .env" -ForegroundColor Yellow
}

if (-not $TELEGRAM_MANAGER_ID) {
    Write-Host "⚠️  Warning: TELEGRAM_MANAGER_ID not set in .env" -ForegroundColor Yellow
}

if (-not $BACKEND_URL) {
    Write-Host "⚠️  Warning: BACKEND_URL not set in .env" -ForegroundColor Yellow
    $BACKEND_URL = "http://localhost:4000"
}

# Проверяем доступность backend
Write-Host "🔍 Checking backend availability..." -ForegroundColor Yellow
$healthUrl = "$BACKEND_URL/health"

try {
    $response = Invoke-RestMethod -Uri $healthUrl -Method Get -ErrorAction Stop
    Write-Host "✅ Backend is running" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Backend is not accessible at $healthUrl" -ForegroundColor Yellow
    Write-Host "💡 Make sure backend is running before setting up webhook" -ForegroundColor Cyan
}

# Настраиваем webhook если AUTO_SETUP_WEBHOOK не установлен в true
if ($AUTO_SETUP_WEBHOOK -ne "true") {
    Write-Host ""
    Write-Host "📡 Setting up Telegram webhook..." -ForegroundColor Yellow
    
    try {
        npm run webhook:setup
    } catch {
        Write-Host "⚠️  Failed to run webhook setup: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "💡 Run 'npm run webhook:setup' manually" -ForegroundColor Cyan
    }
} else {
    Write-Host "✅ Webhook will be auto-configured on server start (AUTO_SETUP_WEBHOOK=true)" -ForegroundColor Green
}

Write-Host ""
Write-Host "✅ Post-deploy setup completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Check backend logs: pm2 logs backend" -ForegroundColor White
Write-Host "   2. Verify webhook status: npm run webhook:info" -ForegroundColor White
Write-Host "   3. Test by sending a message to your bot" -ForegroundColor White
Write-Host ""
