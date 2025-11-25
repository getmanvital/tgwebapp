import { useCart } from '../contexts/CartContext';
import { useToast } from '../contexts/ToastContext';
import ProductCard from '../components/ProductCard';
import { getBackendUrl } from '../utils/backendUrl';

const CartPage = () => {
  const { items, updateQuantity, removeFromCart, clearCart, getTotalPrice } = useCart();
  const { showToast } = useToast();

  const getThumbPhoto = (product: any): string => {
    if (product.thumb_photo) {
      if (product.thumb_photo.startsWith('/photos/')) {
        const backendUrl = getBackendUrl();
        return `${backendUrl}${product.thumb_photo}`;
      }
      return product.thumb_photo;
    }

    if (product.thumb && Array.isArray(product.thumb) && product.thumb.length > 0) {
      const largestThumb = product.thumb.reduce((prev: any, curr: any) => {
        const prevSize = (prev.width || 0) * (prev.height || 0);
        const currSize = (curr.width || 0) * (curr.height || 0);
        return currSize > prevSize ? curr : prev;
      });
      
      if (largestThumb.url) {
        return largestThumb.url;
      }
    }

    return 'https://via.placeholder.com/240x240?text=No+Image';
  };

  const handleQuantityChange = (productId: number, newQuantity: number) => {
    if (newQuantity < 1) {
      removeFromCart(productId);
      showToast('Товар удален из корзины', 'info');
    } else {
      updateQuantity(productId, newQuantity);
    }
  };

  const handleRemove = (productId: number) => {
    removeFromCart(productId);
    showToast('Товар удален из корзины', 'info');
  };

  const handleClearCart = () => {
    if (items.length === 0) return;
    
    if (window.confirm('Очистить корзину?')) {
      clearCart();
      showToast('Корзина очищена', 'info');
    }
  };

  const handleCheckout = () => {
    // Заглушка для оформления заказа
    showToast('Функция оформления заказа в разработке', 'info');
  };

  if (items.length === 0) {
    return (
      <main className="flex flex-col gap-4 w-full max-w-full box-border pb-[calc(88px+max(16px,env(safe-area-inset-bottom)))]">
        <header className="flex flex-col gap-3">
          <h1>Корзина</h1>
        </header>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <span className="text-6xl mb-4">🛒</span>
          <p className="text-lg text-tg-text mb-2">Корзина пуста</p>
          <p className="text-sm text-tg-hint">Добавьте товары из каталога</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-4 w-full max-w-full box-border pb-[calc(88px+max(16px,env(safe-area-inset-bottom)))]">
      <header className="flex flex-col gap-3">
        <div className="flex justify-between items-center w-full">
          <h1>Корзина</h1>
          <button
            onClick={handleClearCart}
            className="px-3 py-1.5 text-sm text-tg-destructive-text hover:opacity-70 transition-opacity"
            aria-label="Очистить корзину"
          >
            Очистить
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <div
            key={item.product.id}
            className="bg-tg-secondary-bg rounded-2xl p-3 flex gap-3 shadow-md dark:bg-white/10"
          >
            <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
              <img
                src={getThumbPhoto(item.product)}
                alt={item.product.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            
            <div className="flex-1 flex flex-col gap-2 min-w-0">
              <h3 className="m-0 text-sm font-semibold text-tg-text line-clamp-2">
                {item.product.title}
              </h3>
              <p className="m-0 text-sm font-semibold text-tg-text">
                {item.product.price?.text}
              </p>
              
              <div className="flex items-center gap-3 mt-auto">
                <div className="flex items-center gap-2 border border-tg-hint rounded-lg">
                  <button
                    onClick={() => handleQuantityChange(item.product.id, item.quantity - 1)}
                    className="w-11 h-11 flex items-center justify-center text-tg-text hover:bg-tg-hint/10 transition-colors"
                    aria-label="Уменьшить количество"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm font-medium text-tg-text">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => handleQuantityChange(item.product.id, item.quantity + 1)}
                    className="w-11 h-11 flex items-center justify-center text-tg-text hover:bg-tg-hint/10 transition-colors"
                    aria-label="Увеличить количество"
                  >
                    +
                  </button>
                </div>
                
                <button
                  onClick={() => handleRemove(item.product.id)}
                  className="ml-auto px-3 py-1.5 text-sm text-tg-destructive-text hover:opacity-70 transition-opacity"
                  aria-label="Удалить товар"
                >
                  Удалить
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="sticky bottom-[calc(88px+max(16px,env(safe-area-inset-bottom)))] bg-tg-secondary-bg border-t border-black/10 p-4 -mx-4 dark:bg-white/10 dark:border-white/10">
        <div className="flex justify-between items-center mb-3">
          <span className="text-lg font-semibold text-tg-text">Итого:</span>
          <span className="text-lg font-bold text-tg-text">{getTotalPrice()}</span>
        </div>
        <button
          onClick={handleCheckout}
          className="w-full py-3 px-4 bg-tg-button text-tg-button-text rounded-xl font-semibold transition-opacity hover:opacity-90"
        >
          Оформить заказ
        </button>
      </div>
    </main>
  );
};

export default CartPage;

