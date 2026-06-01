import { useState, useEffect } from 'react';
import api from '../api';

const EMPTY_COMP = { name: '', unit: 'г', quantity: '', critical_norm: '', expiry_date: '' };
const EMPTY_MED = { name: '', medicine_type: 'tablet', quantity: '', unit: 'уп', critical_norm: '', expiry_date: '', manufacturer: '' };

export default function Warehouse() {
  const [tab, setTab] = useState('components');
  const [components, setComponents] = useState([]);
  const [readyMeds, setReadyMeds] = useState([]);
  const [wholesaleReqs, setWholesaleReqs] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  useEffect(() => { loadAll(); }, [tab]);

  const loadAll = (q = '') => {
    if (tab === 'components') api.get('/warehouse/components', { params: { q: q || undefined } }).then(r => setComponents(r.data));
    else if (tab === 'ready') api.get('/warehouse/ready-medicines', { params: { q: q || undefined } }).then(r => setReadyMeds(r.data));
    else api.get('/warehouse/wholesale-requests').then(r => setWholesaleReqs(r.data));
  };

  const openCreate = () => {
    setEditing(null);
    setForm(tab === 'components' ? EMPTY_COMP : EMPTY_MED);
    setShowModal(true);
  };

  const openEdit = item => {
    setEditing(item);
    setForm({
      ...item,
      expiry_date: item.expiry_date || '',
      quantity: item.quantity ?? '',
      critical_norm: item.critical_norm ?? ''
    });
    setShowModal(true);
  };

  const save = async e => {
    e.preventDefault();
    try {
      const endpoint = tab === 'components' ? '/warehouse/components' : '/warehouse/ready-medicines';
      if (editing) await api.put(`${endpoint}/${editing.id}`, form);
      else await api.post(endpoint, form);
      setShowModal(false); loadAll(search);
    } catch (err) { alert(err.response?.data?.error || 'Ошибка'); }
  };

  const del = async id => {
    if (!window.confirm('Удалить?')) return;
    const endpoint = tab === 'components' ? '/warehouse/components' : '/warehouse/ready-medicines';
    await api.delete(`${endpoint}/${id}`);
    loadAll(search);
  };

  const criticalCheck = async () => {
    const { data } = await api.post('/warehouse/critical-check');
    alert(`Проверка завершена. Создано заявок: ${data.created_requests}`);
    if (tab === 'wholesale') loadAll();
  };

  const updateReqStatus = async (id, status) => {
    await api.put(`/warehouse/wholesale-requests/${id}/status`, { status });
    loadAll();
  };

  const fmt = d => d ? new Date(d).toLocaleDateString('ru') : '—';
  const isExpired = d => d && new Date(d) < new Date();

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Складской учёт</h1>
        <div className="actions">
          {tab !== 'wholesale' && <button className="btn btn-primary" onClick={openCreate}>+ Добавить</button>}
          <button className="btn btn-secondary" onClick={criticalCheck}>⚠️ Проверить нормы</button>
        </div>
      </div>

      <div className="filters">
        {[['components', 'Компоненты'], ['ready', 'Готовые ЛС'], ['wholesale', 'Заявки на склад']].map(([v, l]) => (
          <button key={v} className={`btn btn-sm ${tab === v ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab(v)}>{l}</button>
        ))}
      </div>

      {tab !== 'wholesale' && (
        <div className="search-bar">
          <input value={search} onChange={e => { setSearch(e.target.value); loadAll(e.target.value); }} placeholder="Поиск..." />
        </div>
      )}

      {tab === 'components' && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Наименование</th>
                  <th>Количество</th>
                  <th>Ед.изм.</th>
                  <th>Критич. норма</th>
                  <th>Срок годности</th>
                  <th>Статус</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {components.length === 0
                  ? <tr><td colSpan={7} className="empty-state">Компонентов нет</td></tr>
                  : components.map(c => (
                    <tr key={c.id} style={isExpired(c.expiry_date) ? { background: '#fff5f5' } : {}}>
                      <td><strong>{c.name}</strong></td>
                      <td>{c.quantity}</td>
                      <td>{c.unit}</td>
                      <td>{c.critical_norm}</td>
                      <td style={isExpired(c.expiry_date) ? { color: '#c53030', fontWeight: 600 } : {}}>
                        {fmt(c.expiry_date)}
                        {isExpired(c.expiry_date) && ' ⚠️'}
                      </td>
                      <td>
                        {c.below_critical
                          ? <span className="badge badge-danger">Ниже нормы</span>
                          : <span className="badge badge-ok">OK</span>}
                      </td>
                      <td className="actions">
                        <button className="btn btn-xs btn-warning" onClick={() => openEdit(c)}>✏️</button>
                        <button className="btn btn-xs btn-danger" onClick={() => del(c.id)}>🗑</button>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'ready' && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Наименование</th>
                  <th>Тип</th>
                  <th>Количество</th>
                  <th>Ед.изм.</th>
                  <th>Критич. норма</th>
                  <th>Срок годности</th>
                  <th>Производитель</th>
                  <th>Статус</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {readyMeds.length === 0
                  ? <tr><td colSpan={9} className="empty-state">Готовых лекарств нет</td></tr>
                  : readyMeds.map(m => (
                    <tr key={m.id} style={isExpired(m.expiry_date) ? { background: '#fff5f5' } : {}}>
                      <td><strong>{m.name}</strong></td>
                      <td>{m.medicine_type}</td>
                      <td>{m.quantity}</td>
                      <td>{m.unit}</td>
                      <td>{m.critical_norm}</td>
                      <td style={isExpired(m.expiry_date) ? { color: '#c53030', fontWeight: 600 } : {}}>
                        {fmt(m.expiry_date)}{isExpired(m.expiry_date) && ' ⚠️'}
                      </td>
                      <td>{m.manufacturer || '—'}</td>
                      <td>
                        {m.below_critical
                          ? <span className="badge badge-danger">Ниже нормы</span>
                          : <span className="badge badge-ok">OK</span>}
                      </td>
                      <td className="actions">
                        <button className="btn btn-xs btn-warning" onClick={() => openEdit(m)}>✏️</button>
                        <button className="btn btn-xs btn-danger" onClick={() => del(m.id)}>🗑</button>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'wholesale' && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Компонент</th>
                  <th>Требуется</th>
                  <th>Ед.изм.</th>
                  <th>Причина</th>
                  <th>Статус</th>
                  <th>Дата</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {wholesaleReqs.length === 0
                  ? <tr><td colSpan={7} className="empty-state">Заявок нет</td></tr>
                  : wholesaleReqs.map(r => (
                    <tr key={r.id}>
                      <td><strong>{r.component_name}</strong></td>
                      <td>{r.quantity_needed}</td>
                      <td>{r.unit}</td>
                      <td>{r.reason === 'critical_norm' ? 'Критическая норма' : 'Заказ'}</td>
                      <td>
                        <span className={`badge ${r.status === 'fulfilled' ? 'badge-completed' : r.status === 'sent' ? 'badge-in-production' : 'badge-warning'}`}>
                          {r.status === 'pending' ? 'Ожидает' : r.status === 'sent' ? 'Отправлена' : 'Выполнена'}
                        </span>
                      </td>
                      <td className="text-muted text-sm">{fmt(r.created_at)}</td>
                      <td className="actions">
                        {r.status === 'pending' && <button className="btn btn-xs btn-primary" onClick={() => updateReqStatus(r.id, 'sent')}>Отправить</button>}
                        {r.status === 'sent' && <button className="btn btn-xs btn-success" onClick={() => updateReqStatus(r.id, 'fulfilled')}>Выполнена</button>}
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{editing ? 'Редактировать' : 'Добавить'} {tab === 'components' ? 'компонент' : 'лекарство'}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={save}>
              <div className="form-row">
                <div className="form-group full">
                  <label>Наименование *</label>
                  <input required value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
              </div>
              {tab === 'ready' && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Тип</label>
                    <select value={form.medicine_type || 'tablet'} onChange={e => setForm(f => ({ ...f, medicine_type: e.target.value }))}>
                      <option value="tablet">Таблетки</option>
                      <option value="ointment">Мазь</option>
                      <option value="tincture">Настойка</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Производитель</label>
                    <input value={form.manufacturer || ''} onChange={e => setForm(f => ({ ...f, manufacturer: e.target.value }))} />
                  </div>
                </div>
              )}
              <div className="form-row">
                <div className="form-group">
                  <label>Количество</label>
                  <input type="number" step="0.01" min="0" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Ед.изм.</label>
                  <select value={form.unit || 'г'} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                    <option>г</option><option>мл</option><option>шт</option><option>мг</option><option>уп</option><option>туб</option><option>фл</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Критич. норма</label>
                  <input type="number" step="0.01" min="0" value={form.critical_norm} onChange={e => setForm(f => ({ ...f, critical_norm: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Срок годности</label>
                  <input type="date" value={form.expiry_date || ''} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} />
                </div>
              </div>
              <hr className="divider" />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Отмена</button>
                <button type="submit" className="btn btn-primary">Сохранить</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
