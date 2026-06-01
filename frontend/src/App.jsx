import { useState, useEffect } from 'react';
import Login from './components/Login';
import Navigation from './components/Navigation';
import Prescriptions from './components/Prescriptions';
import ProductionOrders from './components/ProductionOrders';
import TechCards from './components/TechCards';
import Warehouse from './components/Warehouse';
import Inventory from './components/Inventory';
import Statistics from './components/Statistics';
import Users from './components/Users';
import './App.css';

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  const [page, setPage] = useState('prescriptions');

  useEffect(() => {
    if (user) {
      // Установить страницу по умолчанию для роли
      const defaults = {
        provizor: 'prescriptions',
        provizor_technolog: 'production',
        rukovoditel: 'inventory',
        admin: 'users'
      };
      setPage(defaults[user.role] || 'prescriptions');
    }
  }, [user?.role]);

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (!user) return <Login onLogin={handleLogin} />;

  const pageMap = {
    prescriptions: <Prescriptions user={user} />,
    production: <ProductionOrders user={user} />,
    tech_cards: <TechCards user={user} />,
    warehouse: <Warehouse user={user} />,
    inventory: <Inventory user={user} />,
    statistics: <Statistics user={user} />,
    users: <Users user={user} />
  };

  return (
    <div className="app">
      <Navigation user={user} currentPage={page} onNavigate={setPage} onLogout={handleLogout} />
      <main className="main-content">
        {pageMap[page] || <div className="empty-page">Страница не найдена</div>}
      </main>
      <footer className="footer">
        ИС «Аптека АнПро» · v1.0 · Техподдержка: support@anpro.ru
      </footer>
    </div>
  );
}
