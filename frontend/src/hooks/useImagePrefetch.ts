import { useEffect } from 'react';

/**
 * Хук для предзагрузки изображений
 * Предзагружает первые несколько изображений для улучшения производительности
 */
export function useImagePrefetch(imageUrls: string[], enabled = true) {
  useEffect(() => {
    if (!enabled || imageUrls.length === 0) {
      return;
    }

    // Предзагружаем первые несколько изображений сразу
    // Это улучшит UX при быстром скролле
    const preloadCount = Math.min(5, imageUrls.length);
    const images: HTMLImageElement[] = [];

    for (let i = 0; i < preloadCount; i++) {
      const img = new Image();
      img.src = imageUrls[i];
      images.push(img);
    }

    // Очистка не требуется, браузер сам управляет кэшем
  }, [imageUrls, enabled]);
}

