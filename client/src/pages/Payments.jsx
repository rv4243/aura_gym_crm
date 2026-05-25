import { useState, useEffect, useCallback } from 'react';
import { getPayments, createPayment, updatePayment } from '../api/payments.js';
import { getMembers } from '../api/members.js';
import { getPlans } from '../api/plans.js';
import TopBar from '../components/TopBar.jsx';
import Badge from '../components/Badge.jsx';
import Modal from '../components/Modal.jsx';
import Loader from '../components/Loader.jsx';

const EMPTY = { memberId: '', planId: '', amount: '', method: 'cash', status: 'paid', notes: '' };
const RENEW_EMPTY = { memberId: '', planId: '', amount: '', method: 'cash', status: 'paid', notes: '' };

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

  // ── Renewal state ──────────────────────────────────────────────────────────
  const [renewModal,   setRenewModal]   = useState(false);
  const [renewForm,    setRenewForm]    = useState(RENEW_EMPTY);
  const [renewMember,  setRenewMember]  = useState(null);  // full member object for display
  const [renewSaving,  setRenewSaving]  = useState(false);
  const [planChanged,  setPlanChanged]  = useState(false); // whether user picked a different plan

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

  // ── Renewal ────────────────────────────────────────────────────────────────
  const openRenewModal = (payment) => {
    // Find the full member record to show expiry info
    const member = members.find(m => m._id === payment.memberId?._id);
    setRenewMember(member || payment.memberId);

    const currentPlanId = payment.planId?._id || '';
    const currentPlan   = plans.find(p => p._id === currentPlanId);

    setRenewForm({
      memberId: payment.memberId?._id || '',
      planId:   currentPlanId,
      amount:   currentPlan ? currentPlan.price : '',
      method:   'cash',
      status:   'paid',
      notes:    '',
    });
    setPlanChanged(false);
    setRenewModal(true);
  };

  const handleRenewPlanChange = (planId) => {
    const originalPlanId = renewMember?.planId?._id || renewMember?.planId || '';
    const plan = plans.find(p => p._id === planId);
    setPlanChanged(planId !== originalPlanId);
    setRenewForm(f => ({ ...f, planId, amount: plan ? plan.price : '' }));
  };

  const handleRenewSave = async () => {
    setRenewSaving(true);
    try {
      const autoNote = planChanged ? 'Plan upgraded/changed during renewal' : 'Membership renewed';
      const notes    = renewForm.notes ? `${autoNote} — ${renewForm.notes}` : autoNote;
      await createPayment({ ...renewForm, amount: Number(renewForm.amount), notes });
      showToast('Membership renewed successfully 🎉');
      setRenewModal(false);
      setRenewForm(RENEW_EMPTY);
      setRenewMember(null);
      load();
    } catch (e) {
      showToast(e.response?.data?.error || 'Renewal failed', 'error');
    }
    setRenewSaving(false);
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const isExpired = (d) => d && new Date(d) < new Date();

  const now = new Date();
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // Compute new expiry preview for renewal modal
  const renewSelectedPlan = plans.find(p => p._id === renewForm.planId);
  const renewCurrentExpiry = renewMember?.expiryDate ? new Date(renewMember.expiryDate) : null;
  const renewBase = renewCurrentExpiry && renewCurrentExpiry > now ? renewCurrentExpiry : now;
  const renewNewExpiry = renewSelectedPlan
    ? (() => { const d = new Date(renewBase); d.setDate(d.getDate() + renewSelectedPlan.durationDays); return d; })()
    : null;

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
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr><td colSpan="8">
                      <div className="empty-state"><h3>No payments yet</h3><p>Record your first payment above.</p></div>
                    </td></tr>
                  ) : payments.map(p => (
                    <tr key={p._id}>
                      <td style={{ fontWeight: 500 }}>{p.memberId?.name || '—'}</td>
                      <td className="muted">{p.planId?.name || '—'}</td>
                      <td style={{ fontWeight: 600, color: 'var(--accent)' }}>₹{p.amount.toLocaleString('en-IN')}</td>
                      <td><Badge status={p.method} /></td>
                      <td>
                        <StatusCell payment={p} onUpdate={handleStatusUpdate} />
                      </td>
                      <td className="muted">{fmtDate(p.paidDate)}</td>
                      <td className="muted" style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.notes || '—'}
                      </td>
                      <td>
                        {/* ── Renew Button ── */}
                        <button
                          className="btn btn-ghost btn-sm"
                          title="Renew membership for this member"
                          onClick={() => openRenewModal(p)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            fontSize: 11, padding: '4px 10px',
                            color: 'var(--accent)', borderColor: 'rgba(200,169,110,0.35)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          🔄 Renew
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Record Payment Modal ─────────────────────────────────────────── */}
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

        {/* ── Renewal Modal ────────────────────────────────────────────────── */}
        {renewModal && (
          <Modal
            title="🔄 Renew Membership"
            onClose={() => { setRenewModal(false); setRenewMember(null); }}
            footer={<>
              <button className="btn btn-ghost" onClick={() => { setRenewModal(false); setRenewMember(null); }}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleRenewSave}
                disabled={renewSaving || !renewForm.memberId || !renewForm.planId}
              >
                {renewSaving ? 'Processing…' : planChanged ? 'Renew & Change Plan' : 'Renew Same Plan'}
              </button>
            </>}
          >
            {/* Member info banner */}
            {renewMember && (
              <div style={{
                background: 'rgba(200,169,110,0.07)',
                border: '1px solid rgba(200,169,110,0.2)',
                borderRadius: 8,
                padding: '14px 18px',
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}>
                {/* Avatar */}
                <div style={{
                  width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                  background: renewMember.photo ? '#000' : 'linear-gradient(135deg,#c8a96e,#9a7a45)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700, color: '#0a0a0f',
                  border: '2px solid rgba(200,169,110,0.3)',
                  overflow: 'hidden',
                }}>
                  {renewMember.photo
                    ? <img src={`/uploads/${renewMember.photo}`} alt={renewMember.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (renewMember.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2))
                  }
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{renewMember.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    Current plan: <strong style={{ color: 'var(--text-primary)' }}>{renewMember.planId?.name || '—'}</strong>
                    &nbsp;·&nbsp;
                    Expires: <strong style={{
                      color: isExpired(renewMember.expiryDate) ? 'var(--danger)' : 'var(--text-primary)'
                    }}>
                      {fmtDate(renewMember.expiryDate)}
                      {isExpired(renewMember.expiryDate) && ' ⚠️ Expired'}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Plan selector */}
            <div className="form-group">
              <label className="form-label">
                Select Plan *
                {planChanged && (
                  <span style={{
                    marginLeft: 8, fontSize: 10, fontWeight: 700,
                    color: 'var(--warning)', background: 'var(--warning-dim)',
                    padding: '2px 8px', borderRadius: 10, letterSpacing: 0.5,
                  }}>
                    PLAN CHANGE
                  </span>
                )}
              </label>
              <select
                className="form-select"
                value={renewForm.planId}
                onChange={e => handleRenewPlanChange(e.target.value)}
              >
                <option value="">Select plan…</option>
                {plans.map(p => (
                  <option key={p._id} value={p._id}>
                    {p.name} — ₹{p.price} / {p.durationDays}d
                    {p._id === (renewMember?.planId?._id || renewMember?.planId) ? ' (current)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* New expiry preview */}
            {renewNewExpiry && (
              <div style={{
                background: 'rgba(80,200,120,0.07)',
                border: '1px solid rgba(80,200,120,0.2)',
                borderRadius: 6,
                padding: '10px 14px',
                marginBottom: 16,
                fontSize: 12,
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <span style={{ fontSize: 16 }}>📅</span>
                <span>
                  New expiry will be&nbsp;
                  <strong style={{ color: 'var(--success)' }}>
                    {fmtDate(renewNewExpiry)}
                  </strong>
                  &nbsp;({renewSelectedPlan?.durationDays} days{renewCurrentExpiry && renewCurrentExpiry > now ? ' added from current expiry' : ' from today'})
                </span>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Amount (₹) *</label>
                <input
                  className="form-input"
                  type="number"
                  value={renewForm.amount}
                  onChange={e => setRenewForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="Auto-filled from plan"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Payment Method *</label>
                <select
                  className="form-select"
                  value={renewForm.method}
                  onChange={e => setRenewForm(f => ({ ...f, method: e.target.value }))}
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Payment Status</label>
                <select
                  className="form-select"
                  value={renewForm.status}
                  onChange={e => setRenewForm(f => ({ ...f, status: e.target.value }))}
                >
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <input
                  className="form-input"
                  value={renewForm.notes}
                  onChange={e => setRenewForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional notes…"
                />
              </div>
            </div>
          </Modal>
        )}

        {toast && <div className="toast-container"><div className={`toast ${toast.type}`}>{toast.type === 'success' ? '✅' : '❌'} {toast.msg}</div></div>}
      </div>
    </>
  );
}
