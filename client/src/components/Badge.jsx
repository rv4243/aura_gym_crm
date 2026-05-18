export default function Badge({ status }) {
  const map = {
    active:  'badge-active',
    expired: 'badge-expired',
    paused:  'badge-paused',
    paid:    'badge-paid',
    pending: 'badge-pending',
    overdue: 'badge-overdue',
    cash:    'badge-cash',
    upi:     'badge-upi',
    card:    'badge-card',
  };
  const cls = map[status] || 'badge-paused';
  return (
    <span className={`badge ${cls}`}>
      <span className="badge-dot" />
      {status}
    </span>
  );
}
