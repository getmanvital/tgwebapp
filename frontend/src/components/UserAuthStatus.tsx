import type { TelegramUser } from '../hooks/useTelegramUser';

type Props = {
  user: TelegramUser | null;
};

const UserAuthStatus = ({ user }: Props) => {
  if (!user) {
    return null;
  }

  // Получаем инициалы для аватара, если нет фото
  const getInitials = (): string => {
    const first = user.first_name?.[0]?.toUpperCase() || '';
    const last = user.last_name?.[0]?.toUpperCase() || '';
    return `${first}${last}` || 'U';
  };

  // Формируем полное имя
  const getFullName = (): string => {
    if (user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    return user.first_name;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-tg-secondary-bg border-t border-black/10 pb-[max(12px,env(safe-area-inset-bottom))] px-4 py-3 z-[100] shadow-[0_-2px_8px_rgba(0,0,0,0.05)] dark:bg-white/10 dark:border-white/10 dark:shadow-[0_-2px_8px_rgba(0,0,0,0.3)]">
      <div className="flex items-center gap-3 max-w-full">
        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-tg-button flex items-center justify-center">
          {user.photo_url ? (
            <img 
              src={user.photo_url} 
              alt={getFullName()} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-tg-button-text text-base font-semibold leading-none">
              {getInitials()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <div className="text-sm font-semibold text-tg-text whitespace-nowrap overflow-hidden text-ellipsis">
            {getFullName()}
          </div>
          <div className="text-xs text-tg-hint whitespace-nowrap overflow-hidden text-ellipsis">
            Авторизован
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserAuthStatus;

