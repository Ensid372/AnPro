import { useState, useEffect } from 'react';
import api from '../api';

const STATUS_MAP = {
  in_production: { label: 'В производстве', cls: 'badge-in-production' },
  waiting_components: { label: 'Ожидание компонентов', cls: 'badge-waiting' },
  completed: { label: 'Выдан', cls: 'badge-completed' },
  unserved: { label: 'Необслужен', cls: 'badge-unserved' },
  error: { label: 'Ошибка', cls: 'badge-error' }
};

const EMPTY_FORM = {
  customer_name: '', customer_phone: '', customer_address: '',
  doctor_name: '', medicine_name: '', order_type: 'manufactured',
  tech_card_id: '', ready_medicine_id: ''
};

export default function Prescriptions() {
  const [orders, setOrders] = useState([]);
  const [techCards, setTechCards] = useState([]);
  const [readyMeds, setReadyMeds] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [checkResult, setCheckResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => { load(); }, [statusFilter]);
  useEffect(() => {
    api.get('/tech-cards/').then(r => setTechCards(r.data));
    api.get('/warehouse/ready-medicines').then(r => setReadyMeds(r.data));
  }, []);

  const load = () =>
    api.get('/orders/', { params: { status: statusFilter || undefined } })
      .then(r => setOrders(r.data));

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setCheckResult(null); };

  const checkComponents = async () => {
    setChecking(true); setCheckResult(null);
    try {
      const { data } = await api.post('/orders/check-components', {
        order_type: form.order_type,
        tech_card_id: form.tech_card_id ? parseInt(form.tech_card_id) : null,
        ready_medicine_id: form.ready_medicine_id ? parseInt(form.ready_medicine_id) : null,
        medicine_name: form.medicine_name
      });
      setCheckResult(data);
    } catch { setCheckResult({ available: false, missing: [] }); }
    setChecking(false);
  };

  const submit = async e => {
    e.preventDefault();
    setSubmitting(true); setError('');
    try {
      const payload = {
        ...form,
        tech_card_id: form.tech_card_id ? parseInt(form.tech_card_id) : null,
        ready_medicine_id: form.ready_medicine_id ? parseInt(form.ready_medicine_id) : null
      };
      await api.post('/orders/', payload);
      setShowForm(false); setForm(EMPTY_FORM); setCheckResult(null);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка при оформлении заказа');
    }
    setSubmitting(false);
  };

  const complete = async id => {
    if (!window.confirm('Выдать заказ покупателю?')) return;
    await api.post(`/orders/${id}/complete`);
    load();
  };

  const markReady = async id => {
    try {
      await api.post(`/orders/${id}/mark-components-ready`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Ошибка');
    }
  };

  const fmt = dt => dt ? new Date(dt).toLocaleString('ru') : '—';

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Приём рецептов и заказы</h1>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setForm(EMPTY_FORM); setCheckResult(null); }}>
          + Принять рецепт
        </button>
      </div>

      <div className="filters">
        {[['', 'Все'], ['in_production', 'В производстве'], ['waiting_components', 'Ожидание'], ['completed', 'Выданные']].map(([v, l]) => (
          <button key={v} className={`btn btn-sm ${statusFilter === v ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setStatusFilter(v)}>{l}</button>
        ))}
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>№ заказа</th>
                <th>Покупатель</th>
                <th>Телефон</th>
                <th>Лекарство</th>
                <th>Статус</th>
                <th>Готов к</th>
                <th>Дата приёма</th>
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
                      <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                      <td className="text-muted text-sm">{fmt(o.estimated_ready_at)}</td>
                      <td className="text-muted text-sm">{fmt(o.created_at)}</td>
                      <td className="actions">
                        {o.status === 'in_production' &&
                          <button className="btn btn-sm btn-success" onClick={() => complete(o.id)}>Выдать</button>}
                        {o.status === 'waiting_components' &&
                          <button className="btn btn-sm btn-warning" onClick={() => markReady(o.id)}>Компоненты поступили</button>}
                      </td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Приём рецепта</span>
              <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <form onSubmit={submit}>
              <div className="form-row">
                <div className="form-group">
                  <label>ФИО покупателя *</label>
                  <input required value={form.customer_name} onChange={e => set('customer_name', e.target.value)} placeholder="Иванов Иван Иванович" />
                </div>
                <div className="form-group">
                  <label>Телефон *</label>
                  <input required value={form.customer_phone} onChange={e => set('customer_phone', e.target.value)} placeholder="+7 (999) 000-00-00" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Адрес *</label>
                  <input required value={form.customer_address} onChange={e => set('customer_address', e.target.value)} placeholder="ул. Ленина, д. 1, кв. 1" />
                </div>
                <div className="form-group">
                  <label>ФИО врача</label>
                  <input value={form.doctor_name} onChange={e => set('doctor_name', e.target.value)} placeholder="Сидоров А.П." />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Тип заказа *</label>
                  <select value={form.order_type} onChange={e => { set('order_type', e.target.value); set('tech_card_id', ''); set('ready_medicine_id', ''); }}>
                    <option value="manufactured">Изготавливаемое</option>
                    <option value="ready">Готовое лекарство</option>
                  </select>
                </div>
                {form.order_type === 'manufactured'
                  ? <div className="form-group">
                      <label>Технологическая карта *</label>
                      <select required value={form.tech_card_id} onChange={e => {
                        set('tech_card_id', e.target.value);
                        const tc = techCards.find(c => c.id === parseInt(e.target.value));
                        if (tc) set('medicine_name', tc.medicine_name);
                      }}>
                        <option value="">— Выбрать —</option>
                        {techCards.map(c => <option key={c.id} value={c.id}>{c.medicine_name}</option>)}
                      </select>
                    </div>
                  : <div className="form-group">
                      <label>Готовое лекарство *</label>
                      <select required value={form.ready_medicine_id} onChange={e => {
                        set('ready_medicine_id', e.target.value);
                        const m = readyMeds.find(m => m.id === parseInt(e.target.value));
                        if (m) set('medicine_name', m.name);
                      }}>
                        <option value="">— Выбрать —</option>
                        {readyMeds.map(m => <option key={m.id} value={m.id}>{m.name} ({m.quantity} {m.unit})</option>)}
                      </select>
                    </div>
                }
              </div>
              <div className="form-row">
                <div className="form-group full">
                  <label>Название лекарства *</label>
                  <input required value={form.medicine_name} onChange={e => set('medicine_name', e.target.value)} placeholder="Введите или выберите выше" />
                </div>
              </div>

              <button type="button" className="btn btn-secondary" onClick={checkComponents} disabled={checking || (!form.tech_card_id && !form.ready_medicine_id)}>
                {checking ? 'Проверка...' : '🔍 Проверить наличие'}
              </button>

              {checkResult && (
                <div className={`alert ${checkResult.available ? 'alert-success' : 'alert-warning'}`} style={{ marginTop: 12 }}>
                  {checkResult.available
                    ? '✅ Все компоненты в наличии. Можно оформить заказ.'
                    : <>
                        ⚠️ Не хватает компонентов. Будет сформирована заявка на оптовый склад.
                        {checkResult.missing?.length > 0 && (
                          <ul style={{ marginTop: 8, paddingLeft: 20, fontSize: 12 }}>
                            {checkResult.missing.map((m, i) =>
                              <li key={i}>{m.component_name}: нужно {m.required}, есть {m.available} {m.unit}</li>
                            )}
                          </ul>
                        )}
                      </>
                  }
                </div>
              )}

              {error && <div className="alert alert-error">{error}</div>}

              <hr className="divider" />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Отмена</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Оформление...' : 'Оформить заказ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
