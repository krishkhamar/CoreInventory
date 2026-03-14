import { useEffect, useState } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

export default function AdjustmentsPage() {
  const [adjustments, setAdjustments] = useState([]);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ product_id: '', location_id: '', new_quantity: '', reason: '' });
  const toast = useToast();

  const fetchAdjustments = () => api.get('/adjustments').then(r => setAdjustments(r.data));
  useEffect(() => {
    fetchAdjustments();
    api.get('/products').then(r => setProducts(r.data));
    api.get('/locations').then(r => setLocations(r.data));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/adjustments', form);
      toast.success('Stock adjusted.');
      setShowModal(false); fetchAdjustments();
      setForm({ product_id: '', location_id: '', new_quantity: '', reason: '' });
    } catch (err) { toast.error(err.response?.data?.error || 'Failed.'); }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>⚖️ Stock Adjustments</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Adjustment</button>
      </div>

      {adjustments.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">⚖️</div><h3>No adjustments</h3></div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead><tr><th>Reference</th><th>Product</th><th>Location</th><th>Old Qty</th><th>New Qty</th><th>Diff</th><th>Reason</th><th>By</th><th>Date</th></tr></thead>
            <tbody>
              {adjustments.map(a => {
                const diff = a.new_quantity - a.old_quantity;
                return (
                  <tr key={a.id}>
                    <td><span style={{ fontWeight: 600, color: 'var(--accent-light)' }}>{a.reference}</span></td>
                    <td>{a.product_name} <code style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{a.sku}</code></td>
                    <td>{a.location_name}</td>
                    <td>{a.old_quantity}</td>
                    <td style={{ fontWeight: 600 }}>{a.new_quantity}</td>
                    <td style={{ fontWeight: 600, color: diff > 0 ? 'var(--success)' : diff < 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                      {diff > 0 ? '+' : ''}{diff}
                    </td>
                    <td className="text-muted">{a.reason || '—'}</td>
                    <td>{a.created_by || '—'}</td>
                    <td className="text-muted">{new Date(a.created_at).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>New Adjustment</h2><button className="modal-close" onClick={() => setShowModal(false)}>×</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group"><label>Product *</label>
                  <select className="form-control" value={form.product_id} onChange={e => setForm({...form, product_id: e.target.value})} required>
                    <option value="">Select product</option>{products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                  </select></div>
                <div className="form-group"><label>Location *</label>
                  <select className="form-control" value={form.location_id} onChange={e => setForm({...form, location_id: e.target.value})} required>
                    <option value="">Select location</option>{locations.map(l => <option key={l.id} value={l.id}>{l.warehouse_name} – {l.name}</option>)}
                  </select></div>
                <div className="form-group"><label>Counted Quantity (New) *</label>
                  <input type="number" className="form-control" value={form.new_quantity} onChange={e => setForm({...form, new_quantity: e.target.value})} required min="0" /></div>
                <div className="form-group"><label>Reason</label>
                  <textarea className="form-control" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} placeholder="e.g., Damaged goods, physical count mismatch..." /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Apply Adjustment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
