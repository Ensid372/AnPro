import { useState, useEffect } from 'react';
import api from '../api';

export default function Inventory() {
  const [records, setRecords] = useState([]);
  const [current, setCurrent] = useState(null);
  const [report, setReport] = useState(null);
  const [tab, setTab] = useState('report');
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadRecords(); loadReport(); }, []);

  const loadRecords = () =>
    api.get('/inventory/').then(r => setRecords(r.data));

  const loadReport = () =>
    api.get('/inventory/report').then(r => setReport(r.data));

  const startInventory = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/inventory/start');
      setCurrent(data);
      setTab('current');
      loadRecords();
    } catch (err) { alert(err.response?.data?.error || 'Ошибка'); }
    setLoading(false);
  };

  const loadInventory = async id => {
    const { data } = await api.get(`/inventory/${id}`);
    setCurrent(data);
    setTab('current');
  };

  const updateItem = async (item, val) => {
    const { data } = await api.put(`/inventory/${current.id}/item/${item.id}`, { actual_quantity: val });
    setCurrent(cur => ({
      ...cur,
      items: cur.items.map(i => i.id === data.id ? data : i)
    }));
  };

  const complete = async () => {
    if (!window.confirm('Завершить инвентаризацию и применить изменения к складу?')) return;
    await api.post(`/inventory/${current.id}/complete`, { apply_changes: true });
    setCurrent(null); setTab('report');
    loadRecords(); loadReport();
  };

  const exportExcel = () => {
    window.open('/api/inventory/export/excel', '_blank');
  };

  const fmt = d => d ? new Date(d).toLocaleDateString('ru') : '—';
  const fmtDt = d => d ? new Date(d).toLocaleString('ru') : '—';

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Инвентаризация и контроль склада</h1>
        <div className="actions">
          <button className="btn btn-secondary" onClick={exportExcel}>📥 Excel</button>
          <button className="btn btn-primary" onClick={startInventory} disabled={loading}>
            {loading ? 'Запуск...' : '+ Начать инвентаризацию'}
          </button>
        </div>
      </div>

      <div className="filters">
        {[['report', 'Текущий отчёт'], ['current', 'Активная инвентаризация'], ['history', 'История']].map(([v, l]) => (
          <button key={v} className={`btn btn-sm ${tab === v ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab(v)}>{l}</button>
        ))}
      </div>

      {tab === 'report' && report && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-num" style={{ color: '#e53e3e' }}>{report.total_below_critical}</div>
              <div className="stat-label">Ниже критической нормы</div>
            </div>
            <div className="stat-card">
              <div className="stat-num" style={{ color: '#d97706' }}>{report.total_expired}</div>
              <div className="stat-label">Просроченных</div>
            </div>
          </div>

          {report.below_critical.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: 12, color: '#c53030' }}>⚠️ Остатки ниже критической нормы</h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Наименование</th><th>Тип</th><th>Остаток</th><th>Ед.изм.</th><th>Критич. норма</th></tr>
                  </thead>
                  <tbody>
                    {report.below_critical.map((item, i) => (
                      <tr key={i}>
                        <td><strong>{item.name}</strong></td>
                        <td>{item.type === 'component' ? 'Компонент' : 'Готовое ЛС'}</td>
                        <td style={{ color: '#c53030', fontWeight: 600 }}>{item.quantity}</td>
                        <td>{item.unit}</td>
                        <td>{item.critical_norm}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {report.expired.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: 12, color: '#c53030' }}>🚫 Просроченные лекарства/компоненты</h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Наименование</th><th>Тип</th><th>Количество</th><th>Ед.изм.</th><th>Срок годности</th></tr>
                  </thead>
                  <tbody>
                    {report.expired.map((item, i) => (
                      <tr key={i}>
                        <td><strong>{item.name}</strong></td>
                        <td>{item.type === 'component' ? 'Компонент' : 'Готовое ЛС'}</td>
                        <td>{item.quantity}</td>
                        <td>{item.unit}</td>
                        <td style={{ color: '#c53030', fontWeight: 600 }}>{fmt(item.expiry_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {report.total_below_critical === 0 && report.total_expired === 0 && (
            <div className="card">
              <div className="empty-state" style={{ color: '#38a169' }}>
                ✅ Все позиции в норме. Просроченных и критических позиций нет.
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'current' && (
        current ? (
          <div>
            <div className="card" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>Инвентаризация #{current.id}</strong>
                  <span className="text-muted text-sm" style={{ marginLeft: 12 }}>Начата: {fmtDt(current.created_at)}</span>
                </div>
                {current.status === 'draft' &&
                  <button className="btn btn-success" onClick={complete}>✅ Завершить и применить</button>}
              </div>
            </div>
            <div className="card">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Наименование</th>
                      <th>Тип</th>
                      <th>По данным системы</th>
                      <th>Фактически</th>
                      <th>Расхождение</th>
                      <th>Норма</th>
                      <th>Срок годности</th>
                      <th>Замечания</th>
                    </tr>
                  </thead>
                  <tbody>
                    {current.items?.map(item => (
                      <tr key={item.id} style={item.is_expired || item.is_below_critical ? { background: '#fffbeb' } : {}}>
                        <td><strong>{item.item_name}</strong></td>
                        <td>{item.item_type === 'component' ? 'Компонент' : 'Готовое ЛС'}</td>
                        <td>{item.expected_quantity}</td>
                        <td>
                          {current.status === 'draft'
                            ? <input type="number" step="0.01" min="0" style={{ width: 80 }}
                                defaultValue={item.actual_quantity}
                                onBlur={e => updateItem(item, parseFloat(e.target.value))} />
                            : item.actual_quantity}
                        </td>
                        <td style={{ color: item.discrepancy !== 0 ? '#c53030' : '#276749', fontWeight: 600 }}>
                          {item.discrepancy > 0 ? `+${item.discrepancy}` : item.discrepancy}
                        </td>
                        <td>{item.critical_norm}</td>
                        <td style={item.is_expired ? { color: '#c53030', fontWeight: 600 } : {}}>
                          {fmt(item.expiry_date)}{item.is_expired && ' ⚠️'}
                        </td>
                        <td>
                          {item.is_below_critical && <span className="badge badge-danger">Ниже нормы</span>}
                          {item.is_expired && <span className="badge badge-danger" style={{ marginLeft: 4 }}>Просрочен</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="empty-state">Нет активной инвентаризации. Нажмите «Начать инвентаризацию».</div>
          </div>
        )
      )}

      {tab === 'history' && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>#</th><th>Дата начала</th><th>Дата завершения</th><th>Провёл</th><th>Статус</th><th>Действия</th></tr>
              </thead>
              <tbody>
                {records.length === 0
                  ? <tr><td colSpan={6} className="empty-state">Инвентаризаций нет</td></tr>
                  : records.map(r => (
                    <tr key={r.id}>
                      <td>#{r.id}</td>
                      <td>{fmtDt(r.created_at)}</td>
                      <td>{r.completed_at ? fmtDt(r.completed_at) : '—'}</td>
                      <td>{r.conductor || '—'}</td>
                      <td>
                        <span className={`badge ${r.status === 'completed' ? 'badge-completed' : 'badge-warning'}`}>
                          {r.status === 'completed' ? 'Завершена' : 'Черновик'}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-xs btn-secondary" onClick={() => loadInventory(r.id)}>Просмотр</button>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
