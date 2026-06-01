const ROLE_LABELS = {
  provizor: 'Провизор',
  provizor_technolog: 'Провизор-технолог',
  rukovoditel: 'Руководитель',
  admin: 'Администратор'
};

const PAGES = [
  { id: 'prescriptions', label: 'Приём рецептов', roles: ['provizor', 'provizor_technolog'] },
  { id: 'production',    label: 'Заказы в производстве', roles: ['provizor', 'provizor_technolog'] },
  { id: 'tech_cards',    label: 'Технологии', roles: ['provizor_technolog'] },
  { id: 'warehouse',     label: 'Склад', roles: ['provizor', 'provizor_technolog', 'rukovoditel', 'admin'] },
  { id: 'inventory',     label: 'Инвентаризация', roles: ['rukovoditel'] },
  { id: 'statistics',    label: 'Статистика', roles: ['rukovoditel'] },
  { id: 'users',         label: 'Пользователи', roles: ['admin'] }
];

export default function Navigation({ user, currentPage, onNavigate, onLogout }) {
  const visible = PAGES.filter(p => p.roles.includes(user.role));

  return (
    <header className="header">
      <div className="header-logo">
        ИС <span>АнПро</span>
      </div>
      <nav className="nav-links">
        {visible.map(p => (
          <button
            key={p.id}
            className={`nav-btn${currentPage === p.id ? ' active' : ''}`}
            onClick={() => onNavigate(p.id)}
          >
            {p.label}
          </button>
        ))}
      </nav>
      <div className="header-user">
        <span>{user.full_name}</span>
        <span className="role-badge">{ROLE_LABELS[user.role] || user.role}</span>
        <button className="logout-btn" onClick={onLogout}>Выйти</button>
      </div>
    </header>
  );
}
