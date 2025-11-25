import clsx from 'clsx';
import type { Collection } from '../types';

type Props = {
  collection: Collection;
  isActive: boolean;
  onClick: () => void;
};

const CollectionCard = ({ collection, isActive, onClick }: Props) => {
  // Выбираем лучшее фото из доступных размеров
  const image =
    collection.photo?.sizes?.find((s) => s.type === 'x' || s.type === 'y')?.url ||
    collection.photo?.sizes?.find((s) => s.type === 'm')?.url ||
    collection.photo?.sizes?.[collection.photo.sizes.length - 1]?.url ||
    'https://via.placeholder.com/300x200?text=No+Image';

  return (
    <article
      className={clsx(
        'bg-tg-secondary-bg rounded-2xl overflow-hidden cursor-pointer',
        'transition-all duration-200 shadow-sm border-2',
        'hover:-translate-y-0.5 hover:shadow-md',
        'dark:bg-white/10 dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] dark:hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]',
        isActive
          ? 'border-tg-button shadow-[0_4px_16px_rgba(15,98,254,0.2)]'
          : 'border-transparent'
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="relative w-full aspect-video overflow-hidden">
        <img 
          src={image} 
          alt={collection.title} 
          loading="lazy" 
          decoding="async"
          className="w-full h-full object-cover"
        />
        {collection.count !== undefined && (
          <span className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded-lg text-xs font-medium dark:bg-white/20 dark:backdrop-blur-[10px]">
            {collection.count} товаров
          </span>
        )}
      </div>
      <h3 className="p-3 m-0 text-sm font-semibold text-center text-tg-text">
        {collection.title}
      </h3>
    </article>
  );
};

export default CollectionCard;






