import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
const PhotoGallery = ({ images, initialIndex, onClose, isLoading = false }) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const [direction, setDirection] = useState(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
    // Минимальное расстояние для свайпа
    const minSwipeDistance = 50;
    useEffect(() => {
        // Закрытие по Escape
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        // Блокировка скролла body при открытой галерее
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.body.style.overflow = '';
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);
    const onTouchStart = (e) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };
    const onTouchMove = (e) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };
    const onTouchEnd = () => {
        if (!touchStart || !touchEnd)
            return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;
        if (isLeftSwipe && currentIndex < images.length - 1) {
            setDirection('left');
            setIsTransitioning(true);
            setCurrentIndex(currentIndex + 1);
        }
        if (isRightSwipe && currentIndex > 0) {
            setDirection('right');
            setIsTransitioning(true);
            setCurrentIndex(currentIndex - 1);
        }
    };
    const goToPrevious = () => {
        if (currentIndex > 0 && !isTransitioning) {
            setDirection('right');
            setIsTransitioning(true);
            setCurrentIndex(currentIndex - 1);
        }
    };
    const goToNext = () => {
        if (currentIndex < images.length - 1 && !isTransitioning) {
            setDirection('left');
            setIsTransitioning(true);
            setCurrentIndex(currentIndex + 1);
        }
    };
    // Сброс состояния анимации после завершения перехода
    useEffect(() => {
        if (isTransitioning) {
            const timer = setTimeout(() => {
                setIsTransitioning(false);
                setDirection(null);
            }, 300); // Длительность анимации должна совпадать с CSS transition
            return () => clearTimeout(timer);
        }
    }, [isTransitioning, currentIndex]);
    if (images.length === 0)
        return null;
    return (_jsx("div", { className: "photo-gallery", onClick: onClose, children: _jsxs("div", { className: "photo-gallery__container", onClick: (e) => e.stopPropagation(), children: [_jsx("button", { className: "photo-gallery__close", onClick: onClose, "aria-label": "\u0417\u0430\u043A\u0440\u044B\u0442\u044C", children: "\u00D7" }), images.length > 1 && (_jsxs(_Fragment, { children: [_jsx("button", { className: "photo-gallery__nav photo-gallery__nav--prev", onClick: goToPrevious, disabled: currentIndex === 0, "aria-label": "\u041F\u0440\u0435\u0434\u044B\u0434\u0443\u0449\u0435\u0435 \u0444\u043E\u0442\u043E", children: "\u2039" }), _jsx("button", { className: "photo-gallery__nav photo-gallery__nav--next", onClick: goToNext, disabled: currentIndex === images.length - 1, "aria-label": "\u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u0435 \u0444\u043E\u0442\u043E", children: "\u203A" })] })), _jsx("div", { className: "photo-gallery__image-wrapper", onTouchStart: onTouchStart, onTouchMove: onTouchMove, onTouchEnd: onTouchEnd, children: isLoading ? (_jsx("div", { className: "photo-gallery__loading", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0444\u043E\u0442\u043E..." })) : (_jsx("div", { className: `photo-gallery__image-container ${direction ? `--direction-${direction}` : ''} ${isTransitioning ? '--transitioning' : ''}`, children: _jsx("img", { src: images[currentIndex], alt: `Фото ${currentIndex + 1} из ${images.length}`, className: "photo-gallery__image" }, currentIndex) })) }), images.length > 1 && (_jsxs(_Fragment, { children: [_jsx("div", { className: "photo-gallery__indicators", children: images.map((_, index) => (_jsx("button", { className: `photo-gallery__indicator ${index === currentIndex ? '--active' : ''}`, onClick: () => setCurrentIndex(index), "aria-label": `Перейти к фото ${index + 1}` }, index))) }), _jsxs("div", { className: "photo-gallery__counter", children: [currentIndex + 1, " / ", images.length] })] }))] }) }));
};
export default PhotoGallery;
