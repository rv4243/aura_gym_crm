import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTrainers, updateTrainer } from '../api/trainers.js';
import { getMembers } from '../api/members.js';
import { uploadTrainerPhoto, deleteTrainerPhoto } from '../api/trainerPhoto.js';
import TopBar  from '../components/TopBar.jsx';
import Badge   from '../components/Badge.jsx';
import Modal   from '../components/Modal.jsx';
import Loader  from '../components/Loader.jsx';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtINR  = (n) => n ? `₹${Number(n).toLocaleString('en-IN')}/mo` : '—';
const initials = (name = '') => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

const SPECIALTIES = [
  'Strength & Conditioning', 'Weight Loss', 'Cardio & Endurance',
  'Yoga & Flexibility', 'Crossfit', 'Nutrition & Diet', 'Bodybuilding',
  'Functional Training', 'Martial Arts', 'Zumba & Dance', 'Personal Training',
];

export default function TrainerProfile() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const fileRef  = useRef(null);

  const [trainer,      setTrainer]      = useState(null);
  const [members,      setMembers]      = useState([]);   // members assigned to this trainer
  const [loading,      setLoading]      = useState(true);
  const [uploading,    setUploading]    = useState(false);
  const [avatarHover,  setAvatarHover]  = useState(false);
  const [editModal,    setEditModal]    = useState(false);
  const [form,         setForm]         = useState({});
  const [saving,       setSaving]       = useState(false);
  const [toast,        setToast]        = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500);
  };

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      getTrainers({ _t: Date.now() }).then(r => r.data.find(t => t._id === id)),
      getMembers({ trainerId: id }),
    ]).then(([t, mr]) => {
      if (!t) { setLoading(false); return; }
      setTrainer(t);
      setMembers(mr.data);
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
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { loadAll(); }, [id]);

  // ── Photo handlers ──────────────────────────────────────────────────────────
  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadTrainerPhoto(id, file);
      setTrainer(prev => ({ ...prev, photo: res.data.photo }));
      showToast('Photo updated ✓');
    } catch (err) {
      showToast(err.response?.data?.error || 'Upload failed', 'error');
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleRemovePhoto = async () => {
    setUploading(true);
    try {
      await deleteTrainerPhoto(id);
      setTrainer(prev => ({ ...prev, photo: null }));
      showToast('Photo removed');
    } catch { showToast('Could not remove photo', 'error'); }
    setUploading(false);
  };

  // ── Edit save ───────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form, salary: form.salary ? Number(form.salary) : 0 };
      const res = await updateTrainer(id, payload);
      setTrainer(prev => ({ ...prev, ...res.data }));
      setEditModal(false);
      showToast('Profile updated');
    } catch (e) {
      showToast(e.response?.data?.error || 'Update failed', 'error');
    }
    setSaving(false);
  };

  if (loading) return <><TopBar title="Trainer Profile" /><Loader /></>;
  if (!trainer) return <><TopBar title="Not Found" /><div className="page-body"><p>Trainer not found.</p></div></>;

  const photoUrl = trainer.photo ? `/uploads/${trainer.photo}` : null;

  return (
    <>
      <TopBar title="Trainer Profile" />
      <div className="page-body">

        {/* Back */}
        <button className="btn btn-ghost btn-sm" style={{ marginBottom: 20 }} onClick={() => navigate('/trainers')}>
          ← Back to Trainers
        </button>

        {/* ── Hero Card ── */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>

            {/* Clickable avatar */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div
                style={{
                  width: 90, height: 90, borderRadius: '50%',
                  overflow: 'hidden',
                  background: photoUrl ? '#000' : 'linear-gradient(135deg,#c8a96e,#9a7a45)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 30, fontWeight: 700, color: '#0a0a0f',
                  cursor: 'pointer',
                  border: `3px solid ${avatarHover ? 'var(--accent)' : 'rgba(200,169,110,0.3)'}`,
                  transition: 'border-color 0.2s', position: 'relative',
                }}
                onClick={() => fileRef.current?.click()}
                onMouseEnter={() => setAvatarHover(true)}
                onMouseLeave={() => setAvatarHover(false)}
                title="Click to upload photo"
              >
                {photoUrl ? (
                  <img src={photoUrl} alt={trainer.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover',
                      opacity: avatarHover || uploading ? 0.5 : 1, transition: 'opacity 0.2s' }} />
                ) : (
                  <span style={{ opacity: avatarHover || uploading ? 0.4 : 1, transition: 'opacity 0.2s' }}>
                    {initials(trainer.name)}
                  </span>
                )}
                {(avatarHover || uploading) && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                    {uploading ? (
                      <div style={{ width: 20, height: 20, border: '2px solid var(--accent)',
                        borderTopColor: 'transparent', borderRadius: '50%',
                        animation: 'spin 0.7s linear infinite' }} />
                    ) : (
                      <>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                          stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                          <circle cx="12" cy="13" r="4"/>
                        </svg>
                        <span style={{ fontSize: 9, color: 'var(--accent)', fontWeight: 700, letterSpacing: 0.5 }}>UPLOAD</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {photoUrl && !uploading && (
                <button onClick={handleRemovePhoto} title="Remove photo" style={{
                  position: 'absolute', top: -4, right: -4,
                  width: 22, height: 22, borderRadius: '50%',
                  background: 'var(--danger)', border: '2px solid var(--bg-surface)',
                  color: '#fff', fontSize: 12, lineHeight: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', fontWeight: 700,
                }}>×</button>
              )}

              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }} onChange={handlePhotoSelect} />
            </div>

            {/* Info */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
                <h2 style={{ fontSize: 22, fontWeight: 700 }}>{trainer.name}</h2>
                <Badge status={trainer.status} />
              </div>
              <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, marginBottom: 8 }}>
                🏋️ {trainer.specialty || 'Personal Trainer'}
              </div>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-muted)' }}>
                <span>📞 {trainer.phone}</span>
                {trainer.email && <span>✉️ {trainer.email}</span>}
                <span>📅 Joined {fmtDate(trainer.joinDate)}</span>
                <span>💰 {fmtINR(trainer.salary)}</span>
              </div>
              {trainer.notes && (
                <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--text-secondary)',
                  background: 'var(--bg-elevated)', padding: '8px 12px',
                  borderRadius: 8, display: 'inline-block' }}>
                  💬 {trainer.notes}
                </div>
              )}
              <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 10 }}>
                📷 Click the avatar to upload a profile photo (JPG, PNG or WebP · max 5 MB)
              </p>
            </div>

            <button className="btn btn-secondary" onClick={() => setEditModal(true)}>✏️ Edit Profile</button>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="stats-grid" style={{ marginBottom: 20 }}>
          <div className="stat-card" style={{ '--card-accent': '#c8a96e', '--card-accent-dim': 'rgba(200,169,110,0.15)' }}>
            <div className="stat-icon">🏋️</div>
            <div className="stat-value" style={{ fontSize: 18 }}>{trainer.specialty || '—'}</div>
            <div className="stat-label">Specialty</div>
          </div>
          <div className="stat-card" style={{ '--card-accent': '#4caf7d', '--card-accent-dim': 'rgba(76,175,125,0.15)' }}>
            <div className="stat-icon">💰</div>
            <div className="stat-value" style={{ fontSize: 22 }}>{fmtINR(trainer.salary)}</div>
            <div className="stat-label">Monthly Salary</div>
          </div>
          <div className="stat-card" style={{ '--card-accent': '#6c8ff0', '--card-accent-dim': 'rgba(108,143,240,0.15)' }}>
            <div className="stat-icon">👥</div>
            <div className="stat-value">{members.length}</div>
            <div className="stat-label">Assigned Members</div>
            <div className="stat-sub">Active clients</div>
          </div>
          <div className="stat-card" style={{ '--card-accent': '#9b6ec8', '--card-accent-dim': 'rgba(155,110,200,0.15)' }}>
            <div className="stat-icon">📅</div>
            <div className="stat-value" style={{ fontSize: 18 }}>{fmtDate(trainer.joinDate)}</div>
            <div className="stat-label">Joined On</div>
          </div>
        </div>

        {/* ── Assigned Members ── */}
        <div className="card" style={{ padding: 0 }}>
          <div className="card-header" style={{ padding: '20px 20px 16px' }}>
            <div>
              <div className="card-title">Assigned Members</div>
              <div className="card-sub">{members.length} member{members.length !== 1 ? 's' : ''} under {trainer.name}</div>
            </div>
          </div>
          <div className="table-wrap" style={{ borderRadius: 0, border: 'none', borderTop: '1px solid var(--border)' }}>
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Phone</th>
                  <th>Plan</th>
                  <th>Expiry</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {members.length === 0 ? (
                  <tr><td colSpan="5">
                    <div className="empty-state" style={{ padding: 30 }}>
                      <p>No members assigned to this trainer yet.</p>
                    </div>
                  </td></tr>
                ) : members.map(m => (
                  <tr key={m._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/members/${m._id}`)}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
                          background: m.photo ? '#000' : 'linear-gradient(135deg,#c8a96e,#9a7a45)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 700, color: '#0a0a0f',
                          border: '2px solid rgba(200,169,110,0.2)',
                        }}>
                          {m.photo
                            ? <img src={`/uploads/${m.photo}`} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : initials(m.name)
                          }
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{m.name}</div>
                          {m.email && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.email}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="muted">{m.phone}</td>
                    <td>{m.planId?.name || <span style={{ color: 'var(--text-muted)' }}>No plan</span>}</td>
                    <td>
                      <span style={{ fontSize: 12, color: m.expiryDate && new Date(m.expiryDate) < new Date() ? 'var(--danger)' : 'var(--text-primary)' }}>
                        {fmtDate(m.expiryDate)}
                      </span>
                    </td>
                    <td><Badge status={m.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Edit Modal ── */}
        {editModal && (
          <Modal title="Edit Trainer" onClose={() => setEditModal(false)}
            footer={<>
              <button className="btn btn-ghost" onClick={() => setEditModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </>}
          >
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-input" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone *</label>
                <input className="form-input" value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Specialty</label>
                <input className="form-input" value={form.specialty}
                  onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}
                  list="sp-list" placeholder="Strength & Conditioning" />
                <datalist id="sp-list">{SPECIALTIES.map(s => <option key={s} value={s} />)}</datalist>
              </div>
              <div className="form-group">
                <label className="form-label">Monthly Salary (₹)</label>
                <input className="form-input" type="number" value={form.salary}
                  onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} />
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
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional…" />
            </div>
          </Modal>
        )}

        {toast && (
          <div className="toast-container">
            <div className={`toast ${toast.type}`}>
              {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
