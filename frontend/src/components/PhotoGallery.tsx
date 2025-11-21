import { useEffect, useState } from 'react';

type Props = {
  images: string[];
  initialIndex: number;
  onClose: () => void;
  isLoading?: boolean;
};

const PhotoGallery = ({ images, initialIndex, onClose, isLoading = false }: Props) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [direction, setDirection] = useState<'left' | 'right' | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Минимальное расстояние для свайпа
  const minSwipeDistance = 50;

  useEffect(() => {
    // Закрытие по Escape
    const handleEscape = (e: KeyboardEvent) => {
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

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

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

  if (images.length === 0) return null;

  return (
    <div className="photo-gallery" onClick={onClose}>
      <div className="photo-gallery__container" onClick={(e) => e.stopPropagation()}>
        <button
          className="photo-gallery__close"
          onClick={onClose}
          aria-label="Закрыть"
        >
          ×
        </button>

        {images.length > 1 && (
          <>
            <button
              className="photo-gallery__nav photo-gallery__nav--prev"
              onClick={goToPrevious}
              disabled={currentIndex === 0}
              aria-label="Предыдущее фото"
            >
              ‹
            </button>
            <button
              className="photo-gallery__nav photo-gallery__nav--next"
              onClick={goToNext}
              disabled={currentIndex === images.length - 1}
              aria-label="Следующее фото"
            >
              ›
            </button>
          </>
        )}

        <div
          className="photo-gallery__image-wrapper"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {isLoading ? (
            <div className="photo-gallery__loading">Загрузка фото...</div>
          ) : (
            <div 
              className={`photo-gallery__image-container ${
                direction ? `--direction-${direction}` : ''
              } ${isTransitioning ? '--transitioning' : ''}`}
            >
              <img
                src={images[currentIndex]}
                alt={`Фото ${currentIndex + 1} из ${images.length}`}
                className="photo-gallery__image"
                key={currentIndex}
              />
            </div>
          )}
        </div>

        {images.length > 1 && (
          <>
            <div className="photo-gallery__indicators">
              {images.map((_, index) => (
                <button
                  key={index}
                  className={`photo-gallery__indicator ${
                    index === currentIndex ? '--active' : ''
                  }`}
                  onClick={() => setCurrentIndex(index)}
                  aria-label={`Перейти к фото ${index + 1}`}
                />
              ))}
            </div>

            <div className="photo-gallery__counter">
              {currentIndex + 1} / {images.length}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PhotoGallery;

