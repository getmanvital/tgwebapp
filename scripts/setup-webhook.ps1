# Скрипт для быстрой настройки Telegram Webhook на Windows
# Использование: .\scripts\setup-webhook.ps1

$ErrorActionPreference = "Stop"

Write-Host "🤖 Telegram Webhook Setup" -ForegroundColor Cyan
Write-Host ""

# Проверяем наличие .env файла
$envFile = "backend\.env"
if (-not (Test-Path $envFile)) {
    Write-Host "❌ Файл .env не найден в backend/" -ForegroundColor Red
    Write-Host "💡 Создайте .env из env.example и заполните необходимые переменные" -ForegroundColor Yellow
    exit 1
}

# Загружаем переменные из .env
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^([^#=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        # Убираем кавычки если есть
        $value = $value -replace '^["'']|["'']$', ''
        Set-Variable -Name $name -Value $value -Scope Script
    }
}

# Проверяем обязательные переменные
if (-not $TELEGRAM_BOT_TOKEN) {
    Write-Host "❌ TELEGRAM_BOT_TOKEN не установлен в .env" -ForegroundColor Red
    exit 1
}

if (-not $BACKEND_URL) {
    Write-Host "❌ BACKEND_URL не установлен в .env" -ForegroundColor Red
    exit 1
}

$webhookUrl = "$BACKEND_URL/messages/webhook"
$apiUrl = "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN"

# Проверяем текущий webhook
Write-Host "🔍 Проверка текущего webhook..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$apiUrl/getWebhookInfo" -Method Get
    
    if ($response.ok) {
        $currentUrl = $response.result.url
        
        if ($currentUrl) {
            Write-Host "📡 Текущий webhook: $currentUrl" -ForegroundColor Cyan
            
            if ($currentUrl -eq $webhookUrl) {
                Write-Host "✅ Webhook уже настроен правильно!" -ForegroundColor Green
                Write-Host ""
                Write-Host "📊 Информация:" -ForegroundColor Cyan
                Write-Host "   URL: $currentUrl"
                Write-Host "   Ожидающих обновлений: $($response.result.pending_update_count)"
                
                if ($response.result.last_error_date) {
                    Write-Host "   ⚠️  Последняя ошибка: $($response.result.last_error_message)" -ForegroundColor Yellow
                } else {
                    Write-Host "   ✅ Ошибок нет" -ForegroundColor Green
                }
                exit 0
            }
        } else {
            Write-Host "⚠️  Webhook не установлен" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "⚠️  Не удалось получить информацию о webhook: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Устанавливаем webhook
Write-Host ""
Write-Host "🔧 Установка webhook..." -ForegroundColor Yellow
Write-Host "   URL: $webhookUrl" -ForegroundColor Cyan

try {
    $body = @{
        url = $webhookUrl
        allowed_updates = @("message")
        drop_pending_updates = $false
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$apiUrl/setWebhook" `
        -Method Post `
        -ContentType "application/json" `
        -Body $body
    
    if ($response.ok) {
        Write-Host ""
        Write-Host "✅ Webhook успешно настроен!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📝 Следующие шаги:" -ForegroundColor Cyan
        Write-Host "   1. Убедитесь, что backend запущен и доступен" -ForegroundColor White
        Write-Host "   2. Проверьте, что HTTPS работает (Telegram требует HTTPS)" -ForegroundColor White
        Write-Host "   3. Отправьте сообщение боту для тестирования" -ForegroundColor White
        Write-Host ""
        
        # Показываем обновленную информацию
        $newInfo = Invoke-RestMethod -Uri "$apiUrl/getWebhookInfo" -Method Get
        if ($newInfo.ok) {
            Write-Host "📊 Информация о webhook:" -ForegroundColor Cyan
            Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
            Write-Host "   URL: $($newInfo.result.url)" -ForegroundColor White
            Write-Host "   Ожидающих обновлений: $($newInfo.result.pending_update_count)" -ForegroundColor White
            
            if ($newInfo.result.allowed_updates) {
                Write-Host "   Разрешенные обновления: $($newInfo.result.allowed_updates -join ', ')" -ForegroundColor White
            }
            Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
        }
    } else {
        Write-Host ""
        Write-Host "❌ Не удалось установить webhook" -ForegroundColor Red
        Write-Host "   Ответ: $($response.description)" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "❌ Ошибка при установке webhook: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "💡 Для проверки статуса используйте: npm run webhook:info" -ForegroundColor Cyan
Write-Host ""
