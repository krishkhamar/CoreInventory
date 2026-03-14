import { useEffect, useState } from 'react';
import api from '../services/api';

export default function MoveHistoryPage() {
  const [history, setHistory] = useState([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = {};
    if (typeFilter) params.type = typeFilter;
    api.get('/move-history', { params }).then(r => { setHistory(r.data); setLoading(false); });
  }, [typeFilter]);

  const types = ['', 'receipt', 'delivery', 'transfer', 'adjustment'];

  return (
    <div className="fade-in">
      <div className="page-header"><h1>📋 Move History</h1></div>

      <div className="filters-bar">
        {types.map(t => (
          <button key={t} className={`filter-chip ${typeFilter === t ? 'active' : ''}`} onClick={() => setTypeFilter(t)}>
            {t ? t.charAt(0).toUpperCase() + t.slice(1) : 'All'}
          </button>
        ))}
      </div>

      {loading ? <p className="text-muted">Loading...</p> : history.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">📋</div><h3>No stock movements recorded</h3></div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead><tr><th>Type</th><th>Product</th><th>SKU</th><th>Location</th><th>Change</th><th>Description</th><th>Date</th></tr></thead>
            <tbody>
              {history.map(h => (
                <tr key={h.id}>
                  <td><span className={`badge badge-${h.type}`}>{h.type}</span></td>
                  <td style={{ fontWeight: 500 }}>{h.product_name}</td>
                  <td><code style={{ color: 'var(--accent-light)' }}>{h.sku}</code></td>
                  <td>{h.location_name || '—'}</td>
                  <td style={{ fontWeight: 600, color: h.quantity_change > 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {h.quantity_change > 0 ? '+' : ''}{h.quantity_change}
                  </td>
                  <td className="text-muted text-sm">{h.description || '—'}</td>
                  <td className="text-muted">{new Date(h.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
