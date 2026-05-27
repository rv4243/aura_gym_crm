import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboard } from '../api/dashboard.js';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import Loader from '../components/Loader.jsx';
import TopBar from '../components/TopBar.jsx';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getDashboard()
      .then((r) => setStats(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <><TopBar title="Dashboard" /><Loader /></>;

  const formatCurrency = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

  return (
    <>
      <TopBar title="Dashboard" />
      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        
        {/* Welcome Header */}
        <div className="page-header" style={{ marginBottom: 0 }}>
          <div className="page-header-info">
            <h1>Welcome back 👋</h1>
            <p>Here's what's happening at Aura Elite Fitness today.</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={() => navigate('/attendance')}>
              📋 Mark Attendance
            </button>
            <button className="btn btn-primary" onClick={() => navigate('/members')}>
              + Add Member
            </button>
          </div>
        </div>

        {/* ── Key Metrics Cards Row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {/* Card 1: Members Summary */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8, borderLeft: '4px solid var(--accent)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px' }}>MEMBERSHIP</span>
              <span style={{ fontSize: 16 }}>👥</span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px' }}>{stats.members.total}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 8 }}>
              <span style={{ color: 'var(--success)', fontWeight: 500 }}>● {stats.members.active} Active</span>
              <span>● {stats.members.paused} Paused</span>
            </div>
          </div>

          {/* Card 2: Today's Attendance */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8, borderLeft: '4px solid var(--info)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px' }}>TODAY'S CHECK-INS</span>
              <span style={{ fontSize: 16 }}>📋</span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px' }}>{stats.attendance.today}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Active members training today
            </div>
          </div>

          {/* Card 3: Monthly Net Profit */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8, borderLeft: `4px solid ${stats.profit.thisMonth >= 0 ? 'var(--success)' : 'var(--danger)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px' }}>MONTHLY NET PROFIT</span>
              <span style={{ fontSize: 16 }}>{stats.profit.thisMonth >= 0 ? '📈' : '📉'}</span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px', color: stats.profit.thisMonth >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              {formatCurrency(stats.profit.thisMonth)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 10 }}>
              <span>Rev: <b style={{ color: 'var(--text-primary)' }}>{formatCurrency(stats.revenue.thisMonth)}</b></span>
              <span>Exp: <b style={{ color: 'var(--text-primary)' }}>{formatCurrency(stats.expenses.thisMonth)}</b></span>
            </div>
          </div>

          {/* Card 4: Pending Payments */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8, borderLeft: '4px solid var(--warning)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px' }}>PENDING DUES</span>
              <span style={{ fontSize: 16 }}>🔔</span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px', color: 'var(--warning)' }}>
              {stats.payments.pending}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Requires staff review & collections
            </div>
          </div>
        </div>

        {/* ── Analytics Section (Chart + Expenses breakdown) ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, alignItems: 'stretch' }} className="responsive-stack">
          {/* Chart Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 20 }}>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Revenue & Expenses Trend</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Historical comparison over the last 6 months</p>
            </div>
            <div style={{ height: 260, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.history} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--danger)" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="var(--danger)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" tick={{ fill: '#6a6880', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6a6880', fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: '#12121a', border: '1px solid var(--border)', borderRadius: 8, color: '#f0ede8', fontSize: 12 }}
                    formatter={(v) => [formatCurrency(v)]}
                  />
                  <Legend tick={{ fill: '#6a6880', fontSize: 11 }} verticalAlign="top" height={36} />
                  <Area type="monotone" dataKey="revenue" stroke="var(--accent)" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" name="Revenue" />
                  <Area type="monotone" dataKey="expenses" stroke="var(--danger)" strokeWidth={2} fillOpacity={1} fill="url(#colorExp)" name="Expenses" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Expense Category breakdown */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 20 }}>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Expenses by Category</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Distribution for this month</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
              {Object.keys(stats.expenses.byCategory).length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5, paddingTop: 40 }}>
                  No expenses recorded this month.
                </div>
              ) : (
                Object.entries(stats.expenses.byCategory).map(([category, amount]) => {
                  const percentage = stats.expenses.thisMonth > 0 
                    ? Math.round((amount / stats.expenses.thisMonth) * 100) 
                    : 0;
                  return (
                    <div key={category} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                        <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{category}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{formatCurrency(amount)} ({percentage}%)</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                        <div style={{ width: `${percentage}%`, height: '100%', background: 'var(--accent)' }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ── Recent Transactions & Activity Columns ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="responsive-stack">
          
          {/* Recent Payments */}
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '20px 20px 14px' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>Recent Transactions</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Latest 5 payments recorded</p>
            </div>
            <div className="table-wrap" style={{ border: 'none', borderTop: '1px solid var(--border)', borderRadius: 0 }}>
              <table style={{ fontSize: 12.5 }}>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentPayments.length === 0 ? (
                    <tr><td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>No recent payments.</td></tr>
                  ) : (
                    stats.recentPayments.map(p => (
                      <tr key={p._id}>
                        <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{p.memberId?.name || 'Deleted Member'}</td>
                        <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{formatCurrency(p.amount)}</td>
                        <td>
                          <span style={{
                            fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                            padding: '2px 8px', borderRadius: 10,
                            background: p.status === 'paid' ? 'var(--success-dim)' : 'var(--warning-dim)',
                            color: p.status === 'paid' ? 'var(--success)' : 'var(--warning)'
                          }}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Attendance */}
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '20px 20px 14px' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>Today's Check-ins</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Latest checked-in members</p>
            </div>
            <div className="table-wrap" style={{ border: 'none', borderTop: '1px solid var(--border)', borderRadius: 0 }}>
              <table style={{ fontSize: 12.5 }}>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Check-in Time</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentAttendance.length === 0 ? (
                    <tr><td colSpan="2" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>No check-ins yet today.</td></tr>
                  ) : (
                    stats.recentAttendance.map(a => {
                      const checkInTime = a.createdAt ? new Date(a.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';
                      return (
                        <tr key={a._id}>
                          <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{a.memberId?.name || 'Deleted Member'}</td>
                          <td className="muted">{checkInTime}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* ── Operational Short-links (Clean, premium cards) ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div className="card" style={{ cursor: 'pointer', padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => navigate('/members?status=expired')}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Expired Memberships</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Review & send renewals</div>
            </div>
            <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--danger)' }}>{stats.members.expired}</span>
          </div>

          <div className="card" style={{ cursor: 'pointer', padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => navigate('/payments')}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Total Dues Queue</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Review collections log</div>
            </div>
            <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--warning)' }}>{stats.payments.pending}</span>
          </div>

          <div className="card" style={{ cursor: 'pointer', padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => navigate('/expenses')}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Total Month Spending</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Manage utility & staff expenses</div>
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(stats.expenses.thisMonth)}</span>
          </div>

          <div className="card" style={{ cursor: 'pointer', padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => navigate('/trainers')}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Trainers Status</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Manage trainer staff</div>
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>{stats.trainers.active} Active</span>
          </div>
        </div>

      </div>
    </>
  );
}
