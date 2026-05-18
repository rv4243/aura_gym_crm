import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMembers, createMember, updateMember, deleteMember } from '../api/members.js';
import { getPlans } from '../api/plans.js';
import TopBar from '../components/TopBar.jsx';
import Badge from '../components/Badge.jsx';
import Modal from '../components/Modal.jsx';
import Loader from '../components/Loader.jsx';

const EMPTY = { name: '', phone: '', email: '', planId: '', joinDate: '', notes: '', status: 'active' };

export default function Members() {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [plans,   setPlans]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [status,  setStatus]  = useState('');
  const [modal,   setModal]   = useState(null); // null | 'add' | 'edit' | 'delete'
  const [selected, setSelected] = useState(null);
  const [form, setForm]   = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      getMembers({ search, status }),
      getPlans(),
    ]).then(([mr, pr]) => {
      setMembers(mr.data);
      setPlans(pr.data.filter((p) => p.isActive));
    }).catch(console.error).finally(() => setLoading(false));
  }, [search, status]);

  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setForm(EMPTY); setModal('add'); };
  const openEdit = (m) => {
    setSelected(m);
    setForm({
      name:    m.name,
      phone:   m.phone,
      email:   m.email || '',
      planId:  m.planId?._id || '',
      joinDate: m.joinDate ? m.joinDate.split('T')[0] : '',
      notes:   m.notes || '',
      status:  m.status,
    });
    setModal('edit');
  };
  const openDelete = (m) => { setSelected(m); setModal('delete'); };
  const closeModal = () => { setModal(null); setSelected(null); };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (modal === 'add') {
        await createMember(form);
        showToast('Member added successfully');
      } else {
        await updateMember(selected._id, form);
        showToast('Member updated');
      }
      closeModal();
      load();
    } catch (e) {
      showToast(e.response?.data?.error || 'Something went wrong', 'error');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await deleteMember(selected._id);
      showToast('Member removed');
      closeModal();
      load();
    } catch (e) {
      showToast('Delete failed', 'error');
    }
    setSaving(false);
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '—';
  const isExpired = (d) => d && new Date(d) < new Date();

  return (
    <>
      <TopBar title="Members" />
      <div className="page-body">
        <div className="page-header">
          <div className="page-header-info">
            <h1>Members</h1>
            <p>{members.length} member{members.length !== 1 ? 's' : ''} found</p>
          </div>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Member</button>
        </div>

        {/* Filter bar */}
        <div className="filter-bar">
          <div className="search-wrap">
            <span className="search-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </span>
            <input
              className="form-input"
              placeholder="Search name, phone, email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="filter-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="paused">Paused</option>
          </select>
        </div>

        {/* Table */}
        {loading ? <Loader /> : (
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Phone</th>
                    <th>Plan</th>
                    <th>Joined</th>
                    <th>Expiry</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.length === 0 ? (
                    <tr><td colSpan="7">
                      <div className="empty-state">
                        <h3>No members found</h3>
                        <p>Add your first member to get started.</p>
                      </div>
                    </td></tr>
                  ) : members.map((m) => (
                    <tr key={m._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {/* Thumbnail avatar */}
                          <div style={{
                            width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                            overflow: 'hidden',
                            background: m.photo ? '#000' : 'linear-gradient(135deg,#c8a96e,#9a7a45)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 700, color: '#0a0a0f',
                            border: '2px solid rgba(200,169,110,0.2)',
                          }}>
                            {m.photo
                              ? <img src={`/uploads/${m.photo}`} alt={m.name}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : (m.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2))
                            }
                          </div>
                          <div>
                            <div style={{ fontWeight: 500 }}>{m.name}</div>
                            {m.email && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{m.email}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="muted">{m.phone}</td>
                      <td>{m.planId?.name || <span style={{ color: 'var(--text-muted)' }}>No plan</span>}</td>
                      <td className="muted">{fmtDate(m.joinDate)}</td>
                      <td>
                        <span style={{ color: isExpired(m.expiryDate) ? 'var(--danger)' : 'var(--text-primary)', fontSize: 13 }}>
                          {fmtDate(m.expiryDate)}
                        </span>
                      </td>
                      <td><Badge status={m.status} /></td>
                      <td>
                        <div className="table-actions">
                          <button className="btn-icon" title="View Profile" onClick={() => navigate(`/members/${m._id}`)}
                            style={{ color: 'var(--accent)' }}>
                            👁️
                          </button>
                          <button className="btn-icon" title="Edit" onClick={() => openEdit(m)}>
                            ✏️
                          </button>
                          <button className="btn-icon" title="Delete" onClick={() => openDelete(m)} style={{ color: 'var(--danger)' }}>
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add / Edit Modal */}
        {(modal === 'add' || modal === 'edit') && (
          <Modal
            title={modal === 'add' ? 'Add New Member' : 'Edit Member'}
            onClose={closeModal}
            footer={
              <>
                <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : modal === 'add' ? 'Add Member' : 'Save Changes'}
                </button>
              </>
            }
          >
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Rahul Sharma" />
              </div>
              <div className="form-group">
                <label className="form-label">Phone *</label>
                <input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="9876543210" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="rahul@example.com" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Membership Plan</label>
                <select className="form-select" value={form.planId} onChange={(e) => setForm({ ...form, planId: e.target.value })}>
                  <option value="">No plan</option>
                  {plans.map((p) => <option key={p._id} value={p._id}>{p.name} — ₹{p.price}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Join Date</label>
                <input className="form-input" type="date" value={form.joinDate} onChange={(e) => setForm({ ...form, joinDate: e.target.value })} />
              </div>
            </div>
            {modal === 'edit' && (
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="paused">Paused</option>
                </select>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Notes</label>
              <input className="form-input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes…" />
            </div>
          </Modal>
        )}

        {/* Delete Confirm */}
        {modal === 'delete' && (
          <Modal
            title="Confirm Delete"
            onClose={closeModal}
            size="confirm-modal"
            footer={
              <>
                <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
                <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>
                  {saving ? 'Deleting…' : 'Delete Member'}
                </button>
              </>
            }
          >
            <div style={{ textAlign: 'center' }}>
              <div className="confirm-icon">🗑️</div>
              <h3>Delete {selected?.name}?</h3>
              <p>This will permanently remove all their data. This cannot be undone.</p>
            </div>
          </Modal>
        )}

        {/* Toast */}
        {toast && (
          <div className="toast-container">
            <div className={`toast ${toast.type}`}>{toast.type === 'success' ? '✅' : '❌'} {toast.msg}</div>
          </div>
        )}
      </div>
    </>
  );
}
