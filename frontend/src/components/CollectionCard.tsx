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
      className={`collection-card ${isActive ? '--active' : ''}`}
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
      <div className="collection-card__image">
        <img src={image} alt={collection.title} loading="lazy" decoding="async" />
        {collection.count !== undefined && (
          <span className="collection-card__count">{collection.count} товаров</span>
        )}
      </div>
      <h3 className="collection-card__title">{collection.title}</h3>
    </article>
  );
};

export default CollectionCard;






