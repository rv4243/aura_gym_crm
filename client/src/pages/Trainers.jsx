import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTrainers, createTrainer, updateTrainer, deleteTrainer } from '../api/trainers.js';
import TopBar from '../components/TopBar.jsx';
import Modal  from '../components/Modal.jsx';
import Loader from '../components/Loader.jsx';

const EMPTY = { name: '', phone: '', email: '', specialty: '', salary: '', joinDate: '', status: 'active', notes: '' };

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtINR  = (n) => n ? `₹${Number(n).toLocaleString('en-IN')}/mo` : '—';

const SPECIALTIES = [
  'Strength & Conditioning', 'Weight Loss', 'Cardio & Endurance',
  'Yoga & Flexibility', 'Crossfit', 'Nutrition & Diet', 'Bodybuilding',
  'Functional Training', 'Martial Arts', 'Zumba & Dance', 'Personal Training',
];

function Avatar({ trainer, size = 44 }) {
  const initials = trainer.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
      background: trainer.photo ? '#000' : 'linear-gradient(135deg, #c8a96e, #9a7a45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.3, fontWeight: 700, color: '#0a0a0f',
      border: '2px solid rgba(200,169,110,0.3)',
    }}>
      {trainer.photo
        ? <img src={`/uploads/${trainer.photo}`} alt={trainer.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : initials
      }
    </div>
  );
}

export default function Trainers() {
  const navigate = useNavigate();
  const [trainers, setTrainers] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [status,   setStatus]   = useState('');
  const [modal,    setModal]    = useState(null);
  const [selected, setSelected] = useState(null);
  const [form,     setForm]     = useState(EMPTY);
  const [saving,   setSaving]   = useState(false);
  const [toast,    setToast]    = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(() => {
    setLoading(true);
    getTrainers({ search, status })
      .then(r => setTrainers(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, status]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setForm(EMPTY); setModal('add'); };
  const openEdit = (t) => {
    setSelected(t);
    setForm({
      name:      t.name,
      phone:     t.phone,
      email:     t.email || '',
      specialty: t.specialty || '',
      salary:    t.salary || '',
      joinDate:  t.joinDate ? t.joinDate.split('T')[0] : '',
      status:    t.status,
      notes:     t.notes || '',
    });
    setModal('edit');
  };
  const openDelete = (t) => { setSelected(t); setModal('delete'); };
  const closeModal  = () => { setModal(null); setSelected(null); };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form, salary: form.salary ? Number(form.salary) : 0 };
      if (modal === 'add') {
        await createTrainer(payload);
        showToast('Trainer added successfully');
      } else {
        await updateTrainer(selected._id, payload);
        showToast('Trainer updated');
      }
      closeModal(); load();
    } catch (e) {
      showToast(e.response?.data?.error || 'Error saving trainer', 'error');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await deleteTrainer(selected._id);
      showToast('Trainer removed');
      closeModal(); load();
    } catch (e) {
      showToast('Delete failed', 'error');
    }
    setSaving(false);
  };

  const active   = trainers.filter(t => t.status === 'active').length;
  const inactive = trainers.filter(t => t.status === 'inactive').length;

  return (
    <>
      <TopBar title="Trainers" />
      <div className="page-body">

        {/* Header */}
        <div className="page-header">
          <div className="page-header-info">
            <h1>Trainers</h1>
            <p>
              <span style={{ color: 'var(--success)' }}>{active} active</span>
              {inactive > 0 && <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>· {inactive} inactive</span>}
            </p>
          </div>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Trainer</button>
        </div>

        {/* Filter bar */}
        <div className="filter-bar">
          <div className="search-wrap">
            <span className="search-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </span>
            <input className="form-input" placeholder="Search name, specialty…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="filter-select" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Trainer cards grid */}
        {loading ? <Loader /> : trainers.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 40 }}>
            <h3>No trainers found</h3>
            <p>Add your first trainer to get started.</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16,
          }}>
            {trainers.map(t => (
              <div key={t._id} className="card" style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <Avatar trainer={t} size={52} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 2 }}>
                      {t.specialty || 'Personal Trainer'}
                    </div>
                  </div>
                  {/* Status pill */}
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
                    padding: '3px 10px', borderRadius: 20,
                    background: t.status === 'active' ? 'var(--success-dim)' : 'rgba(100,100,100,0.15)',
                    color: t.status === 'active' ? 'var(--success)' : 'var(--text-muted)',
                    border: `1px solid ${t.status === 'active' ? 'var(--success)' : 'transparent'}33`,
                  }}>
                    {t.status}
                  </span>
                </div>

                {/* Info rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>📞 Phone</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{t.phone}</span>
                  </div>
                  {t.email && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>✉️ Email</span>
                      <span style={{ color: 'var(--text-primary)' }}>{t.email}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>💰 Salary</span>
                    <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{fmtINR(t.salary)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>📅 Joined</span>
                    <span style={{ color: 'var(--text-primary)' }}>{fmtDate(t.joinDate)}</span>
                  </div>
                  {t.notes && (
                    <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2, fontStyle: 'italic' }}>
                      {t.notes}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => navigate(`/trainers/${t._id}`)}>
                    👁️ Profile
                  </button>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => openEdit(t)}>
                    ✏️ Edit
                  </button>
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger-dim)', flex: 0 }}
                    onClick={() => openDelete(t)}>
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add / Edit Modal */}
        {(modal === 'add' || modal === 'edit') && (
          <Modal
            title={modal === 'add' ? 'Add Trainer' : 'Edit Trainer'}
            onClose={closeModal}
            footer={<>
              <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.name || !form.phone}>
                {saving ? 'Saving…' : modal === 'add' ? 'Add Trainer' : 'Save Changes'}
              </button>
            </>}
          >
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-input" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Arjun Sharma" />
              </div>
              <div className="form-group">
                <label className="form-label">Phone *</label>
                <input className="form-input" value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="9876543210" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="arjun@example.com" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Specialty</label>
                <input className="form-input" value={form.specialty}
                  onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}
                  list="specialties-list"
                  placeholder="Strength & Conditioning" />
                <datalist id="specialties-list">
                  {SPECIALTIES.map(s => <option key={s} value={s} />)}
                </datalist>
              </div>
              <div className="form-group">
                <label className="form-label">Monthly Salary (₹)</label>
                <input className="form-input" type="number" value={form.salary}
                  onChange={e => setForm(f => ({ ...f, salary: e.target.value }))}
                  placeholder="25000" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Join Date</label>
                <input className="form-input" type="date" value={form.joinDate}
                  onChange={e => setForm(f => ({ ...f, joinDate: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <input className="form-input" value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes…" />
            </div>
          </Modal>
        )}

        {/* Delete Confirm */}
        {modal === 'delete' && (
          <Modal title="Remove Trainer" onClose={closeModal} size="confirm-modal"
            footer={<>
              <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>
                {saving ? 'Removing…' : 'Remove Trainer'}
              </button>
            </>}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>
                <Avatar trainer={selected} size={64} />
              </div>
              <h3 style={{ marginBottom: 6 }}>Remove {selected?.name}?</h3>
              <p>This will permanently delete all their data.</p>
            </div>
          </Modal>
        )}

        {toast && (
          <div className="toast-container">
            <div className={`toast ${toast.type}`}>{toast.type === 'success' ? '✅' : '❌'} {toast.msg}</div>
          </div>
        )}
      </div>
    </>
  );
}
