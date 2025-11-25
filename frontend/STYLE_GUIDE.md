# Руководство по стилю кода Frontend

## CSS Framework: Tailwind CSS

**ВАЖНО:** В проекте используется **Tailwind CSS** как единый CSS фреймворк. Все стили должны быть написаны с использованием Tailwind классов.

## Основные правила

### ✅ ДОПУСТИМО

1. **Использовать Tailwind utility классы**
   ```tsx
   <div className="flex items-center gap-4 p-4 bg-tg-secondary-bg rounded-xl">
     <h1 className="text-2xl font-bold text-tg-text">Заголовок</h1>
   </div>
   ```

2. **Использовать кастомные цвета Telegram через префикс `tg-`**
   ```tsx
   <button className="bg-tg-button text-tg-button-text">
     Кнопка
   </button>
   ```

3. **Использовать `clsx` для условных классов**
   ```tsx
   import clsx from 'clsx';
   
   <div className={clsx(
     'p-4 rounded-lg',
     isActive && 'bg-tg-button',
     isDisabled && 'opacity-50'
   )}>
   ```

4. **Использовать dark mode через класс `.tg-theme-dark`**
   ```tsx
   <div className="bg-white dark:bg-white/10">
   ```

5. **Добавлять кастомные анимации в `tailwind.config.js`**
   ```js
   // tailwind.config.js
   keyframes: {
     shimmer: { /* ... */ }
   }
   ```

### ❌ ЗАПРЕЩЕНО

1. **Inline стили (`style={{}}`)**
   ```tsx
   // ❌ НЕПРАВИЛЬНО
   <div style={{ padding: '16px', backgroundColor: '#fff' }}>
   
   // ✅ ПРАВИЛЬНО
   <div className="p-4 bg-white">
   ```

2. **Кастомные CSS классы в `global.css` (кроме критичных)**
   ```css
   /* ❌ НЕПРАВИЛЬНО - создавать новые классы */
   .my-custom-card {
     padding: 16px;
     background: #fff;
   }
   
   /* ✅ ПРАВИЛЬНО - использовать Tailwind */
   /* В компоненте: className="p-4 bg-white" */
   ```

3. **CSS модули или styled-components**
   - Не использовать CSS Modules (`.module.css`)
   - Не использовать styled-components
   - Не использовать другие CSS-in-JS решения

4. **Прямые CSS переменные (кроме Telegram)**
   ```tsx
   // ❌ НЕПРАВИЛЬНО
   <div style={{ color: 'var(--my-custom-color)' }}>
   
   // ✅ ПРАВИЛЬНО - использовать Tailwind цвета
   <div className="text-tg-text">
   ```

## Доступные цвета Telegram

Используйте следующие цвета для интеграции с Telegram темами:

- `bg-tg-bg` / `text-tg-bg` - основной фон
- `bg-tg-secondary-bg` / `text-tg-secondary-bg` - вторичный фон
- `text-tg-text` - основной текст
- `text-tg-hint` - подсказки/вторичный текст
- `text-tg-link` - ссылки
- `bg-tg-button` / `text-tg-button` - кнопки
- `text-tg-button-text` - текст кнопок
- `text-tg-destructive-text` - деструктивные действия

## Примеры

### Кнопка
```tsx
<button className="px-4 py-2 bg-tg-button text-tg-button-text rounded-lg transition-opacity hover:opacity-90">
  Нажми меня
</button>
```

### Карточка
```tsx
<div className="bg-tg-secondary-bg rounded-2xl p-4 shadow-md hover:shadow-lg transition-shadow">
  <h3 className="text-lg font-semibold text-tg-text mb-2">Заголовок</h3>
  <p className="text-sm text-tg-hint">Описание</p>
</div>
```

### Адаптивный дизайн
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Контент */}
</div>
```

### Условные стили
```tsx
import clsx from 'clsx';

<div className={clsx(
  'p-4 rounded-lg transition-all',
  isActive && 'bg-tg-button text-white',
  isDisabled && 'opacity-50 cursor-not-allowed'
)}>
```

## Исключения

Единственные допустимые исключения:

1. **Критичные стили в `global.css`**
   - Базовые стили для `body`, `#root`
   - Safe-area-inset для мобильных устройств
   - Telegram CSS переменные

2. **Динамические стили, которые невозможно выразить через Tailwind**
   ```tsx
   // Только если действительно необходимо
   <div style={{ 
     transform: `translateX(${offset}px)`,
     // Tailwind не может обработать динамические значения
   }}>
   ```

## Проверка перед коммитом

Перед коммитом убедитесь, что:

- ✅ Нет inline стилей (`style={{}}`)
- ✅ Нет новых классов в `global.css`
- ✅ Используются только Tailwind классы
- ✅ Используются Telegram цвета (`tg-*`)
- ✅ Условные классы через `clsx`

## Полезные ссылки

- [Документация Tailwind CSS](https://tailwindcss.com/docs)
- [Tailwind CSS Cheat Sheet](https://nerdcave.com/tailwind-cheat-sheet)
- Конфигурация проекта: `frontend/tailwind.config.js`

## Вопросы?

Если у вас есть вопросы по использованию Tailwind CSS в проекте, обратитесь к команде или создайте issue.

