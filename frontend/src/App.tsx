import { useEffect, useState } from 'react';
import HomePage from './pages/HomePage';
import { useTelegram } from './hooks/useTelegram';

function App() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useTelegram();

  useEffect(() => {
    const isInTelegram = window.Telegram?.WebApp !== undefined;
    const delay = isInTelegram ? 300 : 100;
    
    const timer = setTimeout(() => {
      if (document.getElementById('root')) {
        setIsReady(true);
      } else {
        setError('Root element not found');
      }
    }, delay);

    return () => clearTimeout(timer);
  }, []);

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        padding: '20px',
        color: '#1b1b1f',
        textAlign: 'center'
      }}>
        <p style={{ color: '#d7263d', marginBottom: '10px' }}>Ошибка загрузки</p>
        <p style={{ fontSize: '14px', color: '#878a99' }}>{error}</p>
      </div>
    );
  }

  // Убираем экран загрузки - сразу показываем контент
  // Это поможет избежать проблем с застреванием на "Загрузка..."
  if (!isReady) {
    // Показываем минимальный экран загрузки только на очень короткое время
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100dvh',
        color: 'var(--tg-theme-text-color, #1b1b1f)',
        backgroundColor: 'var(--tg-theme-bg-color, #f5f5f5)'
      }}>
        <p>Загрузка...</p>
      </div>
    );
  }

  return <HomePage />;
}

export default App;











