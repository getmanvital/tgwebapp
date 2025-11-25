import { useState } from 'react';
import clsx from 'clsx';
import PhotoGallery from './PhotoGallery';
import type { Product } from '../types';
import { getProductPhotos } from '../services/api';
import { getBackendUrl } from '../utils/backendUrl';
import { logger } from '../utils/logger';
import { useCart } from '../contexts/CartContext';
import { useToast } from '../contexts/ToastContext';

type Props = {
  product: Product;
  onContact?: (product: Product) => void;
};

const ProductCard = ({ product, onContact }: Props) => {
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [fullPhotos, setFullPhotos] = useState<string[] | null>(null);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const { addToCart, isInCart } = useCart();
  const { showToast } = useToast();

  // Получаем только обложку для карточки товара
  const getThumbPhoto = (): string => {
    // Используем thumb_photo (может быть локальный путь или полный URL)
    if (product.thumb_photo) {
      // Если это относительный путь, добавляем базовый URL бэкенда
      if (product.thumb_photo.startsWith('/photos/')) {
        const backendUrl = getBackendUrl();
        return `${backendUrl}${product.thumb_photo}`;
      }
      return product.thumb_photo;
    }

    // Если нет thumb_photo, используем thumb
    if (product.thumb && Array.isArray(product.thumb) && product.thumb.length > 0) {
      // Берем самый большой размер из thumb
      const largestThumb = product.thumb.reduce((prev, curr) => {
        const prevSize = (prev.width || 0) * (prev.height || 0);
        const currSize = (curr.width || 0) * (curr.height || 0);
        return currSize > prevSize ? curr : prev;
      });
      
      if (largestThumb.url) {
        return largestThumb.url;
      }
    }

    // Если фото нет, используем placeholder
    return 'https://via.placeholder.com/240x240?text=No+Image';
  };

  // Проверяем, есть ли дополнительные фото (не только обложка)
  const hasMultiplePhotos = (product.photos && (
    (Array.isArray(product.photos) && product.photos.length > 0) ||
    (typeof product.photos === 'object' && product.photos !== null)
  )) || false;

  const thumbPhoto = getThumbPhoto();

  // Извлекаем все фото из продукта (используем уже загруженные данные)
  const getAllPhotos = (): string[] => {
    const photos: string[] = [];

    // Если photos - массив
    if (product.photos && Array.isArray(product.photos) && product.photos.length > 0) {
      product.photos.forEach((photo: any) => {
        if (typeof photo === 'object' && photo !== null) {
          // Проверяем массив sizes
          if (photo.sizes && Array.isArray(photo.sizes) && photo.sizes.length > 0) {
            // Берем самый большой размер
            const largestSize = photo.sizes.reduce((prev: any, curr: any) => {
              const prevSize = (prev.width || 0) * (prev.height || 0);
              const currSize = (curr.width || 0) * (curr.height || 0);
              return currSize > prevSize ? curr : prev;
            });
            
            if (largestSize.url) {
              try {
                const urlObj = new URL(largestSize.url);
                urlObj.searchParams.delete('crop');
                urlObj.searchParams.delete('size');
                photos.push(urlObj.toString());
              } catch (e) {
                photos.push(largestSize.url);
              }
            }
          } else {
            // Используем прямые поля
            const photoUrl = photo.photo_2560 || photo.photo_1280 || photo.photo_604 || photo.url;
            if (photoUrl) {
              try {
                const urlObj = new URL(photoUrl);
                urlObj.searchParams.delete('crop');
                urlObj.searchParams.delete('size');
                photos.push(urlObj.toString());
              } catch (e) {
                photos.push(photoUrl);
              }
            }
          }
        } else if (typeof photo === 'string') {
          photos.push(photo);
        }
      });
    }
    // Если photos - объект (не массив)
    else if (product.photos && !Array.isArray(product.photos) && typeof product.photos === 'object') {
      const photoUrl = product.photos.photo_2560 || product.photos.photo_1280 || product.photos.photo_604;
      if (photoUrl) {
        try {
          const urlObj = new URL(photoUrl);
          urlObj.searchParams.delete('crop');
          urlObj.searchParams.delete('size');
          photos.push(urlObj.toString());
        } catch (e) {
          photos.push(photoUrl);
        }
      }
    }

    // Если нет фото, добавляем thumb_photo
    if (photos.length === 0 && product.thumb_photo) {
      try {
        const urlObj = new URL(product.thumb_photo);
        urlObj.searchParams.delete('crop');
        urlObj.searchParams.delete('size');
        photos.push(urlObj.toString());
      } catch (e) {
        photos.push(product.thumb_photo);
      }
    }

    // Если все еще нет фото, используем обложку
    if (photos.length === 0) {
      photos.push(thumbPhoto);
    }

    return photos;
  };

  const handleImageClick = async () => {
    setIsGalleryOpen(true);
    
    // Всегда загружаем полные фото через API для получения всех локальных уникальных фото
    if (!fullPhotos && !loadingPhotos) {
      setLoadingPhotos(true);
      try {
        const photos = await getProductPhotos(product.id);
        if (photos.length > 0) {
          // Преобразуем относительные пути в полные URL и дедуплицируем
          const backendUrl = getBackendUrl();
          const seenUrls = new Set<string>();
          const fullUrls = photos
            .map((photo: string) => {
              if (photo.startsWith('/photos/')) {
                return `${backendUrl}${photo}`;
              }
              return photo;
            })
            .filter((url: string) => {
              // Дедупликация: убираем параметры размера для сравнения
              const normalizedUrl = url.split('?')[0].split('#')[0];
              if (seenUrls.has(normalizedUrl)) {
                return false;
              }
              seenUrls.add(normalizedUrl);
              return true;
            });
          setFullPhotos(fullUrls);
        } else {
          // Fallback: используем только обложку
          setFullPhotos([thumbPhoto]);
        }
      } catch (error) {
        logger.error('Error loading product photos:', error);
        // Если не удалось загрузить, используем только обложку
        setFullPhotos([thumbPhoto]);
      } finally {
        setLoadingPhotos(false);
      }
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product);
    showToast('Товар добавлен в корзину', 'success');
  };

  return (
    <>
      <article className="bg-tg-secondary-bg rounded-2xl p-3 flex flex-col gap-2 shadow-md transition-all duration-200 hover:scale-[1.02] hover:shadow-lg dark:bg-white/10 dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] min-h-[320px] animate-fade-in">
        <div
          className={clsx(
            'relative w-full cursor-pointer rounded-xl overflow-hidden aspect-square',
            hasMultiplePhotos && 'after:content-[""] after:absolute after:inset-0 after:bg-gradient-to-b after:from-transparent after:to-black/10 after:pointer-events-none'
          )}
          onClick={handleImageClick}
        >
          <img 
            src={thumbPhoto} 
            alt={product.title} 
            loading="lazy" 
            decoding="async"
            className="w-full h-full object-cover block"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'https://via.placeholder.com/240x240?text=No+Image';
            }}
          />
          <button
            onClick={handleAddToCart}
            className={clsx(
              'absolute top-2 right-2 w-11 h-11 rounded-full',
              'bg-tg-button text-tg-button-text',
              'flex items-center justify-center',
              'shadow-lg transition-all duration-200',
              'hover:scale-110 active:scale-95',
              'z-10 animate-scale-in',
              isInCart(product.id) && 'bg-green-500'
            )}
            aria-label="Добавить в корзину"
          >
            <span className="text-xl transition-transform duration-200">{isInCart(product.id) ? '✓' : '🛒'}</span>
          </button>
        </div>
        <div className="flex flex-col gap-2 flex-1">
          <h3 className="m-0 text-tg-text dark:text-white line-clamp-2 min-h-[2.5rem]">{product.title}</h3>
          <p className="font-semibold text-tg-text m-0 mt-auto">{product.price?.text}</p>
        </div>
      </article>

      {isGalleryOpen && (
        <PhotoGallery
          images={fullPhotos || [thumbPhoto]}
          initialIndex={0}
          onClose={() => setIsGalleryOpen(false)}
          isLoading={loadingPhotos}
        />
      )}
    </>
  );
};

export default ProductCard;








