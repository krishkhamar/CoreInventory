import { useEffect, useState } from 'react';
import api from '../services/api';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(r => { setData(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex-center" style={{ height: '50vh' }}><span className="text-muted">Loading dashboard...</span></div>;
  if (!data) return <div className="empty-state"><div className="empty-icon">📊</div><h3>Unable to load dashboard</h3></div>;

  const kpis = [
    { icon: '📦', label: 'Total Products', value: data.totalProducts, color: '#818cf8' },
    { icon: '⚠️', label: 'Low Stock Items', value: data.lowStock, color: '#fbbf24' },
    { icon: '🚫', label: 'Out of Stock', value: data.outOfStock, color: '#f87171' },
    { icon: '📥', label: 'Pending Receipts', value: data.pendingReceipts, color: '#60a5fa' },
    { icon: '📤', label: 'Pending Deliveries', value: data.pendingDeliveries, color: '#f87171' },
    { icon: '🔄', label: 'Scheduled Transfers', value: data.scheduledTransfers, color: '#34d399' },
  ];

  return (
    <div className="fade-in">
      <div className="page-header"><h1>Dashboard</h1></div>

      <div className="card-grid" style={{ marginBottom: '24px' }}>
        {kpis.map((kpi, i) => (
          <div className="kpi-card" key={i}>
            <div className="kpi-icon" style={{ background: kpi.color + '15', color: kpi.color, fontSize: '1.3rem' }}>
              {kpi.icon}
            </div>
            <div className="kpi-value">{kpi.value}</div>
            <div className="kpi-label">{kpi.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Low Stock Alerts */}
        <div className="card">
          <h3 style={{ marginBottom: '16px', fontSize: '1rem' }}>⚠️ Low Stock Alerts</h3>
          {data.lowStockItems && data.lowStockItems.length > 0 ? (
            <div>
              {data.lowStockItems.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span>{item.name}</span>
                  <span className="badge badge-low">{item.total_stock} / {item.reorder_point}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted text-sm">No low stock alerts ✓</p>
          )}
        </div>

        {/* Recent Activity */}
        <div className="card">
          <h3 style={{ marginBottom: '16px', fontSize: '1rem' }}>📋 Recent Activity</h3>
          {data.recentActivity && data.recentActivity.length > 0 ? (
            <div>
              {data.recentActivity.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <span className={`badge badge-${item.type}`} style={{ marginRight: '8px' }}>{item.type}</span>
                    <span className="text-sm">{item.product_name}</span>
                  </div>
                  <span style={{ fontWeight: 600, color: item.quantity_change > 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {item.quantity_change > 0 ? '+' : ''}{item.quantity_change}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted text-sm">No recent activity yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
