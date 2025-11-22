const CollectionCardSkeleton = () => {
  return (
    <article className="collection-card skeleton">
      <div className="collection-card__image skeleton__image">
        <div className="skeleton__shimmer" />
      </div>
      <div className="skeleton__title">
        <div className="skeleton__shimmer" />
      </div>
    </article>
  );
};

export default CollectionCardSkeleton;

