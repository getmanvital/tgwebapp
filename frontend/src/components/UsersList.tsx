import type { User } from '../types';

type Props = {
  users: User[];
  loading?: boolean;
};

const UsersList = ({ users, loading }: Props) => {
  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Загрузка пользователей...</p>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Пользователи не найдены</p>
      </div>
    );
  }

  return (
    <div className="users-list">
      {users.map((user) => (
        <div key={user.id} className="user-card">
          <div className="user-card__header">
            {user.photo_url ? (
              <img 
                src={user.photo_url} 
                alt={`${user.first_name} ${user.last_name || ''}`.trim()}
                className="user-card__avatar"
              />
            ) : (
              <div className="user-card__avatar user-card__avatar--placeholder">
                {(user.first_name[0] + (user.last_name?.[0] || '')).toUpperCase()}
              </div>
            )}
            <div className="user-card__info">
              <h3 className="user-card__name">
                {user.first_name} {user.last_name || ''}
              </h3>
              {user.username && (
                <p className="user-card__username">@{user.username}</p>
              )}
            </div>
            {user.is_premium && (
              <span className="user-card__premium">⭐ Premium</span>
            )}
          </div>
          
          <div className="user-card__details">
            <div className="user-card__detail">
              <span className="user-card__label">ID:</span>
              <span className="user-card__value">{user.id}</span>
            </div>
            {user.language_code && (
              <div className="user-card__detail">
                <span className="user-card__label">Язык:</span>
                <span className="user-card__value">{user.language_code}</span>
              </div>
            )}
            <div className="user-card__detail">
              <span className="user-card__label">Визитов:</span>
              <span className="user-card__value">{user.visit_count}</span>
            </div>
            <div className="user-card__detail">
              <span className="user-card__label">Первый визит:</span>
              <span className="user-card__value">{user.first_seen_readable}</span>
            </div>
            <div className="user-card__detail">
              <span className="user-card__label">Последний визит:</span>
              <span className="user-card__value">{user.last_seen_readable}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default UsersList;

