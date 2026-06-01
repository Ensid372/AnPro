import { useState, useEffect } from 'react';
import api from '../api';

export default function Statistics() {
  const [stats, setStats] = useState(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await api.get('/inventory/statistics', {
      params: { date_from: dateFrom || undefined, date_to: dateTo || undefined }
    });
    setStats(data);
    setLoading(false);
  };

  const maxCount = stats?.medicine_stats?.[0]?.orders_count || 1;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Статистика использования медикаментов</h1>
      </div>

      <div className="card">
        <div className="form-row" style={{ alignItems: 'flex-end' }}>
          <div className="form-group">
            <label>Период с</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Период по</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={load} disabled={loading}>
            {loading ? 'Загрузка...' : 'Применить'}
          </button>
        </div>
      </div>

      {stats && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-num">{stats.total_orders}</div>
              <div className="stat-label">Всего выданных заказов</div>
            </div>
            <div className="stat-card">
              <div className="stat-num">{stats.medicine_stats?.length || 0}</div>
              <div className="stat-label">Уникальных лекарств</div>
            </div>
          </div>

          {stats.medicine_stats?.length > 0 ? (
            <div className="card">
              <h3 style={{ marginBottom: 16, color: '#1a56a0' }}>Рейтинг лекарств по количеству заказов</h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>#</th><th>Лекарство</th><th>Кол-во заказов</th><th>Доля</th></tr>
                  </thead>
                  <tbody>
                    {stats.medicine_stats.map((item, i) => (
                      <tr key={i}>
                        <td style={{ color: '#718096' }}>{i + 1}</td>
                        <td><strong>{item.medicine_name}</strong></td>
                        <td>{item.orders_count}</td>
                        <td style={{ width: 200 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{
                              height: 14,
                              width: `${(item.orders_count / maxCount) * 160}px`,
                              background: '#1a56a0',
                              borderRadius: 3
                            }} />
                            <span className="text-muted text-sm">
                              {stats.total_orders > 0 ? Math.round(item.orders_count / stats.total_orders * 100) : 0}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="empty-state">За выбранный период данных нет.</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
