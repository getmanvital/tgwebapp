import type { User } from '../types';

type Props = {
  users: User[];
  loading?: boolean;
};

const UsersList = ({ users, loading }: Props) => {
  if (loading) {
    return (
      <div className="p-5 text-center">
        <p>Загрузка пользователей...</p>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="p-5 text-center">
        <p>Пользователи не найдены</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      {users.map((user) => (
        <div 
          key={user.id} 
          className="bg-tg-secondary-bg rounded-2xl p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:bg-white/10 dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] dark:hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
        >
          <div className="flex items-center gap-3 mb-3">
            {user.photo_url ? (
              <img 
                src={user.photo_url} 
                alt={`${user.first_name} ${user.last_name || ''}`.trim()}
                className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-tg-button text-tg-button-text flex items-center justify-center text-lg font-semibold flex-shrink-0">
                {(user.first_name[0] + (user.last_name?.[0] || '')).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="m-0 text-base font-semibold text-tg-text whitespace-nowrap overflow-hidden text-ellipsis">
                {user.first_name} {user.last_name || ''}
              </h3>
              {user.username && (
                <p className="mt-1 mb-0 text-sm text-tg-hint whitespace-nowrap overflow-hidden text-ellipsis">
                  @{user.username}
                </p>
              )}
            </div>
            {user.is_premium && (
              <span className="text-xs font-semibold text-tg-button px-2 py-1 bg-[rgba(15,98,254,0.1)] rounded-lg whitespace-nowrap dark:bg-[rgba(15,98,254,0.2)]">
                ⭐ Premium
              </span>
            )}
          </div>
          
          <div className="flex flex-col gap-2 pt-3 border-t border-black/10 dark:border-white/10">
            <div className="flex justify-between items-center text-sm">
              <span className="text-tg-hint font-medium">ID:</span>
              <span className="text-tg-text text-right break-words max-w-[60%]">{user.id}</span>
            </div>
            {user.language_code && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-tg-hint font-medium">Язык:</span>
                <span className="text-tg-text text-right break-words max-w-[60%]">{user.language_code}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-sm">
              <span className="text-tg-hint font-medium">Визитов:</span>
              <span className="text-tg-text text-right break-words max-w-[60%]">{user.visit_count}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-tg-hint font-medium">Первый визит:</span>
              <span className="text-tg-text text-right break-words max-w-[60%]">{user.first_seen_readable}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-tg-hint font-medium">Последний визит:</span>
              <span className="text-tg-text text-right break-words max-w-[60%]">{user.last_seen_readable}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default UsersList;

