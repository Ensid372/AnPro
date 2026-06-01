import { useState, useEffect } from 'react';
import api from '../api';

const TYPE_LABELS = {
  mixture: 'Микстура', ointment: 'Мазь', solution: 'Раствор',
  tincture: 'Настойка', powder: 'Порошок'
};

const USAGE_LABELS = {
  internal: 'Внутреннее', external: 'Наружное', both: 'Внутреннее и наружное'
};

const EMPTY_FORM = {
  medicine_name: '', medicine_type: 'mixture', usage_method: 'internal',
  preparation_method: '', preparation_time_min: 60, components: []
};

export default function TechCards() {
  const [cards, setCards] = useState([]);
  const [allComponents, setAllComponents] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [viewing, setViewing] = useState(null);

  useEffect(() => { load(); }, []);
  useEffect(() => {
    api.get('/warehouse/components').then(r => setAllComponents(r.data));
  }, []);

  const load = (q = '') =>
    api.get('/tech-cards/', { params: { q: q || undefined } }).then(r => setCards(r.data));

  const openCreate = () => {
    setEditing(null); setForm(EMPTY_FORM); setShowModal(true);
  };

  const openEdit = card => {
    setEditing(card);
    setForm({
      medicine_name: card.medicine_name,
      medicine_type: card.medicine_type,
      usage_method: card.usage_method,
      preparation_method: card.preparation_method,
      preparation_time_min: card.preparation_time_min,
      components: (card.components || []).map(c => ({
        component_id: c.component_id,
        required_quantity: c.required_quantity
      }))
    });
    setShowModal(true);
  };

  const save = async e => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/tech-cards/${editing.id}`, form);
      } else {
        await api.post('/tech-cards/', form);
      }
      setShowModal(false); load(search);
    } catch (err) {
      alert(err.response?.data?.error || 'Ошибка сохранения');
    }
  };

  const del = async id => {
    if (!window.confirm('Удалить технологическую карту?')) return;
    await api.delete(`/tech-cards/${id}`);
    load(search);
  };

  const addComponent = () =>
    setForm(f => ({ ...f, components: [...f.components, { component_id: '', required_quantity: '' }] }));

  const setComp = (i, field, val) => {
    setForm(f => {
      const comps = [...f.components];
      comps[i] = { ...comps[i], [field]: val };
      return { ...f, components: comps };
    });
  };

  const removeComp = i =>
    setForm(f => ({ ...f, components: f.components.filter((_, idx) => idx !== i) }));

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Справочник технологий приготовления</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ Добавить технологию</button>
      </div>

      <div className="search-bar">
        <input value={search} onChange={e => { setSearch(e.target.value); load(e.target.value); }}
          placeholder="Поиск по названию лекарства..." />
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Лекарство</th>
                <th>Тип</th>
                <th>Применение</th>
                <th>Время (мин)</th>
                <th>Компонентов</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {cards.length === 0
                ? <tr><td colSpan={7} className="empty-state">Технологических карт нет</td></tr>
                : cards.map(c => (
                  <tr key={c.id}>
                    <td><span className="tag">{c.tech_id}</span></td>
                    <td><strong>{c.medicine_name}</strong></td>
                    <td>{TYPE_LABELS[c.medicine_type] || c.medicine_type}</td>
                    <td>{USAGE_LABELS[c.usage_method] || c.usage_method}</td>
                    <td>{c.preparation_time_min}</td>
                    <td>{c.components?.length || 0}</td>
                    <td className="actions">
                      <button className="btn btn-sm btn-secondary" onClick={() => setViewing(c)}>👁 Просмотр</button>
                      <button className="btn btn-sm btn-warning" onClick={() => openEdit(c)}>✏️ Изменить</button>
                      <button className="btn btn-sm btn-danger" onClick={() => del(c.id)}>🗑</button>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {viewing && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewing(null)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{viewing.medicine_name}</span>
              <button className="modal-close" onClick={() => setViewing(null)}>×</button>
            </div>
            <p><strong>ID:</strong> <span className="tag">{viewing.tech_id}</span></p>
            <p><strong>Тип:</strong> {TYPE_LABELS[viewing.medicine_type]}</p>
            <p><strong>Способ применения:</strong> {USAGE_LABELS[viewing.usage_method]}</p>
            <p><strong>Время изготовления:</strong> {viewing.preparation_time_min} мин.</p>
            <hr className="divider" />
            <p><strong>Способ приготовления:</strong></p>
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', marginTop: 8, fontSize: 13, background: '#f7fafc', padding: 12, borderRadius: 6 }}>
              {viewing.preparation_method}
            </pre>
            {viewing.components?.length > 0 && <>
              <hr className="divider" />
              <p><strong>Компоненты:</strong></p>
              <table style={{ marginTop: 8 }}>
                <thead>
                  <tr><th>Компонент</th><th>Требуется</th><th>На складе</th></tr>
                </thead>
                <tbody>
                  {viewing.components.map(c => (
                    <tr key={c.id}>
                      <td>{c.component_name}</td>
                      <td>{c.required_quantity} {c.unit}</td>
                      <td>
                        <span className={`badge ${c.available_quantity >= c.required_quantity ? 'badge-completed' : 'badge-danger'}`}>
                          {c.available_quantity} {c.unit}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>}
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 720 }}>
            <div className="modal-header">
              <span className="modal-title">{editing ? 'Редактировать технологию' : 'Новая технологическая карта'}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={save}>
              <div className="form-row">
                <div className="form-group">
                  <label>Название лекарства *</label>
                  <input required value={form.medicine_name} onChange={e => setForm(f => ({ ...f, medicine_name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Тип *</label>
                  <select value={form.medicine_type} onChange={e => setForm(f => ({ ...f, medicine_type: e.target.value }))}>
                    <option value="mixture">Микстура</option>
                    <option value="ointment">Мазь</option>
                    <option value="solution">Раствор</option>
                    <option value="tincture">Настойка</option>
                    <option value="powder">Порошок</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Способ применения *</label>
                  <select value={form.usage_method} onChange={e => setForm(f => ({ ...f, usage_method: e.target.value }))}>
                    <option value="internal">Внутреннее</option>
                    <option value="external">Наружное</option>
                    <option value="both">Оба</option>
                  </select>
                </div>
                <div className="form-group" style={{ minWidth: 100, maxWidth: 120 }}>
                  <label>Время (мин)</label>
                  <input type="number" min={1} value={form.preparation_time_min}
                    onChange={e => setForm(f => ({ ...f, preparation_time_min: parseInt(e.target.value) }))} />
                </div>
              </div>
              <div className="form-group full">
                <label>Способ приготовления *</label>
                <textarea required rows={6} value={form.preparation_method}
                  onChange={e => setForm(f => ({ ...f, preparation_method: e.target.value }))}
                  placeholder="Опишите пошаговый процесс приготовления..." />
              </div>

              <hr className="divider" />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <strong style={{ fontSize: 13 }}>Компоненты</strong>
                <button type="button" className="btn btn-sm btn-secondary" onClick={addComponent}>+ Добавить</button>
              </div>
              {form.components.map((comp, i) => (
                <div key={i} className="component-row">
                  <select style={{ flex: 2 }} value={comp.component_id}
                    onChange={e => setComp(i, 'component_id', e.target.value)}>
                    <option value="">— Выбрать компонент —</option>
                    {allComponents.map(c => <option key={c.id} value={c.id}>{c.name} ({c.quantity} {c.unit})</option>)}
                  </select>
                  <input type="number" min={0} step={0.01} style={{ width: 90 }}
                    placeholder="Кол-во" value={comp.required_quantity}
                    onChange={e => setComp(i, 'required_quantity', e.target.value)} />
                  <button type="button" className="btn btn-xs btn-danger" onClick={() => removeComp(i)}>✕</button>
                </div>
              ))}

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
