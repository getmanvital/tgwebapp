# Правила стиля кода проекта

## CSS Framework

**Проект использует Tailwind CSS как единый CSS фреймворк.**

Все новые компоненты и изменения должны следовать этим правилам.

## Быстрая справка

### ✅ ДОПУСТИМО
- Tailwind utility классы
- Telegram цвета (`bg-tg-button`, `text-tg-text`, и т.д.)
- `clsx` для условных классов
- Кастомные анимации в `tailwind.config.js`

### ❌ ЗАПРЕЩЕНО
- Inline стили (`style={{}}`)
- Кастомные CSS классы в `global.css`
- CSS модули или styled-components
- Другие CSS-in-JS решения

## Полная документация

См. [frontend/STYLE_GUIDE.md](../frontend/STYLE_GUIDE.md) для подробного руководства.

## Проверка перед PR

Перед созданием Pull Request убедитесь:
- [ ] Нет inline стилей
- [ ] Нет новых классов в `global.css`
- [ ] Используются только Tailwind классы
- [ ] Используются Telegram цвета

