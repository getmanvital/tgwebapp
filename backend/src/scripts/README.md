# Backend Scripts

Коллекция полезных скриптов для управления backend сервисом.

## setupWebhook.ts

Скрипт для настройки Telegram Bot webhook.

### Использование

```bash
# Настроить webhook
npm run webhook:setup

# Проверить текущий статус
npm run webhook:info

# Удалить webhook
npm run webhook:delete
```

### Прямой запуск

```bash
# Настроить webhook
tsx src/scripts/setupWebhook.ts set

# Получить информацию
tsx src/scripts/setupWebhook.ts info

# Удалить webhook
tsx src/scripts/setupWebhook.ts delete
```

### Требования

Перед запуском убедитесь, что в `.env` файле указаны:

- `TELEGRAM_BOT_TOKEN` - токен бота от BotFather
- `BACKEND_URL` - публичный URL вашего backend с HTTPS
- `TELEGRAM_MANAGER_ID` - числовой ID менеджера

### Пример вывода

```
🤖 Telegram Webhook Setup Script

📡 Getting webhook information...
✅ Webhook set successfully

✅ Webhook configured successfully!

📝 Next steps:
   1. Make sure your backend is running and accessible
   2. Verify HTTPS is working (Telegram requires HTTPS)
   3. Send a message to your bot to test

📊 Webhook Information:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 URL: https://yourdomain.com/messages/webhook
📝 Pending updates: 0
✅ No errors
📬 Allowed updates: message
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Решение проблем

**Ошибка: TELEGRAM_BOT_TOKEN is not set**
- Проверьте наличие `.env` файла в директории `backend/`
- Убедитесь, что токен скопирован полностью из BotFather

**Ошибка: BACKEND_URL is not set**
- Добавьте `BACKEND_URL=https://yourdomain.com` в `.env`
- URL должен быть публичным и с HTTPS

**Webhook не работает (pending_update_count растет)**
- Проверьте доступность URL через curl: `curl https://yourdomain.com/messages/webhook`
- Убедитесь, что SSL сертификат валиден
- Проверьте логи backend: `pm2 logs backend`

**Last error: SSL certificate problem**
- Установите валидный SSL сертификат (Let's Encrypt)
- Проверьте, что сертификат не expired

## getGroupId.ts

Получение ID группы VK для настройки.

```bash
npm run get-group-id
```

## Другие скрипты

- `checkPhotoDuplicates.ts` - Проверка дубликатов фото
- `checkThumbSources.ts` - Проверка источников превью
- `compareThumbAndFirstPhoto.ts` - Сравнение превью с первым фото
- `getProductInfo.ts` - Получение информации о товаре
- `getProductPhotoUrls.ts` - Получение URL фото товара
- `getProductWithExtended.ts` - Получение расширенной информации о товаре
