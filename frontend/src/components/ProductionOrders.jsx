import { useState, useEffect } from 'react';
import api from '../api';

const STATUS_MAP = {
  in_production: { label: 'Готовится', cls: 'badge-in-production' },
  waiting_components: { label: 'Ожидание компонентов', cls: 'badge-waiting' },
  completed: { label: 'Выдан', cls: 'badge-completed' },
  unserved: { label: 'Необслужен', cls: 'badge-unserved' }
};

export default function ProductionOrders() {
  const [orders, setOrders] = useState([]);
  const [unserved, setUnserved] = useState([]);
  const [tab, setTab] = useState('active');

  useEffect(() => { load(); }, [tab]);

  const load = () => {
    if (tab === 'unserved') {
      api.get('/orders/unserved').then(r => setUnserved(r.data));
    } else {
      api.get('/orders/', { params: { status: tab === 'active' ? 'active' : tab } })
        .then(r => setOrders(r.data));
    }
  };

  const complete = async id => {
    if (!window.confirm('Подтвердить выдачу лекарства?')) return;
    await api.post(`/orders/${id}/complete`);
    load();
  };

  const markReady = async id => {
    try {
      await api.post(`/orders/${id}/mark-components-ready`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Компоненты ещё не поступили');
    }
  };

  const notify = async id => {
    await api.post(`/orders/unserved/${id}/notify`);
    load();
  };

  const fmt = dt => dt ? new Date(dt).toLocaleString('ru') : '—';

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Заказы в производстве</h1>
        <button className="btn btn-secondary" onClick={load}>↻ Обновить</button>
      </div>

      <div className="filters">
        {[['active', 'Активные'], ['completed', 'Выданные'], ['unserved', 'Необслуженные покупатели']].map(([v, l]) => (
          <button key={v} className={`btn btn-sm ${tab === v ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab(v)}>{l}</button>
        ))}
      </div>

      {tab === 'unserved' ? (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ФИО покупателя</th>
                  <th>Телефон</th>
                  <th>Адрес</th>
                  <th>Лекарство</th>
                  <th>Дата обращения</th>
                  <th>Уведомлён</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {unserved.length === 0
                  ? <tr><td colSpan={7} className="empty-state">Необслуженных покупателей нет</td></tr>
                  : unserved.map(u => (
                      <tr key={u.id}>
                        <td>{u.customer_name}</td>
                        <td>{u.customer_phone}</td>
                        <td>{u.customer_address}</td>
                        <td>{u.medicine_name}</td>
                        <td className="text-muted text-sm">{fmt(u.created_at)}</td>
                        <td>
                          {u.notified
                            ? <span className="badge badge-completed">Да, {fmt(u.notified_at)}</span>
                            : <span className="badge badge-warning">Нет</span>}
                        </td>
                        <td>
                          {!u.notified &&
                            <button className="btn btn-sm btn-primary" onClick={() => notify(u.id)}>
                              📧 Уведомить
                            </button>}
                        </td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>№ заказа</th>
                  <th>Покупатель</th>
                  <th>Телефон</th>
                  <th>Лекарство</th>
                  <th>Технология</th>
                  <th>Статус</th>
                  <th>Готов к</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0
                  ? <tr><td colSpan={8} className="empty-state">Заказов нет</td></tr>
                  : orders.map(o => {
                    const s = STATUS_MAP[o.status] || { label: o.status, cls: '' };
                    return (
                      <tr key={o.id}>
                        <td><strong>{o.order_number}</strong></td>
                        <td>{o.customer_name}</td>
                        <td>{o.customer_phone}</td>
                        <td>{o.medicine_name}</td>
                        <td className="text-muted text-sm">
                          {o.tech_card ? <span className="tag">{o.tech_card.tech_id}</span> : '—'}
                        </td>
                        <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                        <td className="text-muted text-sm">{fmt(o.estimated_ready_at)}</td>
                        <td className="actions">
                          {o.status === 'in_production' &&
                            <button className="btn btn-sm btn-success" onClick={() => complete(o.id)}>Выдать</button>}
                          {o.status === 'waiting_components' &&
                            <button className="btn btn-sm btn-warning" onClick={() => markReady(o.id)}>
                              Компоненты поступили
                            </button>}
                        </td>
                      </tr>
                    );
                  })
                }
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
