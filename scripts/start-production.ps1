# Скрипт для запуска проекта в production режиме

Write-Host "🚀 Запуск проекта в production режиме" -ForegroundColor Cyan
Write-Host ""

# Проверка сборки
if (-not (Test-Path "backend\dist\server.js")) {
    Write-Host "❌ Backend не собран! Запустите: cd backend && npm run build" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "frontend\dist\index.html")) {
    Write-Host "❌ Frontend не собран! Запустите: cd frontend && npm run build" -ForegroundColor Red
    exit 1
}

# Проверка .env
if (-not (Test-Path "backend\.env")) {
    Write-Host "❌ backend/.env не найден!" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Запуск Backend и Frontend в production режиме..." -ForegroundColor Yellow
Write-Host ""

# Запуск backend
Write-Host "🔧 Запуск Backend на http://localhost:4000..." -ForegroundColor Cyan
$backendProcess = Start-Process -FilePath "node" -ArgumentList "backend\dist\server.js" -PassThru -NoNewWindow

# Небольшая задержка
Start-Sleep -Seconds 2

# Запуск frontend preview
Write-Host "🎨 Запуск Frontend preview на http://localhost:4173..." -ForegroundColor Cyan
Set-Location frontend
$frontendProcess = Start-Process -FilePath "npm" -ArgumentList "run","preview" -PassThru -NoNewWindow
Set-Location ..

Write-Host ""
Write-Host "✅ Оба сервера запущены!" -ForegroundColor Green
Write-Host ""
Write-Host "Backend:  http://localhost:4000" -ForegroundColor Green
Write-Host "Frontend: http://localhost:4173" -ForegroundColor Green
Write-Host ""
Write-Host "Для остановки нажмите Ctrl+C" -ForegroundColor Yellow
Write-Host ""

# Ожидание прерывания
try {
    while ($true) {
        Start-Sleep -Seconds 1
        if ($backendProcess.HasExited -or $frontendProcess.HasExited) {
            Write-Host "❌ Один из процессов завершился!" -ForegroundColor Red
            break
        }
    }
} catch {
    Write-Host "`n🛑 Остановка серверов..." -ForegroundColor Yellow
    Stop-Process -Id $backendProcess.Id -ErrorAction SilentlyContinue
    Stop-Process -Id $frontendProcess.Id -ErrorAction SilentlyContinue
    Write-Host "✅ Серверы остановлены" -ForegroundColor Green
}

