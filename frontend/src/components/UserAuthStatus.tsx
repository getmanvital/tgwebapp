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
    <div className="flex items-center gap-3 w-full">
      <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-tg-button flex items-center justify-center">
        {user.photo_url ? (
          <img 
            src={user.photo_url} 
            alt={getFullName()} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-tg-button-text text-lg font-semibold leading-none">
            {getInitials()}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="text-base font-semibold text-tg-text dark:text-white">
          {getFullName()}
        </div>
        <div className="text-sm text-tg-hint">
          Авторизован
        </div>
      </div>
    </div>
  );
};

export default UserAuthStatus;

