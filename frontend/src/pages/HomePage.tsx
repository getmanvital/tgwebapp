import { useEffect, useMemo, useState } from 'react';
import CollectionCard from '../components/CollectionCard';
import CollectionCardSkeleton from '../components/CollectionCardSkeleton';
import FiltersBar from '../components/FiltersBar';
import ProductCard from '../components/ProductCard';
import ProductCardSkeleton from '../components/ProductCardSkeleton';
import UserAuthStatus from '../components/UserAuthStatus';
import { getCollections, getProducts } from '../services/api';
import { useTelegramUser } from '../hooks/useTelegramUser';
import { useIsAdmin } from '../hooks/useIsAdmin';
import { useTelegramContact } from '../hooks/useTelegramContact';
import type { Collection, Product } from '../types';
import { logger } from '../utils/logger';

const extractSizes = (items: Product[]): string[] => {
  const set = new Set<string>();
  items.forEach((item) => item.sizes?.forEach((size) => set.add(size)));
  return Array.from(set).sort();
};

const HomePage = ({ 
  onNavigateToUsers, 
  onNavigateToChats 
}: { 
  onNavigateToUsers?: () => void;
  onNavigateToChats?: () => void;
}) => {
  const user = useTelegramUser();
  const isAdmin = useIsAdmin();
  const { showContactButton, hideContactButton } = useTelegramContact();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string>();
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [size, setSize] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [reloadKey, setReloadKey] = useState(0);

  // Функция для принудительной перезагрузки всех данных
  const forceReload = () => {
    setReloadKey(prev => prev + 1);
    setCollections([]);
    setProducts([]);
    setError(undefined);
  };

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
  }, [reloadKey]);

  useEffect(() => {
    if (!selectedCollection) return;
    
    setLoading(true);
    setError(undefined);
    getProducts({
      albumId: selectedCollection,
      query,
      size,
    }, reloadKey > 0) // Принудительная перезагрузка только при явном обновлении
      .then((data) => setProducts(data))
      .catch(() => setError('Ошибка загрузки товаров'))
      .finally(() => setLoading(false));
  }, [selectedCollection, query, size, reloadKey]);

  const availableSizes = useMemo(() => extractSizes(products), [products]);

  // Скрываем кнопку при изменении выбранной коллекции или товаров
  useEffect(() => {
    if (!selectedCollection) {
      hideContactButton();
    }
  }, [selectedCollection, hideContactButton]);

  const handleContact = (product: Product) => {
    showContactButton(product);
  };

  const selectedCollectionData = collections.find(
    (c) => c.id.toString() === selectedCollection,
  );

  return (
    <main className="flex flex-col gap-4 w-full max-w-full box-border pb-[calc(72px+max(16px,env(safe-area-inset-bottom)))]">
      <header className="flex flex-col gap-3">
        {selectedCollection ? (
          <>
            <div className="flex items-center">
              <button
                className="border-none bg-transparent text-tg-link cursor-pointer py-2 px-0 text-sm font-medium flex items-center gap-1 transition-opacity hover:opacity-70"
                onClick={() => {
                  setSelectedCollection(undefined);
                  setQuery('');
                  setSize('');
                }}
              >
                ← Назад к подборкам
              </button>
            </div>
            <div className="flex justify-between items-center w-full">
              <h1>{selectedCollectionData?.title || 'Товары'}</h1>
              <button
                onClick={forceReload}
                className="px-4 py-2 bg-tg-button text-tg-button-text border-none rounded-lg cursor-pointer text-sm transition-opacity hover:opacity-90"
              >
                🔄 Обновить
              </button>
            </div>
          </>
        ) : (
          <div className="flex justify-between items-center w-full">
            <h1>Коллекции</h1>
            {isAdmin && (onNavigateToUsers || onNavigateToChats) && (
              <div className="flex gap-2">
                {onNavigateToChats && (
                  <button
                    onClick={onNavigateToChats}
                    className="px-4 py-2 bg-tg-button text-tg-button-text border-none rounded-lg cursor-pointer text-sm transition-opacity hover:opacity-90"
                  >
                    💬 Чаты
                  </button>
                )}
                {onNavigateToUsers && (
                  <button
                    onClick={onNavigateToUsers}
                    className="px-4 py-2 bg-tg-button text-tg-button-text border-none rounded-lg cursor-pointer text-sm transition-opacity hover:opacity-90"
                  >
                    👥 Пользователи
                  </button>
                )}
              </div>
            )}
          </div>
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
                  {collections.map((collection) => (
                    <CollectionCard
                      key={collection.id}
                      collection={collection}
                      isActive={false}
                      onClick={() => setSelectedCollection(collection.id.toString())}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <>
          <FiltersBar
            query={query}
            size={size}
            sizes={availableSizes}
            onQueryChange={setQuery}
            onSizeChange={setSize}
          />

          {error && <p className="error">{error}</p>}

          {loading ? (
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
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} onContact={handleContact} />
                  ))}
                </section>
              )}
            </>
          )}
        </>
      )}
      <UserAuthStatus user={user} />
    </main>
  );
};

export default HomePage;








