# 🚀 Быстрый старт после деплоя

## Чек-лист для запуска уведомлений

После того как вы задеплоили приложение, выполните эти шаги:

### ✅ Шаг 1: Проверьте `.env` на сервере

```bash
cd /var/www/tgwebapp/backend
cat .env
```

Убедитесь, что есть все переменные:

```env
# Обязательные для webhook
TELEGRAM_BOT_TOKEN=7123456789:AAF...
TELEGRAM_MANAGER_ID=123456789
BACKEND_URL=https://ваш_домен.com
AUTO_SETUP_WEBHOOK=true

# Остальные переменные
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://...
# ... и т.д.
```

### ✅ Шаг 2: Получите свой Telegram ID (если еще не получили)

1. Откройте Telegram
2. Найдите бота [@userinfobot](https://t.me/userinfobot)
3. Отправьте ему любое сообщение
4. Скопируйте числовой ID
5. Добавьте в `.env`: `TELEGRAM_MANAGER_ID=ваш_id`

### ✅ Шаг 3: Перезапустите backend

```bash
pm2 restart backend
```

### ✅ Шаг 4: Проверьте логи

```bash
pm2 logs backend --lines 50
```

Вы должны увидеть:
```
🔍 Checking current webhook configuration...
✅ Webhook auto-configured successfully
```

### ✅ Шаг 5: Проверьте health endpoint

```bash
curl https://ваш_домен.com/health
```

Ответ должен быть:
```json
{
  "status": "ok",
  "timestamp": 1234567890,
  "webhook": {
    "configured": true,
    "hasErrors": false,
    "pendingUpdates": 0
  }
}
```

### ✅ Шаг 6: Проверьте статус webhook

```bash
cd /var/www/tgwebapp/backend
npm run webhook:info
```

Должно показать:
```
✅ Webhook is set
🔗 URL: https://ваш_домен.com/messages/webhook
📝 Pending updates: 0
✅ No errors
```

### ✅ Шаг 7: Тестирование

1. Откройте вашего бота в Telegram
2. Отправьте тестовое сообщение
3. Менеджеру должно прийти уведомление

## ❌ Если что-то не работает

### Проблема: Webhook не настроился автоматически

**Проверьте:**
```bash
# 1. Переменная установлена?
grep AUTO_SETUP_WEBHOOK backend/.env

# 2. BACKEND_URL правильный?
grep BACKEND_URL backend/.env

# 3. Логи показывают ошибку?
pm2 logs backend | grep webhook
```

**Решение:**
```bash
# Настройте вручную
cd backend
npm run webhook:setup
```

### Проблема: "BACKEND_URL points to localhost"

**Решение:**
```bash
# В .env измените localhost на публичный URL
nano backend/.env
# BACKEND_URL=https://ваш_домен.com

# Перезапустите
pm2 restart backend
```

### Проблема: Webhook configured но уведомления не приходят

**Проверьте:**

1. **TELEGRAM_MANAGER_ID правильный?**
   ```bash
   grep TELEGRAM_MANAGER_ID backend/.env
   ```

2. **Backend доступен извне?**
   ```bash
   curl https://ваш_домен.com/health
   ```

3. **SSL работает?**
   ```bash
   curl -I https://ваш_домен.com
   ```

4. **Webhook endpoint доступен?**
   ```bash
   curl -X POST https://ваш_домен.com/messages/webhook \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   ```

### Проблема: SSL certificate problem

**Решение:**
```bash
# Установите/обновите SSL сертификат
sudo certbot --nginx -d ваш_домен.com
sudo systemctl reload nginx
```

## 🎯 Полный процесс с нуля

Если вы только что задеплоили приложение:

```bash
# 1. SSH на сервер
ssh user@your-server.com

# 2. Перейдите в директорию проекта
cd /var/www/tgwebapp

# 3. Проверьте/отредактируйте .env
nano backend/.env

# Убедитесь что есть:
# AUTO_SETUP_WEBHOOK=true
# TELEGRAM_BOT_TOKEN=...
# TELEGRAM_MANAGER_ID=...
# BACKEND_URL=https://ваш_домен.com

# 4. Соберите backend (если еще не собран)
cd backend
npm install
npm run build

# 5. Запустите через PM2
cd ..
pm2 start ecosystem.config.js

# 6. Проверьте логи
pm2 logs backend

# 7. Проверьте health
curl https://ваш_домен.com/health

# 8. Отправьте тестовое сообщение боту
# Готово! ✅
```

## 📋 Команды для копирования

```bash
# Проверка статуса всего
pm2 status
pm2 logs backend --lines 50
curl https://ваш_домен.com/health
cd backend && npm run webhook:info

# Перезапуск после изменения .env
pm2 restart backend

# Просмотр логов в реальном времени
pm2 logs backend

# Ручная настройка webhook
cd backend && npm run webhook:setup

# Проверка Nginx
sudo nginx -t
sudo systemctl status nginx

# Проверка SSL
sudo certbot certificates
```

## 📖 Дополнительная документация

- [WEBHOOK_AUTO_SETUP.md](WEBHOOK_AUTO_SETUP.md) - Детали автоматической настройки
- [WEBHOOK_SETUP.md](../WEBHOOK_SETUP.md) - Решение проблем с webhook
- [DEPLOYMENT.md](DEPLOYMENT.md) - Полная инструкция по деплою

## 💡 Советы

1. **Всегда используйте AUTO_SETUP_WEBHOOK=true в production** - это избавит от необходимости помнить о настройке webhook

2. **Проверяйте логи после каждого деплоя** - они покажут если что-то пошло не так

3. **Используйте health endpoint** для мониторинга - он показывает статус webhook

4. **В development можно отключить автонастройку** - установите AUTO_SETUP_WEBHOOK=false

5. **Для тестирования используйте ngrok** - он даст вам временный HTTPS URL
