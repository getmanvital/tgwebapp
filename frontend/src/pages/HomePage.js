import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import CollectionCard from '../components/CollectionCard';
import FiltersBar from '../components/FiltersBar';
import ProductCard from '../components/ProductCard';
import { getCollections, getProducts } from '../services/api';
const extractSizes = (items) => {
    const set = new Set();
    items.forEach((item) => item.sizes?.forEach((size) => set.add(size)));
    return Array.from(set).sort();
};
const HomePage = () => {
    const [collections, setCollections] = useState([]);
    const [selectedCollection, setSelectedCollection] = useState();
    const [products, setProducts] = useState([]);
    const [query, setQuery] = useState('');
    const [size, setSize] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState();
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
        console.log('Loading collections...');
        getCollections(false) // Используем кэш для ускорения
            .then((data) => {
            console.log('Collections loaded:', data);
            setCollections(data || []);
            setLoading(false);
        })
            .catch((err) => {
            console.error('Error loading collections:', err);
            setError('Не удалось загрузить подборки');
            setLoading(false);
        });
    }, [reloadKey]);
    useEffect(() => {
        if (!selectedCollection)
            return;
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
    const handleContact = (product) => {
        if (!window.Telegram?.WebApp)
            return;
        window.Telegram.WebApp.MainButton.text = `Написать про ${product.title}`;
        window.Telegram.WebApp.MainButton.show();
    };
    const selectedCollectionData = collections.find((c) => c.id.toString() === selectedCollection);
    return (_jsxs("main", { children: [_jsx("header", { children: selectedCollection ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "header-actions", children: _jsx("button", { className: "back-button", onClick: () => {
                                    setSelectedCollection(undefined);
                                    setQuery('');
                                    setSize('');
                                }, children: "\u2190 \u041D\u0430\u0437\u0430\u0434 \u043A \u043F\u043E\u0434\u0431\u043E\u0440\u043A\u0430\u043C" }) }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }, children: [_jsx("h1", { children: selectedCollectionData?.title || 'Товары' }), _jsx("button", { onClick: forceReload, style: {
                                        padding: '8px 16px',
                                        background: '#0f62fe',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                    }, children: "\uD83D\uDD04 \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C" })] })] })) : (_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }, children: [_jsx("h1", { children: "\u041A\u043E\u043B\u043B\u0435\u043A\u0446\u0438\u0438" }), _jsx("button", { onClick: forceReload, style: {
                                padding: '8px 16px',
                                background: '#0f62fe',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '14px',
                            }, children: "\uD83D\uDD04 \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C" })] })) }), !selectedCollection ? (_jsxs(_Fragment, { children: [loading && _jsx("p", { children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u043A\u043E\u043B\u043B\u0435\u043A\u0446\u0438\u0439..." }), error && _jsx("p", { className: "error", children: error }), !loading && !error && collections.length === 0 && (_jsx("p", { children: "\u041A\u043E\u043B\u043B\u0435\u043A\u0446\u0438\u0438 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B" })), !loading && collections.length > 0 && (_jsx("div", { className: "collections-grid", children: collections.map((collection) => (_jsx(CollectionCard, { collection: collection, isActive: false, onClick: () => setSelectedCollection(collection.id.toString()) }, collection.id))) }))] })) : (_jsxs(_Fragment, { children: [_jsx(FiltersBar, { query: query, size: size, sizes: availableSizes, onQueryChange: setQuery, onSizeChange: setSize }), loading && _jsx("p", { children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." }), error && _jsx("p", { className: "error", children: error }), !loading && !products.length && _jsx("p", { children: "\u0422\u043E\u0432\u0430\u0440\u044B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B" }), _jsx("section", { className: "products-grid", children: products.map((product) => (_jsx(ProductCard, { product: product, onContact: handleContact }, product.id))) })] }))] }));
};
export default HomePage;
