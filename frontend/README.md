# Frontend (Telegram Web App)

React/Vite приложение, запускаемое внутри Telegram Web Apps.

## Возможности

- Просмотр подборок (альбомов VK) на главной.
- Каталог товаров с поиском и фильтром по размеру.
- Кнопка `MainButton` Telegram для связи с менеджером.

## Быстрый старт

```bash
cd frontend
npm install
npm run dev
```

Сконфигурируйте `.env` (см. `.env.example`) с URL backend.

## Структура

```
src/
  components/    // UI-компоненты (карточки, фильтры)
  pages/         // Страницы Web App
  hooks/         // Telegram/Web API хуки
  services/      // Клиенты API
  types/         // Типы данных
```















