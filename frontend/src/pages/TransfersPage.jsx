import { useEffect, useState } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

export default function TransfersPage() {
  const [transfers, setTransfers] = useState([]);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [form, setForm] = useState({ source_location_id: '', dest_location_id: '', scheduled_date: '', items: [{ product_id: '', quantity: '' }] });
  const toast = useToast();

  const fetchTransfers = () => {
    const params = statusFilter ? { status: statusFilter } : {};
    api.get('/transfers', { params }).then(r => setTransfers(r.data));
  };

  useEffect(() => { fetchTransfers(); }, [statusFilter]);
  useEffect(() => {
    api.get('/products').then(r => setProducts(r.data));
    api.get('/locations').then(r => setLocations(r.data));
  }, []);

  const addItem = () => setForm({ ...form, items: [...form.items, { product_id: '', quantity: '' }] });
  const removeItem = (i) => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });
  const updateItem = (i, field, val) => { const items = [...form.items]; items[i][field] = val; setForm({ ...form, items }); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/transfers', { ...form, items: form.items.filter(i => i.product_id && i.quantity) });
      toast.success('Transfer created.');
      setShowModal(false); fetchTransfers();
      setForm({ source_location_id: '', dest_location_id: '', scheduled_date: '', items: [{ product_id: '', quantity: '' }] });
    } catch (err) { toast.error(err.response?.data?.error || 'Failed.'); }
  };

  const handleValidate = async (id) => {
    try {
      await api.put(`/transfers/${id}/validate`);
      toast.success('Transfer validated! Stock moved.');
      fetchTransfers(); setShowDetail(null);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed. Insufficient stock?'); }
  };

  const viewDetail = async (id) => {
    const r = await api.get(`/transfers/${id}`);
    setShowDetail(r.data);
  };

  const statuses = ['', 'Draft', 'Waiting', 'Ready', 'Done', 'Canceled'];

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>🔄 Internal Transfers</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Transfer</button>
      </div>

      <div className="filters-bar">
        {statuses.map(s => (
          <button key={s} className={`filter-chip ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>{s || 'All'}</button>
        ))}
      </div>

      {transfers.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">🔄</div><h3>No transfers</h3></div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead><tr><th>Reference</th><th>From</th><th>To</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {transfers.map(t => (
                <tr key={t.id}>
                  <td><span style={{ fontWeight: 600, color: 'var(--accent-light)' }}>{t.reference}</span></td>
                  <td>{t.source_warehouse} – {t.source_location}</td>
                  <td>{t.dest_warehouse} – {t.dest_location}</td>
                  <td className="text-muted">{t.scheduled_date ? new Date(t.scheduled_date).toLocaleDateString() : '—'}</td>
                  <td><span className={`badge badge-${t.status.toLowerCase()}`}>{t.status}</span></td>
                  <td className="action-btns">
                    <button className="btn btn-ghost btn-sm" onClick={() => viewDetail(t.id)}>View</button>
                    {t.status !== 'Done' && t.status !== 'Canceled' && (
                      <button className="btn btn-success btn-sm" onClick={() => handleValidate(t.id)}>Validate</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header"><h2>New Transfer</h2><button className="modal-close" onClick={() => setShowModal(false)}>×</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group"><label>Source Location</label>
                    <select className="form-control" value={form.source_location_id} onChange={e => setForm({...form, source_location_id: e.target.value})} required>
                      <option value="">Select</option>{locations.map(l => <option key={l.id} value={l.id}>{l.warehouse_name} – {l.name}</option>)}
                    </select></div>
                  <div className="form-group"><label>Destination Location</label>
                    <select className="form-control" value={form.dest_location_id} onChange={e => setForm({...form, dest_location_id: e.target.value})} required>
                      <option value="">Select</option>{locations.map(l => <option key={l.id} value={l.id}>{l.warehouse_name} – {l.name}</option>)}
                    </select></div>
                </div>
                <div className="form-group"><label>Scheduled Date</label><input type="date" className="form-control" value={form.scheduled_date} onChange={e => setForm({...form, scheduled_date: e.target.value})} /></div>
                <h4 style={{ margin: '16px 0 8px', fontSize: '0.9rem' }}>Items</h4>
                {form.items.map((item, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '8px', marginBottom: '8px' }}>
                    <select className="form-control" value={item.product_id} onChange={e => updateItem(i, 'product_id', e.target.value)}>
                      <option value="">Select Product</option>{products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                    </select>
                    <input type="number" className="form-control" placeholder="Qty" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} min="1" />
                    <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => removeItem(i)}>✕</button>
                  </div>
                ))}
                <button type="button" className="btn btn-secondary btn-sm" onClick={addItem}>+ Add Item</button>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Transfer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetail && (
        <div className="modal-overlay" onClick={() => setShowDetail(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Transfer {showDetail.reference}</h2><button className="modal-close" onClick={() => setShowDetail(null)}>×</button></div>
            <div className="modal-body">
              <div className="detail-grid mb-lg">
                <div className="detail-item"><label>From</label><span>{showDetail.source_warehouse} – {showDetail.source_location}</span></div>
                <div className="detail-item"><label>To</label><span>{showDetail.dest_warehouse} – {showDetail.dest_location}</span></div>
                <div className="detail-item"><label>Status</label><span className={`badge badge-${showDetail.status.toLowerCase()}`}>{showDetail.status}</span></div>
              </div>
              <h4 style={{ marginBottom: '8px', fontSize: '0.9rem' }}>Items</h4>
              <div className="data-table-container">
                <table className="data-table">
                  <thead><tr><th>Product</th><th>SKU</th><th>Qty</th></tr></thead>
                  <tbody>
                    {showDetail.items?.map((item, i) => <tr key={i}><td>{item.product_name}</td><td><code>{item.sku}</code></td><td style={{ fontWeight: 600 }}>{item.quantity}</td></tr>)}
                  </tbody>
                </table>
              </div>
            </div>
            {showDetail.status !== 'Done' && showDetail.status !== 'Canceled' && (
              <div className="modal-footer"><button className="btn btn-success" onClick={() => handleValidate(showDetail.id)}>✓ Validate Transfer</button></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
