import { useState } from 'react';
import PhotoGallery from './PhotoGallery';
import type { Product } from '../types';
import { getProductPhotos } from '../services/api';
import { getBackendUrl } from '../utils/backendUrl';
import { logger } from '../utils/logger';

type Props = {
  product: Product;
  onContact: (product: Product) => void;
};

const ProductCard = ({ product, onContact }: Props) => {
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [fullPhotos, setFullPhotos] = useState<string[] | null>(null);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

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

  return (
    <>
      <article className="product-card">
        <div
          className={`product-card__image-wrapper ${
            hasMultiplePhotos ? '--has-multiple' : ''
          }`}
          onClick={handleImageClick}
        >
          <img src={thumbPhoto} alt={product.title} loading="lazy" decoding="async" />
          {hasMultiplePhotos && (
            <div className="product-card__photo-count">
              фото
            </div>
          )}
        </div>
        <div className="product-card__body">
          <h3>{product.title}</h3>
          <p className="product-card__price">{product.price?.text}</p>
          <button onClick={() => onContact(product)}>Написать менеджеру</button>
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








