# Скрипт для запуска проекта в режиме разработки

Write-Host "🚀 Запуск проекта в режиме разработки" -ForegroundColor Cyan
Write-Host ""

# Проверка .env файлов
$backendEnvExists = Test-Path "backend\.env"
$frontendEnvExists = Test-Path "frontend\.env"

if (-not $backendEnvExists) {
    Write-Host "⚠ backend/.env не найден! Запустите scripts/quick-deploy.ps1 сначала" -ForegroundColor Red
    exit 1
}

if (-not $frontendEnvExists) {
    Write-Host "⚠ frontend/.env не найден! Запустите scripts/quick-deploy.ps1 сначала" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Запуск Backend и Frontend..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Backend будет доступен на: http://localhost:4000" -ForegroundColor Green
Write-Host "Frontend будет доступен на: http://localhost:5173" -ForegroundColor Green
Write-Host ""
Write-Host "Нажмите Ctrl+C для остановки" -ForegroundColor Yellow
Write-Host ""

# Запуск backend в фоне
Write-Host "🔧 Запуск Backend..." -ForegroundColor Cyan
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD\backend
    npm run dev
}

# Небольшая задержка перед запуском frontend
Start-Sleep -Seconds 3

# Запуск frontend в фоне
Write-Host "🎨 Запуск Frontend..." -ForegroundColor Cyan
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD\frontend
    npm run dev
}

Write-Host ""
Write-Host "✅ Оба сервера запущены!" -ForegroundColor Green
Write-Host ""
Write-Host "Для просмотра логов:" -ForegroundColor Yellow
Write-Host "  Backend:  Receive-Job -Id $($backendJob.Id) -Keep" -ForegroundColor White
Write-Host "  Frontend: Receive-Job -Id $($frontendJob.Id) -Keep" -ForegroundColor White
Write-Host ""
Write-Host "Для остановки нажмите Ctrl+C и выполните:" -ForegroundColor Yellow
Write-Host "  Stop-Job -Id $($backendJob.Id),$($frontendJob.Id)" -ForegroundColor White
Write-Host "  Remove-Job -Id $($backendJob.Id),$($frontendJob.Id)" -ForegroundColor White
Write-Host ""

# Ожидание прерывания
try {
    while ($true) {
        Start-Sleep -Seconds 1
        # Проверка статуса задач
        $backendState = (Get-Job -Id $backendJob.Id).State
        $frontendState = (Get-Job -Id $frontendJob.Id).State
        
        if ($backendState -eq "Failed" -or $frontendState -eq "Failed") {
            Write-Host "❌ Одна из задач завершилась с ошибкой!" -ForegroundColor Red
            break
        }
    }
} catch {
    Write-Host "`n🛑 Остановка серверов..." -ForegroundColor Yellow
    Stop-Job -Id $backendJob.Id,$frontendJob.Id -ErrorAction SilentlyContinue
    Remove-Job -Id $backendJob.Id,$frontendJob.Id -ErrorAction SilentlyContinue
    Write-Host "✅ Серверы остановлены" -ForegroundColor Green
}

