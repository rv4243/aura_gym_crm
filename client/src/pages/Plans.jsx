import { useState, useEffect, useCallback } from 'react';
import { getPlans, createPlan, updatePlan, deletePlan } from '../api/plans.js';
import TopBar from '../components/TopBar.jsx';
import Modal from '../components/Modal.jsx';
import Badge from '../components/Badge.jsx';
import Loader from '../components/Loader.jsx';

const EMPTY = { name: '', durationDays: '', price: '', description: '' };

export default function Plans() {
  const [plans,  setPlans]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,  setModal]  = useState(null);
  const [selected, setSelected] = useState(null);
  const [form,   setForm]   = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [toast,  setToast]  = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(() => {
    setLoading(true);
    getPlans().then((r) => setPlans(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setForm(EMPTY); setModal('add'); };
  const openEdit = (p) => {
    setSelected(p);
    setForm({ name: p.name, durationDays: p.durationDays, price: p.price, description: p.description || '' });
    setModal('edit');
  };
  const closeModal = () => { setModal(null); setSelected(null); };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = { ...form, durationDays: Number(form.durationDays), price: Number(form.price) };
      if (modal === 'add') { await createPlan(data); showToast('Plan created'); }
      else { await updatePlan(selected._id, data); showToast('Plan updated'); }
      closeModal(); load();
    } catch (e) {
      showToast(e.response?.data?.error || 'Error saving plan', 'error');
    }
    setSaving(false);
  };

  const toggleActive = async (p) => {
    try {
      if (p.isActive) { await deletePlan(p._id); showToast('Plan deactivated'); }
      else { await updatePlan(p._id, { isActive: true }); showToast('Plan activated'); }
      load();
    } catch { showToast('Failed to toggle plan', 'error'); }
  };

  return (
    <>
      <TopBar title="Plans" />
      <div className="page-body">
        <div className="page-header">
          <div className="page-header-info">
            <h1>Membership Plans</h1>
            <p>{plans.filter(p => p.isActive).length} active plans</p>
          </div>
          <button className="btn btn-primary" onClick={openAdd}>+ New Plan</button>
        </div>

        {loading ? <Loader /> : (
          <div className="plans-grid">
            {plans.length === 0 && <div className="empty-state"><h3>No plans yet</h3><p>Create your first membership plan.</p></div>}
            {plans.map((p) => (
              <div key={p._id} className={`plan-card ${p.isActive ? '' : 'inactive'}`}>
                <div className="plan-badge"><Badge status={p.isActive ? 'active' : 'paused'} /></div>
                <div className="plan-name">{p.name}</div>
                <div className="plan-price">₹{p.price.toLocaleString('en-IN')}<span>/plan</span></div>
                <div className="plan-duration">⏱ {p.durationDays} days</div>
                <div className="plan-desc">{p.description || 'No description added.'}</div>
                <div className="plan-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}>✏️ Edit</button>
                  <button className={`btn btn-sm ${p.isActive ? 'btn-danger' : 'btn-ghost'}`} onClick={() => toggleActive(p)}>
                    {p.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {(modal === 'add' || modal === 'edit') && (
          <Modal title={modal === 'add' ? 'Create New Plan' : 'Edit Plan'} onClose={closeModal}
            footer={<>
              <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : modal === 'add' ? 'Create Plan' : 'Save Changes'}
              </button>
            </>}
          >
            <div className="form-group">
              <label className="form-label">Plan Name *</label>
              <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Monthly, Quarterly…" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Duration (days) *</label>
                <input className="form-input" type="number" value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })} placeholder="30" />
              </div>
              <div className="form-group">
                <label className="form-label">Price (₹) *</label>
                <input className="form-input" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="1500" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input className="form-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description…" />
            </div>
          </Modal>
        )}
        {toast && <div className="toast-container"><div className={`toast ${toast.type}`}>{toast.type === 'success' ? '✅' : '❌'} {toast.msg}</div></div>}
      </div>
    </>
  );
}
