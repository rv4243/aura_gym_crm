import { useState, useEffect, useCallback } from 'react';
import { getAttendance, markAttendance, bulkAttendance, deleteAttendance } from '../api/attendance.js';
import { getMembers } from '../api/members.js';
import TopBar from '../components/TopBar.jsx';
import Loader from '../components/Loader.jsx';

export default function Attendance() {
  const todayStr = new Date().toISOString().split('T')[0];
  const [date,     setDate]    = useState(todayStr);
  const [members,  setMembers] = useState([]);
  const [marked,   setMarked]  = useState(new Set()); // set of memberId strings
  const [attMap,   setAttMap]  = useState({});       // memberId -> attendanceDoc._id
  const [loading,  setLoading] = useState(true);
  const [saving,   setSaving]  = useState(false);
  const [toast,    setToast]   = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mr, ar] = await Promise.all([
        getMembers({}),
        getAttendance({ date }),
      ]);
      setMembers(mr.data);
      const map = {};
      const ids = new Set();
      ar.data.forEach(a => {
        const mid = a.memberId?._id || a.memberId;
        map[mid] = a._id;
        ids.add(mid);
      });
      setAttMap(map);
      setMarked(ids);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (memberId) => {
    if (saving) return;
    setSaving(true);
    try {
      if (marked.has(memberId)) {
        // Undo
        await deleteAttendance(attMap[memberId]);
        setMarked(prev => { const n = new Set(prev); n.delete(memberId); return n; });
        setAttMap(prev => { const n = { ...prev }; delete n[memberId]; return n; });
        showToast('Attendance removed');
      } else {
        // Mark
        const r = await markAttendance({ memberId, date });
        const docId = r.data._id;
        setMarked(prev => new Set([...prev, memberId]));
        setAttMap(prev => ({ ...prev, [memberId]: docId }));
        showToast('Marked present ✓');
      }
    } catch (e) {
      showToast(e.response?.data?.error || 'Error', 'error');
    }
    setSaving(false);
  };

  const markAll = async () => {
    const unmarked = members.filter(m => !marked.has(m._id)).map(m => m._id);
    if (unmarked.length === 0) return;
    setSaving(true);
    try {
      await bulkAttendance({ memberIds: unmarked, date });
      showToast(`${unmarked.length} member(s) marked present`);
      load();
    } catch (e) {
      showToast(e.response?.data?.error || 'Partial mark done', 'info');
      load();
    }
    setSaving(false);
  };

  const pct = members.length > 0 ? Math.round((marked.size / members.length) * 100) : 0;

  return (
    <>
      <TopBar title="Attendance" />
      <div className="page-body">
        <div className="page-header">
          <div className="page-header-info">
            <h1>Attendance</h1>
            <p>Mark and track daily member check-ins</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              className="form-input"
              type="date"
              value={date}
              max={todayStr}
              onChange={e => setDate(e.target.value)}
              style={{ width: 160 }}
            />
            <button className="btn btn-secondary" onClick={markAll} disabled={saving || members.length === marked.size}>
              ✅ Mark All Present
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)', fontSize: 22 }}>{marked.size}</strong>
              <span style={{ color: 'var(--text-muted)' }}> / {members.length} members present</span>
            </span>
            <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)' }}>{pct}%</span>
          </div>
          <div className="attendance-progress">
            <div className="attendance-progress-bar" style={{ width: `${pct}%` }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Date: {new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>

        {/* Member checklist */}
        {loading ? <Loader /> : (
          <div className="card" style={{ padding: '12px 16px' }}>
            {members.length === 0 ? (
              <div className="empty-state"><h3>No members</h3><p>Add members first.</p></div>
            ) : (
              <div className="member-checklist">
                {members.map(m => {
                  const isChecked = marked.has(m._id);
                  return (
                    <div
                      key={m._id}
                      className={`member-check-item ${isChecked ? 'checked' : ''}`}
                      onClick={() => toggle(m._id)}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        onClick={e => e.stopPropagation()}
                      />
                      <div className="member-check-info">
                        <div className="member-check-name">{m.name}</div>
                        <div className="member-check-phone">{m.phone} {m.planId?.name ? `· ${m.planId.name}` : ''}</div>
                      </div>
                      {isChecked && (
                        <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>Present</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {toast && <div className="toast-container"><div className={`toast ${toast.type}`}>{toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'} {toast.msg}</div></div>}
      </div>
    </>
  );
}
