import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import PhotoGallery from './PhotoGallery';
import { getProductPhotos } from '../services/api';
const ProductCard = ({ product, onContact }) => {
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [fullPhotos, setFullPhotos] = useState(null);
    const [loadingPhotos, setLoadingPhotos] = useState(false);
    // Получаем только обложку для карточки товара
    const getThumbPhoto = () => {
        // Используем thumb_photo (может быть локальный путь или полный URL)
        if (product.thumb_photo) {
            // Если это относительный путь, добавляем базовый URL бэкенда
            if (product.thumb_photo.startsWith('/photos/')) {
                const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';
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
    const hasMultiplePhotos = (product.photos && ((Array.isArray(product.photos) && product.photos.length > 0) ||
        (typeof product.photos === 'object' && product.photos !== null))) || false;
    const thumbPhoto = getThumbPhoto();
    // Извлекаем все фото из продукта (используем уже загруженные данные)
    const getAllPhotos = () => {
        const photos = [];
        // Если photos - массив
        if (product.photos && Array.isArray(product.photos) && product.photos.length > 0) {
            product.photos.forEach((photo) => {
                if (typeof photo === 'object' && photo !== null) {
                    // Проверяем массив sizes
                    if (photo.sizes && Array.isArray(photo.sizes) && photo.sizes.length > 0) {
                        // Берем самый большой размер
                        const largestSize = photo.sizes.reduce((prev, curr) => {
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
                            }
                            catch (e) {
                                photos.push(largestSize.url);
                            }
                        }
                    }
                    else {
                        // Используем прямые поля
                        const photoUrl = photo.photo_2560 || photo.photo_1280 || photo.photo_604 || photo.url;
                        if (photoUrl) {
                            try {
                                const urlObj = new URL(photoUrl);
                                urlObj.searchParams.delete('crop');
                                urlObj.searchParams.delete('size');
                                photos.push(urlObj.toString());
                            }
                            catch (e) {
                                photos.push(photoUrl);
                            }
                        }
                    }
                }
                else if (typeof photo === 'string') {
                    photos.push(photo);
                }
            });
        }
        // Если photos - объект (не массив)
        else if (product.photos && !Array.isArray(product.photos) && typeof product.photos === 'object') {
            const photoUrl = product.photos.photo_2560 || product.photos.photo_1280 || product.photos.photo_604 || product.photos.url;
            if (photoUrl) {
                try {
                    const urlObj = new URL(photoUrl);
                    urlObj.searchParams.delete('crop');
                    urlObj.searchParams.delete('size');
                    photos.push(urlObj.toString());
                }
                catch (e) {
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
            }
            catch (e) {
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
                    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';
                    const seenUrls = new Set();
                    const fullUrls = photos
                        .map((photo) => {
                        if (photo.startsWith('/photos/')) {
                            return `${backendUrl}${photo}`;
                        }
                        return photo;
                    })
                        .filter((url) => {
                        // Дедупликация: убираем параметры размера для сравнения
                        const normalizedUrl = url.split('?')[0].split('#')[0];
                        if (seenUrls.has(normalizedUrl)) {
                            return false;
                        }
                        seenUrls.add(normalizedUrl);
                        return true;
                    });
                    setFullPhotos(fullUrls);
                }
                else {
                    // Fallback: используем только обложку
                    setFullPhotos([thumbPhoto]);
                }
            }
            catch (error) {
                console.error('Error loading product photos:', error);
                // Если не удалось загрузить, используем только обложку
                setFullPhotos([thumbPhoto]);
            }
            finally {
                setLoadingPhotos(false);
            }
        }
    };
    return (_jsxs(_Fragment, { children: [_jsxs("article", { className: "product-card", children: [_jsxs("div", { className: `product-card__image-wrapper ${hasMultiplePhotos ? '--has-multiple' : ''}`, onClick: handleImageClick, children: [_jsx("img", { src: thumbPhoto, alt: product.title, loading: "lazy" }), hasMultiplePhotos && (_jsx("div", { className: "product-card__photo-count", children: "\u0444\u043E\u0442\u043E" }))] }), _jsxs("div", { className: "product-card__body", children: [_jsx("h3", { children: product.title }), _jsx("p", { className: "product-card__price", children: product.price?.text }), _jsx("button", { onClick: () => onContact(product), children: "\u041D\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u043C\u0435\u043D\u0435\u0434\u0436\u0435\u0440\u0443" })] })] }), isGalleryOpen && (_jsx(PhotoGallery, { images: fullPhotos || [thumbPhoto], initialIndex: 0, onClose: () => setIsGalleryOpen(false), isLoading: loadingPhotos }))] }));
};
export default ProductCard;
