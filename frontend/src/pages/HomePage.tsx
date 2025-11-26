import { useEffect, useState, useMemo, useImperativeHandle, forwardRef } from 'react';
import CollectionCard from '../components/CollectionCard';
import CollectionCardSkeleton from '../components/CollectionCardSkeleton';
import ProductCard from '../components/ProductCard';
import ProductCardSkeleton from '../components/ProductCardSkeleton';
import { getCollections, getProducts } from '../services/api';
import { useTelegramContact } from '../hooks/useTelegramContact';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';
import { useImagePrefetch } from '../hooks/useImagePrefetch';
import { getBackendUrl } from '../utils/backendUrl';
import type { Collection, Product } from '../types';
import { logger } from '../utils/logger';

export type HomePageRef = {
  resetCollection: () => void;
};

type Props = {
  onCollectionChange?: (inCollection: boolean) => void;
};

const HomePage = forwardRef<HomePageRef, Props>(({ onCollectionChange }, ref) => {
  const { hideContactButton } = useTelegramContact();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true); // Начинаем с true для показа скелетонов сразу
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [error, setError] = useState<string>();

  useImperativeHandle(ref, () => ({
    resetCollection: () => {
      setSelectedCollection(undefined);
    },
  }));

  // Сообщаем в App, находимся ли в подборке
  useEffect(() => {
    onCollectionChange?.(!!selectedCollection);
  }, [selectedCollection, onCollectionChange]);

  useEffect(() => {
    setLoading(true);
    setError(undefined);
    
    getCollections(true)
      .then((data) => {
        if (data && Array.isArray(data) && data.length > 0) {
          setCollections(data);
        } else {
          setError('Подборки не найдены');
          setCollections([]);
        }
      })
      .catch((err) => {
        logger.error('Error loading collections:', err);
        const errorMessage = err?.response?.status 
          ? `Ошибка ${err.response.status}: ${err.response.statusText || 'Не удалось подключиться к серверу'}`
          : err?.message || 'Не удалось загрузить подборки';
        setError(errorMessage);
        setCollections([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedCollection) {
      setProducts([]);
      return;
    }
    
    setLoadingProducts(true);
    setError(undefined);
    getProducts({
      albumId: selectedCollection,
    }, false)
      .then((data) => setProducts(data))
      .catch(() => setError('Ошибка загрузки товаров'))
      .finally(() => setLoadingProducts(false));
  }, [selectedCollection]);

  // Скрываем кнопку при изменении выбранной коллекции
  useEffect(() => {
    if (!selectedCollection) {
      hideContactButton();
    }
  }, [selectedCollection, hideContactButton]);

  // Навигация свайпом: при свайпе вправо возвращаемся к коллекциям
  useSwipeNavigation({
    onSwipeRight: () => {
      if (selectedCollection) {
        setSelectedCollection(undefined);
      }
    },
    disabled: !selectedCollection, // Отключаем, если уже на странице коллекций
  });

  // Предзагрузка изображений товаров
  const productImageUrls = useMemo(() => {
    if (!selectedCollection || products.length === 0) {
      return [];
    }
    const backendUrl = getBackendUrl();
    return products
      .map((product) => {
        if (product.thumb_photo) {
          if (product.thumb_photo.startsWith('/photos/')) {
            return `${backendUrl}${product.thumb_photo}`;
          }
          return product.thumb_photo;
        }
        return null;
      })
      .filter((url): url is string => url !== null)
      .slice(0, 10); // Предзагружаем первые 10 изображений
  }, [products, selectedCollection]);

  useImagePrefetch(productImageUrls, !!selectedCollection);

  const selectedCollectionData = collections.find(
    (c) => c.id.toString() === selectedCollection,
  );

  return (
    <main className="flex flex-col gap-4 w-full max-w-full box-border pb-[calc(72px+max(16px,env(safe-area-inset-bottom)))]">
      <header className="flex flex-col gap-3">
        {selectedCollection ? (
          <>
            <button
              type="button"
              onClick={() => setSelectedCollection(undefined)}
              className="inline-flex items-center gap-1 text-sm text-tg-hint hover:text-tg-text"
            >
              <span className="text-lg leading-none">←</span>
              <span>Назад в каталог</span>
            </button>
            <h1>{selectedCollectionData?.title || 'Товары'}</h1>
          </>
        ) : (
          <h1>Коллекции</h1>
        )}
      </header>

      {!selectedCollection ? (
        <>
          {error && <p className="error">{error}</p>}
          {loading ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3 w-full box-border overflow-visible">
              {Array.from({ length: 6 }).map((_, index) => (
                <CollectionCardSkeleton key={index} />
              ))}
            </div>
          ) : (
            <>
              {collections.length === 0 && !error && (
                <p>Коллекции не найдены</p>
              )}
              {collections.length > 0 && (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3 w-full box-border overflow-visible">
                  {collections.map((collection, index) => (
                    <div
                      key={collection.id}
                      className="animate-fade-in"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <CollectionCard
                      collection={collection}
                      isActive={false}
                      onClick={() => setSelectedCollection(collection.id.toString())}
                    />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <>
          {error && <p className="error">{error}</p>}

          {loadingProducts ? (
            <section className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <ProductCardSkeleton key={index} />
              ))}
            </section>
          ) : (
            <>
              {!products.length && !error && <p>Товары не найдены</p>}
              {products.length > 0 && (
                <section className="grid grid-cols-2 gap-3">
                  {products.map((product, index) => (
                    <div
                      key={product.id}
                      className="animate-fade-in"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <ProductCard product={product} />
                    </div>
                  ))}
                </section>
              )}
            </>
          )}
        </>
      )}
    </main>
  );
});

HomePage.displayName = 'HomePage';

export default HomePage;








