import { useState, useEffect } from 'react';
import api from '../api';

const ROLE_LABELS = {
  provizor: 'Провизор', provizor_technolog: 'Провизор-технолог',
  rukovoditel: 'Руководитель', admin: 'Администратор'
};

const EMPTY_FORM = { username: '', full_name: '', role: 'provizor', password: '', is_active: true };

export default function Users() {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => { load(); }, []);

  const load = () => api.get('/users/').then(r => setUsers(r.data));

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = u => { setEditing(u); setForm({ ...u, password: '' }); setShowModal(true); };

  const save = async e => {
    e.preventDefault();
    try {
      if (editing) await api.put(`/users/${editing.id}`, form);
      else await api.post('/users/', form);
      setShowModal(false); load();
    } catch (err) { alert(err.response?.data?.error || 'Ошибка'); }
  };

  const deactivate = async id => {
    if (!window.confirm('Деактивировать пользователя?')) return;
    await api.delete(`/users/${id}`);
    load();
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Управление пользователями</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ Новый пользователь</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Логин</th><th>ФИО</th><th>Роль</th><th>Статус</th><th>Дата создания</th><th>Действия</th></tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={!u.is_active ? { opacity: 0.5 } : {}}>
                  <td><strong>{u.username}</strong></td>
                  <td>{u.full_name}</td>
                  <td><span className="tag">{ROLE_LABELS[u.role] || u.role}</span></td>
                  <td>
                    <span className={`badge ${u.is_active ? 'badge-completed' : 'badge-danger'}`}>
                      {u.is_active ? 'Активен' : 'Деактивирован'}
                    </span>
                  </td>
                  <td className="text-muted text-sm">{new Date(u.created_at).toLocaleDateString('ru')}</td>
                  <td className="actions">
                    <button className="btn btn-xs btn-warning" onClick={() => openEdit(u)}>✏️ Изменить</button>
                    {u.is_active && <button className="btn btn-xs btn-danger" onClick={() => deactivate(u.id)}>Деактивировать</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{editing ? 'Редактировать пользователя' : 'Новый пользователь'}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={save}>
              <div className="form-row">
                <div className="form-group">
                  <label>Логин *</label>
                  <input required value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} disabled={!!editing} />
                </div>
                <div className="form-group">
                  <label>{editing ? 'Новый пароль' : 'Пароль *'}</label>
                  <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    required={!editing} placeholder={editing ? 'Оставьте пустым, чтобы не менять' : ''} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group full">
                  <label>ФИО *</label>
                  <input required value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Роль</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                    {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                {editing && (
                  <div className="form-group">
                    <label>Статус</label>
                    <select value={form.is_active ? '1' : '0'} onChange={e => setForm(f => ({ ...f, is_active: e.target.value === '1' }))}>
                      <option value="1">Активен</option>
                      <option value="0">Деактивирован</option>
                    </select>
                  </div>
                )}
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
