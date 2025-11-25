const CollectionCardSkeleton = () => {
  return (
    <article className="bg-tg-secondary-bg rounded-2xl overflow-hidden cursor-pointer transition-all shadow-sm border-2 border-transparent">
      <div className="relative w-full aspect-video overflow-hidden bg-tg-secondary-bg dark:bg-white/10">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/20" />
      </div>
      <div className="p-3">
        <div className="h-5 bg-tg-secondary-bg rounded dark:bg-white/10 relative overflow-hidden">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/20" />
        </div>
      </div>
    </article>
  );
};

export default CollectionCardSkeleton;

