# Backend Service

Простой Node/Express-прокси между Telegram Web App и VK `market` API.

## Возможности

- Получение подборок (альбомов) `market.getAlbums`.
- Получение товаров по подборке / поиску.
- Нормализация и парсинг размеров из описаний.
- Кэширование запросов (в дальнейшем Redis или in-memory).

## Локальный запуск

```bash
cd backend
npm install
npm run dev
```

Файл переменных окружения:

```
cp env.example .env
```

| Переменная              | Описание                                    | По умолчанию |
| ----------------------- | ------------------------------------------- | ------------ |
| `VK_API_TOKEN`          | Токен standalone-приложения                 | -            |
| `VK_GROUP_ID`           | ID группы с товарами                        | -            |
| `TELEGRAM_BOT_TOKEN`    | Токен Telegram-бота                         | -            |
| `TELEGRAM_MANAGER_ID`   | ID менеджера для пересылки сообщений        | -            |
| `BACKEND_URL`           | Публичный URL backend                       | http://localhost:4000 |
| `PORT`                  | Порт HTTP сервера                           | 4000         |
| `DATABASE_URL`          | Строка подключения PostgreSQL               | postgresql://postgres@localhost:5432/tgwebapp |
| `MAX_COLLECTIONS_LIMIT` | Лимит подборок для тестирования             | 10           |
| `MAX_PRODUCTS_LIMIT`    | Лимит товаров в подборке для тестирования   | 20           |
| `PHOTO_QUALITY`         | Качество загружаемых фото                   | original     |
| `USE_LOCAL_DB`          | Использовать локальную БД вместо VK API     | false        |
| `ENRICH_PRODUCTS`       | Обогащать товары полными фото при загрузке  | false        |
| `TIMEWEB_S3_ENDPOINT`   | Endpoint S3 TimeWeb из панели               | https://s3.twcstorage.ru |
| `TIMEWEB_S3_REGION`     | Регион бакета                               | ru-1         |
| `TIMEWEB_S3_BUCKET`     | Название бакета                             | -            |
| `TIMEWEB_S3_ACCESS_KEY` | Access Key                                  | -            |
| `TIMEWEB_S3_SECRET_KEY` | Secret Access Key                           | -            |
| `TIMEWEB_S3_CDN_URL`    | CDN-домен (если подключен)                  | -            |

## API

- `GET /products/collections` — список альбомов.
- `GET /products?album_id=...&q=...&size=...` — товары с фильтрами.
- `GET /products/:id/photos` — все фото товара.
- `POST /sync/start` — запустить синхронизацию каталога с VK.
- `GET /sync/status` — получить статус синхронизации.

## Синхронизация каталога

Для синхронизации каталога с VK и сохранения товаров и фото локально:

1. Установите `USE_LOCAL_DB=true` в `.env`
2. Запустите синхронизацию: `POST http://localhost:4000/sync/start`
3. Проверьте статус: `GET http://localhost:4000/sync/status`

После синхронизации все товары и фото будут храниться локально в:
- База данных: `data/catalog.db`
- Фото: `data/photos/{productId}/`

## Качество фото

Переменная окружения `PHOTO_QUALITY` позволяет выбрать размер загружаемых фото:

- `original` или `max` - максимальное качество (orig_photo, base, y, x) - **по умолчанию**
- `high` - высокое качество (y, x, r) - ~1000x600px
- `medium` - среднее качество (p, o, m) - ~500x300px
- `low` - низкое качество (m, s) - ~200x150px

Использование меньшего разрешения ускоряет загрузку и экономит место на диске.

Документы по контрактам описываются в `docs/api.md`.

## TimeWeb S3 для вложений чата

Чтобы отправка изображений работала в продакшене, настройте бакет в TimeWeb Cloud:

1. Создайте бакет и включите доступ по S3 в разделе «Хранилище».
2. Скопируйте из блока «Подключение» значения `S3 URL`, `Регион`, `Название бакета`, `S3 Access Key`, `S3 Secret Access Key`.
3. Заполните переменные `TIMEWEB_S3_*` в `.env`. Если у бакета есть CDN, укажите домен в `TIMEWEB_S3_CDN_URL`.
4. При отладке без S3 сервис автоматически сохраняет файлы в `data/uploads/chat` и раздаёт их по пути `/uploads/chat/*`.

Для извлечения метаданных и генерации превью используется `sharp`, поэтому убедитесь, что пакет установлен (входит в `package.json`).









