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
    <div className="user-auth-status">
      <div className="user-auth-status__content">
        <div className="user-auth-status__avatar">
          {user.photo_url ? (
            <img 
              src={user.photo_url} 
              alt={getFullName()} 
              className="user-auth-status__avatar-img"
            />
          ) : (
            <div className="user-auth-status__avatar-initials">
              {getInitials()}
            </div>
          )}
        </div>
        <div className="user-auth-status__info">
          <div className="user-auth-status__name">{getFullName()}</div>
          <div className="user-auth-status__status">Авторизован</div>
        </div>
      </div>
    </div>
  );
};

export default UserAuthStatus;

