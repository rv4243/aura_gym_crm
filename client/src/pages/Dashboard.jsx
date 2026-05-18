import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboard } from '../api/dashboard.js';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import Loader from '../components/Loader.jsx';
import TopBar from '../components/TopBar.jsx';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Build last-6-months labels for the chart x-axis
function last6Months() {
  const result = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({ month: MONTHS[d.getMonth()], year: d.getFullYear(), amount: 0 });
  }
  return result;
}

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

  const chartData = last6Months();
  // Inject current month's real revenue into the last bar
  if (stats && chartData.length > 0) {
    chartData[chartData.length - 1].amount = stats.revenue.thisMonth;
  }

  const cards = [
    {
      label: 'Total Members',
      value: stats?.members.total ?? 0,
      icon: '👥',
      accent: '#c8a96e',
      accentDim: 'rgba(200,169,110,0.15)',
      sub: `${stats?.members.active ?? 0} active`,
    },
    {
      label: 'Active Members',
      value: stats?.members.active ?? 0,
      icon: '✅',
      accent: '#4caf7d',
      accentDim: 'rgba(76,175,125,0.15)',
      sub: `${stats?.members.paused ?? 0} paused`,
    },
    {
      label: 'Expiring This Week',
      value: stats?.members.expiringThisWeek ?? 0,
      icon: '⚠️',
      accent: '#e8a020',
      accentDim: 'rgba(232,160,32,0.15)',
      sub: 'Need renewal',
    },
    {
      label: 'Today\'s Attendance',
      value: stats?.attendance.today ?? 0,
      icon: '📋',
      accent: '#6c8ff0',
      accentDim: 'rgba(108,143,240,0.15)',
      sub: 'Members checked in',
    },
    {
      label: 'Monthly Revenue',
      value: `₹${(stats?.revenue.thisMonth ?? 0).toLocaleString('en-IN')}`,
      icon: '💰',
      accent: '#c8a96e',
      accentDim: 'rgba(200,169,110,0.15)',
      sub: 'This month (paid)',
    },
    {
      label: 'Pending Payments',
      value: stats?.payments.pending ?? 0,
      icon: '🔔',
      accent: '#e05252',
      accentDim: 'rgba(224,82,82,0.15)',
      sub: 'Pending or overdue',
    },
  ];

  return (
    <>
      <TopBar title="Dashboard" />
      <div className="page-body">
        <div className="page-header">
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

        {/* Stat Cards */}
        <div className="stats-grid">
          {cards.map((c) => (
            <div
              key={c.label}
              className="stat-card"
              style={{ '--card-accent': c.accent, '--card-accent-dim': c.accentDim }}
            >
              <div className="stat-icon" style={{ fontSize: 18 }}>{c.icon}</div>
              <div className="stat-value">{c.value}</div>
              <div className="stat-label">{c.label}</div>
              <div className="stat-sub">{c.sub}</div>
            </div>
          ))}
        </div>

        {/* Revenue Chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Revenue Overview</div>
              <div className="card-sub">Last 6 months (current month = real data)</div>
            </div>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: '#6a6880', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6a6880', fontSize: 12 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: '#18182a', border: '1px solid rgba(200,169,110,0.2)', borderRadius: 8, color: '#f0ede8' }}
                  formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']}
                />
                <Bar dataKey="amount" fill="#c8a96e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Links */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
          <div className="card" style={{ cursor: 'pointer' }} onClick={() => navigate('/members?status=expired')}>
            <div className="card-header" style={{ marginBottom: 0 }}>
              <div>
                <div className="card-title">Expired Members</div>
                <div className="card-sub">Tap to view & send renewals</div>
              </div>
              <span style={{ fontSize: 28, fontWeight: 700, color: '#e05252' }}>
                {stats?.members.expired ?? 0}
              </span>
            </div>
          </div>
          <div className="card" style={{ cursor: 'pointer' }} onClick={() => navigate('/payments')}>
            <div className="card-header" style={{ marginBottom: 0 }}>
              <div>
                <div className="card-title">Pending Dues</div>
                <div className="card-sub">Tap to review payments</div>
              </div>
              <span style={{ fontSize: 28, fontWeight: 700, color: '#e8a020' }}>
                {stats?.payments.pending ?? 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
