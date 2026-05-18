import { useState, useEffect, useCallback } from 'react';
import { getPayments, createPayment, updatePayment } from '../api/payments.js';
import { getMembers } from '../api/members.js';
import { getPlans } from '../api/plans.js';
import TopBar from '../components/TopBar.jsx';
import Badge from '../components/Badge.jsx';
import Modal from '../components/Modal.jsx';
import Loader from '../components/Loader.jsx';

const EMPTY = { memberId: '', planId: '', amount: '', method: 'cash', status: 'paid', notes: '' };

const STATUS_OPTIONS = ['paid', 'pending', 'overdue'];
const STATUS_META = {
  paid:    { color: 'var(--success)',  bg: 'var(--success-dim)',  label: 'Paid' },
  pending: { color: 'var(--warning)',  bg: 'var(--warning-dim)',  label: 'Pending' },
  overdue: { color: 'var(--danger)',   bg: 'var(--danger-dim)',   label: 'Overdue' },
};

// Inline status cell — shows badge normally, click → pill buttons
function StatusCell({ payment, onUpdate }) {
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = async (newStatus) => {
    if (newStatus === payment.status) { setOpen(false); return; }
    setLoading(true);
    await onUpdate(payment._id, newStatus);
    setLoading(false);
    setOpen(false);
  };

  if (loading) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
        <span style={{ width: 14, height: 14, border: '2px solid var(--accent)', borderTopColor: 'transparent',
          borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
        Saving…
      </span>
    );
  }

  if (!open) {
    return (
      <span
        className={`badge badge-${payment.status}`}
        onClick={() => setOpen(true)}
        title="Click to change status"
        style={{ cursor: 'pointer', userSelect: 'none', gap: 6 }}
      >
        <span className="badge-dot" />
        {payment.status}
        <span style={{ opacity: 0.5, fontSize: 9, marginLeft: 2 }}>▾</span>
      </span>
    );
  }

  // Expanded pill buttons
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'nowrap' }}>
      {STATUS_OPTIONS.map(s => {
        const m = STATUS_META[s];
        const isActive = payment.status === s;
        return (
          <button
            key={s}
            onClick={() => handleChange(s)}
            style={{
              padding: '3px 10px',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              border: `1px solid ${isActive ? m.color : 'var(--border)'}`,
              background: isActive ? m.bg : 'transparent',
              color: isActive ? m.color : 'var(--text-muted)',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            {m.label}
          </button>
        );
      })}
      <button
        onClick={() => setOpen(false)}
        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '2px 4px' }}
      >×</button>
    </div>
  );
}

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [members,  setMembers]  = useState([]);
  const [plans,    setPlans]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(false);
  const [form,     setForm]     = useState(EMPTY);
  const [saving,   setSaving]   = useState(false);
  const [toast,    setToast]    = useState(null);
  const [filters,  setFilters]  = useState({ status: '', month: '', year: '' });

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (filters.status) params.status = filters.status;
    if (filters.month && filters.year) { params.month = filters.month; params.year = filters.year; }
    Promise.all([getPayments(params), getMembers({}), getPlans()])
      .then(([pr, mr, plr]) => {
        setPayments(pr.data);
        setMembers(mr.data);
        setPlans(plr.data.filter(p => p.isActive));
      })
      .catch(console.error).finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  // ── Inline status update ───────────────────────────────────────────────────
  const handleStatusUpdate = async (paymentId, newStatus) => {
    try {
      await updatePayment(paymentId, { status: newStatus });
      // Optimistic update — no full reload needed
      setPayments(prev =>
        prev.map(p => p._id === paymentId ? { ...p, status: newStatus } : p)
      );
      showToast(`Status updated to ${newStatus}`);
    } catch (e) {
      showToast(e.response?.data?.error || 'Update failed', 'error');
    }
  };

  // ── New payment ────────────────────────────────────────────────────────────
  const handlePlanChange = (planId) => {
    const plan = plans.find(p => p._id === planId);
    setForm(f => ({ ...f, planId, amount: plan ? plan.price : '' }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await createPayment({ ...form, amount: Number(form.amount) });
      showToast('Payment recorded');
      setModal(false); setForm(EMPTY); load();
    } catch (e) {
      showToast(e.response?.data?.error || 'Error recording payment', 'error');
    }
    setSaving(false);
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  const now = new Date();
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <>
      <TopBar title="Payments" />
      <div className="page-body">
        <div className="page-header">
          <div className="page-header-info">
            <h1>Payments</h1>
            <p>{payments.length} record{payments.length !== 1 ? 's' : ''}</p>
          </div>
          <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setModal(true); }}>+ Record Payment</button>
        </div>



        {/* Filters */}
        <div className="filter-bar">
          <select className="filter-select" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
            <option value="">All Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
          </select>
          <select className="filter-select" value={filters.month} onChange={e => setFilters(f => ({ ...f, month: e.target.value, year: String(now.getFullYear()) }))}>
            <option value="">All Months</option>
            {months.map((m, i) => <option key={m} value={String(i + 1)}>{m} {now.getFullYear()}</option>)}
          </select>
          {(filters.month || filters.status) && (
            <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ status: '', month: '', year: '' })}>Clear filters</button>
          )}
        </div>

        {/* Table */}
        {loading ? <Loader /> : (
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Plan</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr><td colSpan="7">
                      <div className="empty-state"><h3>No payments yet</h3><p>Record your first payment above.</p></div>
                    </td></tr>
                  ) : payments.map(p => (
                    <tr key={p._id}>
                      <td style={{ fontWeight: 500 }}>{p.memberId?.name || '—'}</td>
                      <td className="muted">{p.planId?.name || '—'}</td>
                      <td style={{ fontWeight: 600, color: 'var(--accent)' }}>₹{p.amount.toLocaleString('en-IN')}</td>
                      <td><Badge status={p.method} /></td>
                      {/* ── Inline status updater ── */}
                      <td>
                        <StatusCell payment={p} onUpdate={handleStatusUpdate} />
                      </td>
                      <td className="muted">{fmtDate(p.paidDate)}</td>
                      <td className="muted" style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Record Payment Modal */}
        {modal && (
          <Modal title="Record Payment" onClose={() => setModal(false)}
            footer={<>
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.memberId || !form.planId}>
                {saving ? 'Saving…' : 'Record Payment'}
              </button>
            </>}
          >
            <div className="form-group">
              <label className="form-label">Member *</label>
              <select className="form-select" value={form.memberId} onChange={e => setForm(f => ({ ...f, memberId: e.target.value }))}>
                <option value="">Select member…</option>
                {members.map(m => <option key={m._id} value={m._id}>{m.name} — {m.phone}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Plan *</label>
              <select className="form-select" value={form.planId} onChange={e => handlePlanChange(e.target.value)}>
                <option value="">Select plan…</option>
                {plans.map(p => <option key={p._id} value={p._id}>{p.name} — ₹{p.price}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Amount (₹) *</label>
                <input className="form-input" type="number" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="Auto-filled from plan" />
              </div>
              <div className="form-group">
                <label className="form-label">Payment Method *</label>
                <select className="form-select" value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))}>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <input className="form-input" value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional…" />
              </div>
            </div>
          </Modal>
        )}

        {toast && <div className="toast-container"><div className={`toast ${toast.type}`}>{toast.type === 'success' ? '✅' : '❌'} {toast.msg}</div></div>}
      </div>
    </>
  );
}
