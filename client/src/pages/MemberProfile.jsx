import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMember, updateMember } from '../api/members.js';
import { getPayments } from '../api/payments.js';
import { getAttendance } from '../api/attendance.js';
import { getPlans } from '../api/plans.js';
import { uploadMemberPhoto, deleteMemberPhoto } from '../api/memberPhoto.js';
import TopBar from '../components/TopBar.jsx';
import Badge from '../components/Badge.jsx';
import Modal from '../components/Modal.jsx';
import Loader from '../components/Loader.jsx';

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function daysLeft(expiry) {
  if (!expiry) return null;
  return Math.ceil((new Date(expiry) - new Date()) / (1000 * 60 * 60 * 24));
}

export default function MemberProfile() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const fileRef   = useRef(null);

  const [member,     setMember]     = useState(null);
  const [payments,   setPayments]   = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [plans,      setPlans]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [uploading,  setUploading]  = useState(false);
  const [editModal,  setEditModal]  = useState(false);
  const [form,       setForm]       = useState({});
  const [saving,     setSaving]     = useState(false);
  const [toast,      setToast]      = useState(null);
  const [avatarHover, setAvatarHover] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      getMember(id),
      getPayments({ memberId: id }),
      getAttendance({ memberId: id }),
      getPlans(),
    ]).then(([mr, pr, ar, plr]) => {
      setMember(mr.data);
      setPayments(pr.data);
      setAttendance(ar.data);
      setPlans(plr.data.filter(p => p.isActive));
      setForm({
        name:     mr.data.name,
        phone:    mr.data.phone,
        email:    mr.data.email || '',
        planId:   mr.data.planId?._id || '',
        joinDate: mr.data.joinDate ? mr.data.joinDate.split('T')[0] : '',
        status:   mr.data.status,
        notes:    mr.data.notes || '',
      });
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { loadAll(); }, [id]);

  // ── Photo upload ────────────────────────────────────────────────────────────
  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadMemberPhoto(id, file);
      setMember(prev => ({ ...prev, photo: res.data.photo }));
      showToast('Profile photo updated ✓');
    } catch (err) {
      showToast(err.response?.data?.error || 'Upload failed', 'error');
    }
    setUploading(false);
    e.target.value = '';   // reset input so same file can be re-selected
  };

  const handleRemovePhoto = async () => {
    setUploading(true);
    try {
      await deleteMemberPhoto(id);
      setMember(prev => ({ ...prev, photo: null }));
      showToast('Photo removed');
    } catch {
      showToast('Could not remove photo', 'error');
    }
    setUploading(false);
  };

  // ── Edit save ───────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateMember(id, form);
      setMember(prev => ({ ...prev, ...res.data }));
      setEditModal(false);
      showToast('Profile updated');
    } catch (e) {
      showToast(e.response?.data?.error || 'Update failed', 'error');
    }
    setSaving(false);
  };

  if (loading) return <><TopBar title="Member Profile" /><Loader /></>;
  if (!member)  return <><TopBar title="Not Found" /><div className="page-body"><p>Member not found.</p></div></>;

  const days        = daysLeft(member.expiryDate);
  const thisMonth   = attendance.filter(a => {
    const d = new Date(a.date);
    const n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  }).length;
  const totalPaid   = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const photoUrl    = member.photo ? `/uploads/${member.photo}` : null;

  const expiryColor = days === null ? '#6a6880'
    : days <= 7  ? '#e05252'
    : days <= 30 ? '#e8a020'
    : '#4caf7d';
  const expiryDim = days === null ? 'rgba(106,104,128,0.15)'
    : days <= 7  ? 'rgba(224,82,82,0.15)'
    : days <= 30 ? 'rgba(232,160,32,0.15)'
    : 'rgba(76,175,125,0.15)';

  return (
    <>
      <TopBar title="Member Profile" />
      <div className="page-body">

        {/* Back */}
        <button className="btn btn-ghost btn-sm" style={{ marginBottom: 20 }} onClick={() => navigate('/members')}>
          ← Back to Members
        </button>

        {/* ── Hero Card ── */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>

            {/* Avatar — click to upload */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div
                style={{
                  width: 90, height: 90, borderRadius: '50%',
                  overflow: 'hidden',
                  background: photoUrl ? '#000' : 'linear-gradient(135deg,#c8a96e,#9a7a45)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 30, fontWeight: 700, color: '#0a0a0f',
                  cursor: 'pointer',
                  border: '3px solid rgba(200,169,110,0.3)',
                  transition: 'border-color 0.2s',
                  ...(avatarHover ? { borderColor: 'var(--accent)' } : {}),
                  position: 'relative',
                }}
                onClick={() => fileRef.current?.click()}
                onMouseEnter={() => setAvatarHover(true)}
                onMouseLeave={() => setAvatarHover(false)}
                title="Click to change profile photo"
              >
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={member.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover',
                      opacity: avatarHover || uploading ? 0.5 : 1, transition: 'opacity 0.2s' }}
                  />
                ) : (
                  <span style={{ opacity: avatarHover || uploading ? 0.4 : 1, transition: 'opacity 0.2s' }}>
                    {getInitials(member.name)}
                  </span>
                )}

                {/* Camera overlay */}
                {(avatarHover || uploading) && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    gap: 2,
                  }}>
                    {uploading ? (
                      <div style={{ width: 20, height: 20, border: '2px solid var(--accent)',
                        borderTopColor: 'transparent', borderRadius: '50%',
                        animation: 'spin 0.7s linear infinite' }} />
                    ) : (
                      <>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                          stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8
                            a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                          <circle cx="12" cy="13" r="4"/>
                        </svg>
                        <span style={{ fontSize: 9, color: 'var(--accent)', fontWeight: 700, letterSpacing: 0.5 }}>
                          UPLOAD
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Remove photo button */}
              {photoUrl && !uploading && (
                <button
                  onClick={handleRemovePhoto}
                  title="Remove photo"
                  style={{
                    position: 'absolute', top: -4, right: -4,
                    width: 22, height: 22, borderRadius: '50%',
                    background: 'var(--danger)', border: '2px solid var(--bg-surface)',
                    color: '#fff', fontSize: 12, lineHeight: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', fontWeight: 700,
                  }}
                >
                  ×
                </button>
              )}

              {/* Hidden file input */}
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={handlePhotoSelect}
              />
            </div>

            {/* Info */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
                <h2 style={{ fontSize: 22, fontWeight: 700 }}>{member.name}</h2>
                <Badge status={member.status} />
              </div>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-muted)' }}>
                <span>📞 {member.phone}</span>
                {member.email && <span>✉️ {member.email}</span>}
                <span>📅 Joined {fmtDate(member.joinDate)}</span>
              </div>
              {member.notes && (
                <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--text-secondary)',
                  background: 'var(--bg-elevated)', padding: '8px 12px',
                  borderRadius: 8, display: 'inline-block' }}>
                  💬 {member.notes}
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
          <div className="stat-card" style={{ '--card-accent':'#c8a96e','--card-accent-dim':'rgba(200,169,110,0.15)' }}>
            <div className="stat-icon">🏷️</div>
            <div className="stat-value" style={{ fontSize: 18 }}>{member.planId?.name || 'No Plan'}</div>
            <div className="stat-label">Current Plan</div>
            {member.planId && <div className="stat-sub">₹{member.planId.price?.toLocaleString('en-IN')} · {member.planId.durationDays}d</div>}
          </div>

          <div className="stat-card" style={{ '--card-accent': expiryColor, '--card-accent-dim': expiryDim }}>
            <div className="stat-icon">⏳</div>
            <div className="stat-value" style={{ fontSize: days !== null ? 28 : 18 }}>
              {days === null ? '—' : days < 0 ? 'Expired' : `${days}d`}
            </div>
            <div className="stat-label">Days Until Expiry</div>
            <div className="stat-sub">Expires {fmtDate(member.expiryDate)}</div>
          </div>

          <div className="stat-card" style={{ '--card-accent':'#6c8ff0','--card-accent-dim':'rgba(108,143,240,0.15)' }}>
            <div className="stat-icon">📋</div>
            <div className="stat-value">{attendance.length}</div>
            <div className="stat-label">Total Check-ins</div>
            <div className="stat-sub">{thisMonth} this month</div>
          </div>

          <div className="stat-card" style={{ '--card-accent':'#4caf7d','--card-accent-dim':'rgba(76,175,125,0.15)' }}>
            <div className="stat-icon">💰</div>
            <div className="stat-value" style={{ fontSize: 22 }}>₹{totalPaid.toLocaleString('en-IN')}</div>
            <div className="stat-label">Total Paid</div>
            <div className="stat-sub">{payments.filter(p => p.status === 'pending').length} pending</div>
          </div>
        </div>

        {/* ── Bottom: payments + attendance ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* Payment History */}
          <div className="card" style={{ padding: 0 }}>
            <div className="card-header" style={{ padding: '20px 20px 16px' }}>
              <div>
                <div className="card-title">Payment History</div>
                <div className="card-sub">{payments.length} record{payments.length !== 1 ? 's' : ''}</div>
              </div>
            </div>
            <div className="table-wrap" style={{ borderRadius: 0, border: 'none', borderTop: '1px solid var(--border)' }}>
              <table>
                <thead>
                  <tr><th>Plan</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr><td colSpan="5"><div className="empty-state" style={{ padding: 30 }}><p>No payments yet</p></div></td></tr>
                  ) : payments.map(p => (
                    <tr key={p._id}>
                      <td style={{ fontSize: 12.5 }}>{p.planId?.name || '—'}</td>
                      <td style={{ fontWeight: 600, color: 'var(--accent)', fontSize: 13 }}>₹{p.amount.toLocaleString('en-IN')}</td>
                      <td><Badge status={p.method} /></td>
                      <td><Badge status={p.status} /></td>
                      <td className="muted">{fmtDate(p.paidDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Attendance Log */}
          <div className="card" style={{ padding: 0 }}>
            <div className="card-header" style={{ padding: '20px 20px 16px' }}>
              <div>
                <div className="card-title">Attendance Log</div>
                <div className="card-sub">{thisMonth} days this month</div>
              </div>
            </div>
            <div style={{ maxHeight: 340, overflowY: 'auto', padding: '8px 16px 16px' }}>
              {attendance.length === 0 ? (
                <div className="empty-state" style={{ padding: 30 }}><p>No attendance records</p></div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 8 }}>
                  {attendance.map(a => {
                    const d = new Date(a.date + 'T00:00:00');
                    const isCurrent = d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
                    return (
                      <div key={a._id} style={{
                        padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                        background: isCurrent ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                        color: isCurrent ? 'var(--accent)' : 'var(--text-muted)',
                        border: `1px solid ${isCurrent ? 'rgba(200,169,110,0.2)' : 'var(--border-subtle)'}`,
                        whiteSpace: 'nowrap',
                      }}>
                        {d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Edit Modal ── */}
        {editModal && (
          <Modal title="Edit Member" onClose={() => setEditModal(false)}
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
                <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone *</label>
                <input className="form-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Plan</label>
                <select className="form-select" value={form.planId} onChange={e => setForm(f => ({ ...f, planId: e.target.value }))}>
                  <option value="">No plan</option>
                  {plans.map(p => <option key={p._id} value={p._id}>{p.name} — ₹{p.price}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="paused">Paused</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <input className="form-input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional…" />
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
