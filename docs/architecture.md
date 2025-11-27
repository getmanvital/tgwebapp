# Архитектура Telegram Web App Showcase

## Поток данных

1. Пользователь открывает Web App внутри Telegram.
2. Frontend вызывает backend:
   - `GET /products/collections` → список подборок (альбомов VK).
   - `GET /products?album_id=&q=&size=` → товары.
3. Backend обращается к VK API, кэширует ответы и нормализует данные.
4. Frontend отображает карточки, управляет фильтрами, активирует `MainButton`.

## Основные компоненты

- **Frontend (Vite + React)**  
  - `pages/HomePage` — главная, содержит подборки, фильтры, грид товаров.  
  - `pages/ChatsPage` + `components/ChatView` — админский чат с предпросмотром и отправкой изображений.  
  - `components/ProductCard` — карточка товара и CTA “Написать менеджеру”.  
  - `services/api` — HTTP-клиент к backend (REST + загрузка файлов).

- **Backend (Express)**  
  - `routes/products` — публичные REST-эндпоинты.  
  - `routes/messages` — Webhook Telegram, список чатов и отправка текстов/изображений.  
  - `services/vkClient` — запросы к `market.get`/`market.getAlbums`.  
  - `services/storageService` — загрузка файлов в TimeWeb S3 или локально, метаданные через `imageProcessingService`.  
  - `services/socketService` — realtime уведомления (Socket.io).  
  - `utils/sizeParser` — выделяет размеры из описаний товара.

## Поток отправки изображений

1. Админ выбирает файл в `ChatView`, выполняется валидация (тип/размер).
2. Frontend отправляет `multipart/form-data` на `POST /messages/chats/:userId/send-image`.
3. Backend загружает файл в TimeWeb S3 (или `data/uploads/chat`), сохраняет метаданные в `messages`.
4. Телеграм-бот отправляет фото клиенту и возвращает `message_id`.
5. Через Socket.io (`chat:new-message`) все подключённые админы получают сообщение с `attachmentType`, `attachmentUrl`, `attachmentMeta`.

## Дальнейшие шаги

- Добавить кэш (Redis) и логирование запросов.
- Реализовать обработчик ошибок/ретраев VK API.
- Добавить модалку просмотра изображения и историю загрузок.
- Подключить аналитические события Telegram Web Apps.


























