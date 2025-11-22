const ProductCardSkeleton = () => {
  return (
    <article className="product-card skeleton">
      <div className="product-card__image-wrapper skeleton__image">
        <div className="skeleton__shimmer" />
      </div>
      <div className="product-card__body">
        <div className="skeleton__title">
          <div className="skeleton__shimmer" />
        </div>
        <div className="skeleton__text">
          <div className="skeleton__shimmer" />
        </div>
        <div className="skeleton__button">
          <div className="skeleton__shimmer" />
        </div>
      </div>
    </article>
  );
};

export default ProductCardSkeleton;

