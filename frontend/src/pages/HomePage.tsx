import { useEffect, useMemo, useState } from 'react';
import CollectionCard from '../components/CollectionCard';
import FiltersBar from '../components/FiltersBar';
import ProductCard from '../components/ProductCard';
import { getCollections, getProducts } from '../services/api';
import type { Collection, Product } from '../types';

const extractSizes = (items: Product[]): string[] => {
  const set = new Set<string>();
  items.forEach((item) => item.sizes?.forEach((size) => set.add(size)));
  return Array.from(set).sort();
};

const HomePage = () => {
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
        console.error('Error loading collections:', err);
        setError('Не удалось загрузить подборки');
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

  const handleContact = (product: Product) => {
    if (!window.Telegram?.WebApp) return;

    window.Telegram.WebApp.MainButton.text = `Написать про ${product.title}`;
    window.Telegram.WebApp.MainButton.show();
  };

  const selectedCollectionData = collections.find(
    (c) => c.id.toString() === selectedCollection,
  );

  return (
    <main>
      <header>
        {selectedCollection ? (
          <>
            <div className="header-actions">
              <button
                className="back-button"
                onClick={() => {
                  setSelectedCollection(undefined);
                  setQuery('');
                  setSize('');
                }}
              >
                ← Назад к подборкам
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <h1>{selectedCollectionData?.title || 'Товары'}</h1>
              <button
                onClick={forceReload}
                style={{
                  padding: '8px 16px',
                  background: '#0f62fe',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                🔄 Обновить
              </button>
            </div>
          </>
        ) : (
          <h1>Коллекции</h1>
        )}
      </header>

      {!selectedCollection ? (
        <>
          {loading && <p>Загрузка коллекций...</p>}
          {error && <p className="error">{error}</p>}
          {!loading && !error && collections.length === 0 && (
            <p>Коллекции не найдены</p>
          )}
          {!loading && collections.length > 0 && (
            <div className="collections-grid">
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
      ) : (
        <>
          <FiltersBar
            query={query}
            size={size}
            sizes={availableSizes}
            onQueryChange={setQuery}
            onSizeChange={setSize}
          />

          {loading && <p>Загрузка...</p>}
          {error && <p className="error">{error}</p>}

          {!loading && !products.length && <p>Товары не найдены</p>}

          <section className="products-grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} onContact={handleContact} />
            ))}
          </section>
        </>
      )}
    </main>
  );
};

export default HomePage;








