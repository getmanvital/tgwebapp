import { useEffect, useState, useRef } from 'react';
import clsx from 'clsx';
import { useCart } from '../contexts/CartContext';
import { getBackendUrl } from '../utils/backendUrl';

const CartPreview = () => {
  const { items } = useCart();
  const [isVisible, setIsVisible] = useState(false);
  const [lastAddedItem, setLastAddedItem] = useState<typeof items[0] | null>(null);
  const lastShownItemRef = useRef<string | null>(null); // Отслеживаем последний показанный товар по ID+времени

  // 1) Реагируем на изменения корзины и решаем, нужно ли показать новое уведомление
  useEffect(() => {
    if (items.length === 0) {
      // Если корзина пуста, сбрасываем состояние
      setIsVisible(false);
      setLastAddedItem(null);
      lastShownItemRef.current = null;
      return;
    }

    // Берём самый "свежий" товар по addedAt
    const sorted = [...items].sort((a, b) =>
      b.addedAt.getTime() - a.addedAt.getTime()
    );
    const newest = sorted[0];

    const itemKey = `${newest.product.id}-${newest.addedAt.getTime()}`;

    // Если это тот же самый показанный товар — ничего не делаем
    if (itemKey === lastShownItemRef.current) {
      return;
    }

    // Новый "ивент добавления" — показываем превью
    lastShownItemRef.current = itemKey;
    setLastAddedItem(newest);
    setIsVisible(true);
  }, [items]);

  // 2) Отвечаем только за авто-скрытие уведомления
  useEffect(() => {
    if (!isVisible || !lastAddedItem) return;

    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 4000);

    return () => clearTimeout(timer);
  }, [isVisible, lastAddedItem]);

  if (!isVisible || !lastAddedItem) {
    return null;
  }

  const getThumbPhoto = (product: any): string => {
    if (product.thumb_photo) {
      if (product.thumb_photo.startsWith('/photos/')) {
        const backendUrl = getBackendUrl();
        return `${backendUrl}${product.thumb_photo}`;
      }
      return product.thumb_photo;
    }

    if (product.thumb && Array.isArray(product.thumb) && product.thumb.length > 0) {
      const largestThumb = product.thumb.reduce((prev: any, curr: any) => {
        const prevSize = (prev.width || 0) * (prev.height || 0);
        const currSize = (curr.width || 0) * (curr.height || 0);
        return currSize > prevSize ? curr : prev;
      });
      
      if (largestThumb.url) {
        return largestThumb.url;
      }
    }

    return 'https://via.placeholder.com/240x240?text=No+Image';
  };

  // Используем key для предотвращения кэширования элемента
  const itemKey = lastAddedItem ? `${lastAddedItem.product.id}-${lastAddedItem.addedAt.getTime()}` : '';

  return (
    <div
      key={itemKey}
      className={clsx(
        "fixed bottom-[calc(88px+max(16px,env(safe-area-inset-bottom)))] left-4 right-4 z-[150] transition-opacity duration-300",
        isVisible ? "animate-[slide-in-down_0.3s_ease-out] opacity-100" : "animate-[fade-out_0.3s_ease-out] opacity-0"
      )}
      onClick={() => setIsVisible(false)}
    >
      <div
        className="bg-tg-secondary-bg rounded-2xl p-3 shadow-lg border border-black/10 dark:bg-gray-900/95 dark:border-white/30 backdrop-blur-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
            <img
              src={getThumbPhoto(lastAddedItem.product)}
              alt={lastAddedItem.product.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://via.placeholder.com/64x64?text=No+Image';
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-tg-text dark:text-white truncate mb-1">
              {lastAddedItem.product.title}
            </p>
            <p className="text-xs text-tg-hint">
              Добавлено в корзину ({lastAddedItem.quantity} шт.)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPreview;

