import clsx from 'clsx';
import HomeIcon from './icons/HomeIcon';
import ShoppingCartIcon from './icons/ShoppingCartIcon';
import PersonIcon from './icons/PersonIcon';
import { useCart } from '../contexts/CartContext';

type Props = {
  currentPage: 'home' | 'cart' | 'profile';
  onNavigate: (page: 'home' | 'cart' | 'profile') => void;
  // Находимся ли внутри конкретной подборки на главной
  isInCollection?: boolean;
  // Обработчик "Назад в каталог" при нахождении в подборке
  onBackToCatalog?: () => void;
};

const BottomNavigation = ({ currentPage, onNavigate, isInCollection = false, onBackToCatalog }: Props) => {
  const { getCartCount } = useCart();
  const cartCount = getCartCount();

  const getButtonClasses = (isActive: boolean) =>
    clsx(
      'flex-1 flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] px-2 py-1 rounded-lg transition-colors',
      isInCollection
        ? 'text-tg-hint' // в подборке все иконки неактивны визуально
        : isActive
          ? 'text-tg-button'
          : 'text-tg-hint hover:text-tg-text'
    );

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-tg-secondary-bg border-t border-black/10 z-[100] dark:bg-gray-900/95 dark:border-white/30 backdrop-blur-sm"
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
        {/* Каталог / Назад в каталог */}
        <button
          onClick={() => {
            if (isInCollection && onBackToCatalog) {
              onBackToCatalog();
            } else {
              onNavigate('home');
            }
          }}
          className={getButtonClasses(currentPage === 'home')}
          aria-label={isInCollection ? 'Назад в каталог' : 'Каталог'}
        >
          <div className="flex flex-col items-center gap-0.5">
            <div className="relative flex items-center justify-center">
              <HomeIcon
                style={{ fontSize: 28 }}
                className={
                  isInCollection
                    ? 'text-tg-hint'
                    : currentPage === 'home'
                      ? 'text-tg-button'
                      : 'text-tg-hint'
                }
              />
            </div>
            <span className="text-[11px] leading-none">
              {isInCollection ? 'Назад в каталог' : 'Каталог'}
            </span>
          </div>
        </button>

        {/* Корзина */}
        <button
          onClick={() => onNavigate('cart')}
          className={getButtonClasses(currentPage === 'cart')}
          aria-label="Корзина"
        >
          <div className="flex flex-col items-center gap-0.5">
            <div className="relative flex items-center justify-center">
              <ShoppingCartIcon
                style={{ fontSize: 28 }}
                className={
                  isInCollection
                    ? 'text-tg-hint'
                    : currentPage === 'cart'
                      ? 'text-tg-button'
                      : 'text-tg-hint'
                }
              />
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
            </div>
            <span className="text-[11px] leading-none">Корзина</span>
          </div>
        </button>

        {/* Профиль */}
        <button
          onClick={() => onNavigate('profile')}
          className={getButtonClasses(currentPage === 'profile')}
          aria-label="Профиль"
        >
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex items-center justify-center">
              <PersonIcon
                style={{ fontSize: 28 }}
                className={
                  isInCollection
                    ? 'text-tg-hint'
                    : currentPage === 'profile'
                      ? 'text-tg-button'
                      : 'text-tg-hint'
                }
              />
            </div>
            <span className="text-[11px] leading-none">Профиль</span>
          </div>
        </button>
      </div>
    </nav>
  );
};

export default BottomNavigation;

