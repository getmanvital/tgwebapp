import UserAuthStatus from '../components/UserAuthStatus';
import { useTelegramUser } from '../hooks/useTelegramUser';
import { useIsAdmin } from '../hooks/useIsAdmin';

type Props = {
  onNavigateToUsers?: () => void;
  onNavigateToChats?: () => void;
};

const ProfilePage = ({ onNavigateToUsers, onNavigateToChats }: Props) => {
  const user = useTelegramUser();
  const isAdmin = useIsAdmin();

  return (
    <main className="flex flex-col gap-4 w-full max-w-full box-border pb-[calc(88px+max(16px,env(safe-area-inset-bottom)))]">
      <header className="flex flex-col gap-3">
        <h1>Профиль</h1>
      </header>

      <div className="flex flex-col gap-4">
        {user && (
          <div className="bg-tg-secondary-bg rounded-2xl p-4 shadow-md dark:bg-white/10">
            <UserAuthStatus user={user} />
          </div>
        )}

        {isAdmin && (onNavigateToUsers || onNavigateToChats) && (
          <div className="bg-tg-secondary-bg rounded-2xl p-4 shadow-md dark:bg-white/10">
            <h2 className="text-lg font-semibold text-tg-text mb-3">Администрирование</h2>
            <div className="flex flex-col gap-2">
              {onNavigateToUsers && (
                <button
                  onClick={onNavigateToUsers}
                  className="w-full px-4 py-3 bg-tg-button text-tg-button-text border-none rounded-xl font-semibold transition-opacity hover:opacity-90 flex items-center justify-center gap-2 min-h-[44px]"
                  aria-label="Пользователи"
                >
                  <span className="text-xl">👥</span>
                  <span>Пользователи</span>
                </button>
              )}
              {onNavigateToChats && (
                <button
                  onClick={onNavigateToChats}
                  className="w-full px-4 py-3 bg-tg-button text-tg-button-text border-none rounded-xl font-semibold transition-opacity hover:opacity-90 flex items-center justify-center gap-2 min-h-[44px]"
                  aria-label="Чаты"
                >
                  <span className="text-xl">💬</span>
                  <span>Чаты</span>
                </button>
              )}
            </div>
          </div>
        )}

        {!isAdmin && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-tg-hint">Профиль пользователя</p>
          </div>
        )}
      </div>
    </main>
  );
};

export default ProfilePage;

