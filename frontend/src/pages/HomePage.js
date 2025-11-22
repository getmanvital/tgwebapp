import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
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
import { logger } from '../utils/logger';
const extractSizes = (items) => {
    const set = new Set();
    items.forEach((item) => item.sizes?.forEach((size) => set.add(size)));
    return Array.from(set).sort();
};
const HomePage = ({ onNavigateToUsers }) => {
    const user = useTelegramUser();
    const isAdmin = useIsAdmin();
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
        getCollections(true)
            .then((data) => {
            if (data && Array.isArray(data) && data.length > 0) {
                setCollections(data);
            }
            else {
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
                                        background: 'var(--tg-theme-button-color, #0f62fe)',
                                        color: 'var(--tg-theme-button-text-color, #fff)',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        transition: 'opacity 0.2s',
                                    }, onMouseEnter: (e) => {
                                        e.currentTarget.style.opacity = '0.9';
                                    }, onMouseLeave: (e) => {
                                        e.currentTarget.style.opacity = '1';
                                    }, children: "\uD83D\uDD04 \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C" })] })] })) : (_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }, children: [_jsx("h1", { children: "\u041A\u043E\u043B\u043B\u0435\u043A\u0446\u0438\u0438" }), isAdmin && onNavigateToUsers && (_jsx("button", { onClick: onNavigateToUsers, style: {
                                padding: '8px 16px',
                                background: 'var(--tg-theme-button-color, #0f62fe)',
                                color: 'var(--tg-theme-button-text-color, #fff)',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                transition: 'opacity 0.2s',
                            }, onMouseEnter: (e) => {
                                e.currentTarget.style.opacity = '0.9';
                            }, onMouseLeave: (e) => {
                                e.currentTarget.style.opacity = '1';
                            }, children: "\uD83D\uDC65 \u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0438" }))] })) }), !selectedCollection ? (_jsxs(_Fragment, { children: [error && _jsx("p", { className: "error", children: error }), loading ? (_jsx("div", { className: "collections-grid", children: Array.from({ length: 6 }).map((_, index) => (_jsx(CollectionCardSkeleton, {}, index))) })) : (_jsxs(_Fragment, { children: [collections.length === 0 && !error && (_jsx("p", { children: "\u041A\u043E\u043B\u043B\u0435\u043A\u0446\u0438\u0438 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B" })), collections.length > 0 && (_jsx("div", { className: "collections-grid", children: collections.map((collection) => (_jsx(CollectionCard, { collection: collection, isActive: false, onClick: () => setSelectedCollection(collection.id.toString()) }, collection.id))) }))] }))] })) : (_jsxs(_Fragment, { children: [_jsx(FiltersBar, { query: query, size: size, sizes: availableSizes, onQueryChange: setQuery, onSizeChange: setSize }), error && _jsx("p", { className: "error", children: error }), loading ? (_jsx("section", { className: "products-grid", children: Array.from({ length: 6 }).map((_, index) => (_jsx(ProductCardSkeleton, {}, index))) })) : (_jsxs(_Fragment, { children: [!products.length && !error && _jsx("p", { children: "\u0422\u043E\u0432\u0430\u0440\u044B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B" }), products.length > 0 && (_jsx("section", { className: "products-grid", children: products.map((product) => (_jsx(ProductCard, { product: product, onContact: handleContact }, product.id))) }))] }))] })), _jsx(UserAuthStatus, { user: user })] }));
};
export default HomePage;
