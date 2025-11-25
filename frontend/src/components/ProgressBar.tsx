type ProgressBarProps = {
  isLoading: boolean;
  className?: string;
};

const ProgressBar = ({ isLoading, className = '' }: ProgressBarProps) => {
  if (!isLoading) {
    return null;
  }

  return (
    <div
      className={`w-full h-1 bg-tg-hint/20 overflow-hidden ${className}`}
      role="progressbar"
      aria-label="Загрузка"
      aria-busy="true"
    >
      <div
        className="h-full bg-tg-button animate-[shimmer_1.5s_infinite]"
        style={{
          width: '30%',
          animation: 'shimmer 1.5s infinite',
        }}
      />
    </div>
  );
};

export default ProgressBar;

