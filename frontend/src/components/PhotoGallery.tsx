import { useEffect, useState } from 'react';
import clsx from 'clsx';

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
    <div 
      className="fixed inset-0 bg-black/95 z-[1000] flex items-center justify-center touch-pan-y"
      onClick={onClose}
    >
      <div className="relative w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <button
          className="absolute bottom-6 right-6 w-11 h-11 border-none bg-white/20 text-white text-[32px] leading-none rounded-full cursor-pointer z-[1001] flex items-center justify-center transition-colors hover:bg-white/30"
          style={{
            bottom: 'max(24px, calc(24px + env(safe-area-inset-bottom)))',
            right: 'max(24px, calc(24px + env(safe-area-inset-right)))',
          }}
          onClick={onClose}
          aria-label="Закрыть"
        >
          ×
        </button>

        {images.length > 1 && (
          <>
            <button
              className={clsx(
                'absolute top-1/2 left-4 -translate-y-1/2 w-12 h-12 border-none bg-white/20 text-white text-[32px] leading-none rounded-full cursor-pointer z-[1001] flex items-center justify-center transition-colors select-none hover:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed md:left-2 md:w-10 md:h-10 md:text-[28px]',
                currentIndex === 0 && 'opacity-30 cursor-not-allowed'
              )}
              onClick={goToPrevious}
              disabled={currentIndex === 0}
              aria-label="Предыдущее фото"
            >
              ‹
            </button>
            <button
              className={clsx(
                'absolute top-1/2 right-4 -translate-y-1/2 w-12 h-12 border-none bg-white/20 text-white text-[32px] leading-none rounded-full cursor-pointer z-[1001] flex items-center justify-center transition-colors select-none hover:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed md:right-2 md:w-10 md:h-10 md:text-[28px]',
                currentIndex === images.length - 1 && 'opacity-30 cursor-not-allowed'
              )}
              onClick={goToNext}
              disabled={currentIndex === images.length - 1}
              aria-label="Следующее фото"
            >
              ›
            </button>
          </>
        )}

        <div
          className="w-full h-full flex items-center justify-center p-[60px_20px_100px] box-border relative overflow-hidden md:p-[40px_16px]"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {isLoading ? (
            <div className="text-white text-lg text-center p-5">Загрузка фото...</div>
          ) : (
            <div 
              className={clsx(
                'w-full h-full flex items-center justify-center relative transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] transition-opacity duration-300',
                direction === 'left' && 'animate-slide-in-left',
                direction === 'right' && 'animate-slide-in-right'
              )}
            >
                  <img
                    src={images[currentIndex]}
                    alt={`Фото ${currentIndex + 1} из ${images.length}`}
                    className="max-w-full max-h-full w-auto h-auto object-contain select-none pointer-events-none block"
                    key={currentIndex}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://via.placeholder.com/800x600?text=Ошибка+загрузки';
                    }}
                  />
            </div>
          )}
        </div>

        {images.length > 1 && (
          <>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-[1001]">
              {images.map((_, index) => (
                <button
                  key={index}
                  className={clsx(
                    'w-2 h-2 border-none rounded-full cursor-pointer p-0 transition-all',
                    index === currentIndex
                      ? 'bg-white scale-[1.3]'
                      : 'bg-white/40 hover:bg-white/60 hover:scale-110'
                  )}
                  onClick={() => setCurrentIndex(index)}
                  aria-label={`Перейти к фото ${index + 1}`}
                />
              ))}
            </div>

            <div className="absolute top-4 left-4 text-white text-sm font-medium bg-black/50 px-3 py-1.5 rounded-2xl z-[1001]">
              {currentIndex + 1} / {images.length}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PhotoGallery;

