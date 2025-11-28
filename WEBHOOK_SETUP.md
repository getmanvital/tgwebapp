# 🔔 Настройка Telegram Webhook - Быстрая Инструкция

## Почему не приходят уведомления?

Если менеджер не получает уведомления о сообщениях от клиентов, скорее всего **не настроен webhook**.

## ✅ Быстрая настройка

### 1. Подготовка

Убедитесь, что в `backend/.env` указаны:

```env
TELEGRAM_BOT_TOKEN=7123456789:AAF...    # Токен от @BotFather
TELEGRAM_MANAGER_ID=123456789           # Ваш числовой ID
BACKEND_URL=https://yourdomain.com      # Публичный URL с HTTPS
AUTO_SETUP_WEBHOOK=true                 # Автоматическая настройка
```

**Как получить свой ID:**
1. Напишите боту [@userinfobot](https://t.me/userinfobot)
2. Скопируйте числовой ID из ответа

### 2. Настройка webhook

**✨ Автоматически (рекомендуется):**

С `AUTO_SETUP_WEBHOOK=true` webhook настроится сам при запуске:
```bash
pm2 restart backend
# или
npm start
```

**Вручную:**

**Способ 1: npm скрипт (Linux/Mac/Windows)**

```bash
cd backend
npm run webhook:setup
```

**Способ 2: PowerShell (Windows)**

```powershell
.\scripts\setup-webhook.ps1
```

**Способ 3: curl (Linux/Mac)**

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://yourdomain.com/messages/webhook",
    "allowed_updates": ["message"]
  }'
```

### 3. Проверка

```bash
cd backend
npm run webhook:info
```

Должно показать:
```
✅ Webhook is already set to the correct URL
🔗 URL: https://yourdomain.com/messages/webhook
📝 Pending updates: 0
✅ No errors
```

### 4. Тестирование

1. Напишите сообщение боту от имени любого пользователя
2. Менеджеру должно прийти уведомление в Telegram

## ❌ Проблемы и решения

### Ошибка: "TELEGRAM_BOT_TOKEN is not set"

**Решение:**
- Проверьте наличие файла `backend/.env`
- Убедитесь, что токен скопирован полностью

### Ошибка: "BACKEND_URL is not set"

**Решение:**
- Добавьте `BACKEND_URL=https://yourdomain.com` в `.env`
- URL должен быть публичным и с HTTPS

### Webhook не работает (pending_update_count > 0)

**Возможные причины:**

1. **Backend недоступен**
   ```bash
   # Проверьте доступность
   curl https://yourdomain.com/health
   ```

2. **Нет HTTPS или проблемы с SSL**
   ```bash
   # Проверьте SSL
   curl -I https://yourdomain.com
   ```

3. **Endpoint недоступен**
   ```bash
   # Проверьте webhook endpoint
   curl -X POST https://yourdomain.com/messages/webhook \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   ```

4. **Backend не запущен**
   ```bash
   # Проверьте статус
   pm2 status
   pm2 logs backend
   ```

### Last error: "SSL certificate problem"

**Решение:**
- Установите валидный SSL сертификат (Let's Encrypt)
- Убедитесь, что сертификат не истек

### Last error: "Connection refused"

**Решение:**
- Проверьте, что backend запущен: `pm2 status`
- Проверьте порты и firewall
- Убедитесь, что Nginx правильно проксирует запросы

## 🔧 Дополнительные команды

```bash
# Удалить webhook
npm run webhook:delete

# Получить информацию
npm run webhook:info

# Просмотреть логи backend
pm2 logs backend

# Перезапустить backend
pm2 restart backend
```

## 📝 Как работает webhook

1. Пользователь отправляет сообщение боту
2. Telegram отправляет POST запрос на `https://yourdomain.com/messages/webhook`
3. Backend получает сообщение и сохраняет в БД
4. Backend пересылает сообщение менеджеру через Telegram Bot API
5. Менеджер получает уведомление в Telegram

## 🔍 Отладка

### Проверка webhook в реальном времени

```bash
# Следите за логами
pm2 logs backend --lines 100

# Отправьте тестовое сообщение боту
# Вы должны увидеть в логах:
# "Webhook received"
# "Processing Telegram update"
```

### Ручная отправка тестового webhook

```bash
curl -X POST "https://yourdomain.com/messages/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "update_id": 999999,
    "message": {
      "message_id": 1,
      "from": {
        "id": 999999,
        "first_name": "Test",
        "username": "testuser"
      },
      "chat": {
        "id": 999999,
        "type": "private"
      },
      "text": "Test message"
    }
  }'
```

## 📚 Дополнительная информация

- [Backend README](backend/README.md) - Полное описание backend API
- [DEPLOYMENT.md](docs/DEPLOYMENT.md) - Инструкция по деплою
- [Scripts README](backend/src/scripts/README.md) - Описание всех скриптов

## 🆘 Помощь

Если ничего не помогло:

1. Проверьте все переменные в `.env`
2. Убедитесь, что backend запущен: `pm2 status`
3. Проверьте логи: `pm2 logs backend`
4. Убедитесь, что HTTPS работает
5. Проверьте webhook info: `npm run webhook:info`
6. Попробуйте удалить и установить webhook заново:
   ```bash
   npm run webhook:delete
   npm run webhook:setup
   ```
