import { useState, useEffect, useCallback } from 'react';
import { getExpenses, createExpense, updateExpense, deleteExpense } from '../api/expenses.js';
import TopBar from '../components/TopBar.jsx';
import Modal  from '../components/Modal.jsx';
import Loader from '../components/Loader.jsx';

const CATEGORIES = ['rent', 'salary', 'equipment', 'utilities', 'maintenance', 'marketing', 'other'];

const CAT_META = {
  rent:        { color: '#e07b54', bg: 'rgba(224,123,84,0.12)',  icon: '🏢' },
  salary:      { color: '#c8a96e', bg: 'rgba(200,169,110,0.12)', icon: '💼' },
  equipment:   { color: '#6eb5c8', bg: 'rgba(110,181,200,0.12)', icon: '🏋️' },
  utilities:   { color: '#8fc86e', bg: 'rgba(143,200,110,0.12)', icon: '💡' },
  maintenance: { color: '#c86e8f', bg: 'rgba(200,110,143,0.12)', icon: '🔧' },
  marketing:   { color: '#9b6ec8', bg: 'rgba(155,110,200,0.12)', icon: '📢' },
  other:       { color: '#888',    bg: 'rgba(136,136,136,0.10)', icon: '📦' },
};

const EMPTY = { title: '', amount: '', category: 'other', date: '', paidTo: '', method: 'cash', notes: '' };

const fmtINR  = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const todayISO = () => new Date().toISOString().split('T')[0];

function CategoryBadge({ category }) {
  const m = CAT_META[category] || CAT_META.other;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: m.bg, color: m.color, border: `1px solid ${m.color}33`,
      textTransform: 'capitalize',
    }}>
      {m.icon} {category}
    </span>
  );
}

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filters,  setFilters]  = useState({ category: '', month: '', year: '' });
  const [modal,    setModal]    = useState(null); // null | 'add' | 'edit' | 'delete'
  const [selected, setSelected] = useState(null);
  const [form,     setForm]     = useState(EMPTY);
  const [saving,   setSaving]   = useState(false);
  const [toast,    setToast]    = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (filters.category) params.category = filters.category;
    if (filters.month && filters.year) { params.month = filters.month; params.year = filters.year; }
    getExpenses(params)
      .then(r => setExpenses(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const now = new Date();
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const openAdd = () => {
    setForm({ ...EMPTY, date: todayISO() });
    setModal('add');
  };
  const openEdit = (e) => {
    setSelected(e);
    setForm({
      title:    e.title,
      amount:   e.amount,
      category: e.category,
      date:     e.date ? e.date.split('T')[0] : '',
      paidTo:   e.paidTo || '',
      method:   e.method || 'cash',
      notes:    e.notes || '',
    });
    setModal('edit');
  };
  const openDelete = (e) => { setSelected(e); setModal('delete'); };
  const closeModal  = () => { setModal(null); setSelected(null); };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (modal === 'add') {
        await createExpense({ ...form, amount: Number(form.amount) });
        showToast('Expense recorded');
      } else {
        await updateExpense(selected._id, { ...form, amount: Number(form.amount) });
        showToast('Expense updated');
      }
      closeModal(); load();
    } catch (e) {
      showToast(e.response?.data?.error || 'Error saving expense', 'error');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await deleteExpense(selected._id);
      showToast('Expense deleted');
      closeModal(); load();
    } catch (e) {
      showToast('Delete failed', 'error');
    }
    setSaving(false);
  };

  // Summary stats
  const totalShown = expenses.reduce((s, e) => s + e.amount, 0);
  const byCategory = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0);
    return acc;
  }, {});

  return (
    <>
      <TopBar title="Expenses" />
      <div className="page-body">

        {/* Header */}
        <div className="page-header">
          <div className="page-header-info">
            <h1>Expenses</h1>
            <p>{expenses.length} record{expenses.length !== 1 ? 's' : ''} · Total: <strong style={{ color: 'var(--danger)' }}>{fmtINR(totalShown)}</strong></p>
          </div>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Expense</button>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          {CATEGORIES.filter(c => byCategory[c] > 0).map(cat => {
            const m = CAT_META[cat];
            return (
              <div key={cat} style={{
                background: 'var(--surface)', border: `1px solid ${m.color}33`,
                borderRadius: 10, padding: '12px 18px', minWidth: 130,
                display: 'flex', flexDirection: 'column', gap: 4,
              }}>
                <div style={{ fontSize: 11, color: m.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {m.icon} {cat}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {fmtINR(byCategory[cat])}
                </div>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="filter-bar">
          <select className="filter-select" value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
          <select className="filter-select" value={filters.month}
            onChange={e => setFilters(f => ({ ...f, month: e.target.value, year: String(now.getFullYear()) }))}>
            <option value="">All Months</option>
            {months.map((m, i) => <option key={m} value={String(i + 1)}>{m} {now.getFullYear()}</option>)}
          </select>
          {(filters.category || filters.month) && (
            <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ category: '', month: '', year: '' })}>
              Clear filters
            </button>
          )}
        </div>

        {/* Table */}
        {loading ? <Loader /> : (
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Paid To</th>
                    <th>Method</th>
                    <th>Date</th>
                    <th>Notes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.length === 0 ? (
                    <tr><td colSpan="8">
                      <div className="empty-state">
                        <h3>No expenses yet</h3>
                        <p>Start tracking your gym expenses above.</p>
                      </div>
                    </td></tr>
                  ) : expenses.map(exp => (
                    <tr key={exp._id}>
                      <td style={{ fontWeight: 500 }}>{exp.title}</td>
                      <td><CategoryBadge category={exp.category} /></td>
                      <td style={{ fontWeight: 700, color: 'var(--danger)', fontSize: 13 }}>
                        {fmtINR(exp.amount)}
                      </td>
                      <td className="muted">{exp.paidTo || '—'}</td>
                      <td>
                        <span style={{
                          fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5,
                          color: 'var(--text-muted)',
                        }}>{exp.method}</span>
                      </td>
                      <td className="muted">{fmtDate(exp.date)}</td>
                      <td className="muted" style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {exp.notes || '—'}
                      </td>
                      <td>
                        <div className="table-actions">
                          <button className="btn-icon" title="Edit" onClick={() => openEdit(exp)}>✏️</button>
                          <button className="btn-icon" title="Delete" onClick={() => openDelete(exp)} style={{ color: 'var(--danger)' }}>🗑️</button>
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
            title={modal === 'add' ? 'Add Expense' : 'Edit Expense'}
            onClose={closeModal}
            footer={<>
              <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.title || !form.amount}>
                {saving ? 'Saving…' : modal === 'add' ? 'Add Expense' : 'Save Changes'}
              </button>
            </>}
          >
            <div className="form-row">
              <div className="form-group" style={{ flex: 2 }}>
                <label className="form-label">Title *</label>
                <input className="form-input" value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Monthly rent" />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Amount (₹) *</label>
                <input className="form-input" type="number" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{CAT_META[c].icon} {c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input className="form-input" type="date" value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Paid To</label>
                <input className="form-input" value={form.paidTo}
                  onChange={e => setForm(f => ({ ...f, paidTo: e.target.value }))}
                  placeholder="Vendor / person name" />
              </div>
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select className="form-select" value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))}>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
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
          <Modal title="Confirm Delete" onClose={closeModal} size="confirm-modal"
            footer={<>
              <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>
                {saving ? 'Deleting…' : 'Delete'}
              </button>
            </>}
          >
            <div style={{ textAlign: 'center' }}>
              <div className="confirm-icon">🗑️</div>
              <h3>Delete "{selected?.title}"?</h3>
              <p>This expense record will be permanently removed.</p>
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
