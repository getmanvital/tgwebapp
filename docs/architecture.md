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
  - `components/ProductCard` — карточка товара и CTA “Написать менеджеру”.  
  - `services/api` — HTTP-клиент к backend.

- **Backend (Express)**  
  - `routes/products` — публичные REST-эндпоинты.  
  - `services/vkClient` — запросы к `market.get`/`market.getAlbums`.  
  - `utils/sizeParser` — выделяет размеры из описаний товара.

## Дальнейшие шаги

- Добавить кэш (Redis) и логирование запросов.
- Реализовать обработчик ошибок/ретраев VK API.
- Подключить аналитические события Telegram Web Apps.
























