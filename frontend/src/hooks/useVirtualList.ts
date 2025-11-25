import { useState, useEffect, useRef, useMemo } from 'react';

type UseVirtualListOptions<T> = {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number; // Количество элементов для предзагрузки вне видимой области
};

type VirtualItem<T> = {
  index: number;
  item: T;
  offset: number;
};

/**
 * Хук для виртуализации списков
 * Рендерит только видимые элементы для улучшения производительности
 */
export function useVirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 2,
}: UseVirtualListOptions<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const virtualItems = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    const visibleItems: VirtualItem<T>[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      visibleItems.push({
        index: i,
        item: items[i],
        offset: i * itemHeight,
      });
    }

    return visibleItems;
  }, [items, itemHeight, containerHeight, scrollTop, overscan]);

  const totalHeight = items.length * itemHeight;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  return {
    virtualItems,
    totalHeight,
    containerRef,
    handleScroll,
  };
}

