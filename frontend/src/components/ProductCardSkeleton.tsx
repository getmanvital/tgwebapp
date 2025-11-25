const ProductCardSkeleton = () => {
  return (
    <article className="bg-tg-secondary-bg rounded-2xl p-3 flex flex-col gap-2 shadow-md transition-colors">
      <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-tg-secondary-bg dark:bg-white/10">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/20" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-5 bg-tg-secondary-bg rounded w-[85%] dark:bg-white/10 relative overflow-hidden">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/20" />
        </div>
        <div className="h-4 bg-tg-secondary-bg rounded w-[60%] dark:bg-white/10 relative overflow-hidden">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/20" />
        </div>
        <div className="h-10 bg-tg-secondary-bg rounded-xl mt-3 dark:bg-white/10 relative overflow-hidden">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/20" />
        </div>
      </div>
    </article>
  );
};

export default ProductCardSkeleton;

