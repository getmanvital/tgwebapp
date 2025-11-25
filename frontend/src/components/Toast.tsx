import { useEffect } from 'react';
import clsx from 'clsx';

type ToastType = 'success' | 'error' | 'info';

type ToastProps = {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  onClose: () => void;
};

const Toast = ({ id, message, type, duration = 3000, onClose }: ToastProps) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500 text-white';
      case 'error':
        return 'bg-red-500 text-white';
      case 'info':
        return 'bg-tg-button text-tg-button-text';
      default:
        return 'bg-tg-button text-tg-button-text';
    }
  };

  return (
    <div
      className={clsx(
        'px-4 py-3 rounded-lg shadow-lg min-w-[200px] max-w-[90vw]',
        'animate-[slideInDown_0.3s_ease-out]',
        getTypeStyles()
      )}
      role="alert"
      aria-live="polite"
    >
      <p className="m-0 text-sm font-medium">{message}</p>
    </div>
  );
};

export default Toast;

