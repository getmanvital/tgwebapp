import clsx from 'clsx';
import { useCart } from '../contexts/CartContext';

type Props = {
  currentPage: 'home' | 'cart' | 'profile';
  onNavigate: (page: 'home' | 'cart' | 'profile') => void;
};

const BottomNavigation = ({ currentPage, onNavigate }: Props) => {
  const { getCartCount } = useCart();
  const cartCount = getCartCount();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-tg-secondary-bg border-t border-black/10 z-[100] dark:bg-white/10 dark:border-white/10"
      style={{
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        paddingTop: '12px',
        paddingLeft: 'max(16px, env(safe-area-inset-left))',
        paddingRight: 'max(16px, env(safe-area-inset-right))',
      }}
      role="navigation"
      aria-label="Основная навигация"
    >
      <div className="flex justify-around items-center max-w-md mx-auto">
        <button
          onClick={() => onNavigate('home')}
          className={clsx(
            'flex flex-col items-center justify-center gap-1 min-w-[44px] min-h-[44px] p-2 rounded-lg transition-colors',
            currentPage === 'home'
              ? 'text-tg-button font-semibold'
              : 'text-tg-hint hover:text-tg-text font-medium'
          )}
          aria-label="Главная"
        >
          <span className="text-2xl">🏠</span>
          <span className="text-xs font-medium">Домой</span>
        </button>

        <button
          onClick={() => onNavigate('cart')}
          className={clsx(
            'relative flex flex-col items-center justify-center gap-1 min-w-[44px] min-h-[44px] p-2 rounded-lg transition-colors',
            currentPage === 'cart'
              ? 'text-tg-button font-semibold'
              : 'text-tg-hint hover:text-tg-text font-medium'
          )}
          aria-label="Корзина"
        >
          <span className="text-2xl">🛒</span>
          {cartCount > 0 && (
            <span
              className={clsx(
                'absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full',
                'bg-red-500 text-white text-xs font-bold flex items-center justify-center',
                'animate-[fade-in_0.2s_ease-out]'
              )}
              aria-label={`${cartCount} товаров в корзине`}
            >
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          )}
          <span className="text-xs font-medium">Корзина</span>
        </button>

        <button
          onClick={() => onNavigate('profile')}
          className={clsx(
            'flex flex-col items-center justify-center gap-1 min-w-[44px] min-h-[44px] p-2 rounded-lg transition-colors',
            currentPage === 'profile'
              ? 'text-tg-button font-semibold'
              : 'text-tg-hint hover:text-tg-text font-medium'
          )}
          aria-label="Профиль"
        >
          <span className="text-2xl">👤</span>
          <span className="text-xs font-medium">Профиль</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNavigation;

