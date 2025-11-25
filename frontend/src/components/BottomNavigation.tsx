import clsx from 'clsx';
import HomeIcon from '@mui/icons-material/Home';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PersonIcon from '@mui/icons-material/Person';
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
      className="fixed bottom-0 left-0 right-0 bg-tg-secondary-bg border-t border-black/10 z-[100] dark:bg-white/20 dark:border-white/20"
      style={{
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
        paddingTop: '8px',
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
            'flex items-center justify-center min-w-[44px] min-h-[44px] p-2 rounded-lg transition-colors',
            currentPage === 'home'
              ? 'text-tg-button'
              : 'text-tg-hint hover:text-tg-text'
          )}
          aria-label="Главная"
        >
          <HomeIcon style={{ fontSize: 28 }} />
        </button>

        <button
          onClick={() => onNavigate('cart')}
          className={clsx(
            'relative flex items-center justify-center min-w-[44px] min-h-[44px] p-2 rounded-lg transition-colors',
            currentPage === 'cart'
              ? 'text-tg-button'
              : 'text-tg-hint hover:text-tg-text'
          )}
          aria-label="Корзина"
        >
          <ShoppingCartIcon style={{ fontSize: 28 }} />
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
        </button>

        <button
          onClick={() => onNavigate('profile')}
          className={clsx(
            'flex items-center justify-center min-w-[44px] min-h-[44px] p-2 rounded-lg transition-colors',
            currentPage === 'profile'
              ? 'text-tg-button'
              : 'text-tg-hint hover:text-tg-text'
          )}
          aria-label="Профиль"
        >
          <PersonIcon style={{ fontSize: 28 }} />
        </button>
      </div>
    </nav>
  );
};

export default BottomNavigation;

