import { useEffect, useState } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

export default function DeliveryOrdersPage() {
  const [deliveries, setDeliveries] = useState([]);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [form, setForm] = useState({ customer_name: '', scheduled_date: '', items: [{ product_id: '', location_id: '', quantity: '' }] });
  const toast = useToast();

  const fetchDeliveries = () => {
    const params = statusFilter ? { status: statusFilter } : {};
    api.get('/deliveries', { params }).then(r => setDeliveries(r.data));
  };

  useEffect(() => { fetchDeliveries(); }, [statusFilter]);
  useEffect(() => {
    api.get('/products').then(r => setProducts(r.data));
    api.get('/locations').then(r => setLocations(r.data));
  }, []);

  const addItem = () => setForm({ ...form, items: [...form.items, { product_id: '', location_id: '', quantity: '' }] });
  const removeItem = (i) => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });
  const updateItem = (i, field, val) => { const items = [...form.items]; items[i][field] = val; setForm({ ...form, items }); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/deliveries', { ...form, items: form.items.filter(i => i.product_id && i.quantity) });
      toast.success('Delivery order created.');
      setShowModal(false); fetchDeliveries();
      setForm({ customer_name: '', scheduled_date: '', items: [{ product_id: '', location_id: '', quantity: '' }] });
    } catch (err) { toast.error(err.response?.data?.error || 'Failed.'); }
  };

  const handleValidate = async (id) => {
    try {
      await api.put(`/deliveries/${id}/validate`);
      toast.success('Delivery validated! Stock reduced.');
      fetchDeliveries(); setShowDetail(null);
    } catch (err) { toast.error(err.response?.data?.error || 'Validation failed. Insufficient stock?'); }
  };

  const handleCancel = async (id) => {
    await api.put(`/deliveries/${id}/cancel`);
    toast.info('Delivery canceled.'); fetchDeliveries();
  };

  const viewDetail = async (id) => {
    const r = await api.get(`/deliveries/${id}`);
    setShowDetail(r.data);
  };

  const statuses = ['', 'Draft', 'Waiting', 'Ready', 'Done', 'Canceled'];

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>📤 Delivery Orders</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Delivery</button>
      </div>

      <div className="filters-bar">
        {statuses.map(s => (
          <button key={s} className={`filter-chip ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>{s || 'All'}</button>
        ))}
      </div>

      {deliveries.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">📤</div><h3>No delivery orders</h3></div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead><tr><th>Reference</th><th>Customer</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {deliveries.map(d => (
                <tr key={d.id}>
                  <td><span style={{ fontWeight: 600, color: 'var(--accent-light)' }}>{d.reference}</span></td>
                  <td>{d.customer_name || '—'}</td>
                  <td className="text-muted">{d.scheduled_date ? new Date(d.scheduled_date).toLocaleDateString() : '—'}</td>
                  <td><span className={`badge badge-${d.status.toLowerCase()}`}>{d.status}</span></td>
                  <td className="action-btns">
                    <button className="btn btn-ghost btn-sm" onClick={() => viewDetail(d.id)}>View</button>
                    {d.status !== 'Done' && d.status !== 'Canceled' && (
                      <>
                        <button className="btn btn-success btn-sm" onClick={() => handleValidate(d.id)}>Validate</button>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleCancel(d.id)}>Cancel</button>
                      </>
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
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header"><h2>New Delivery Order</h2><button className="modal-close" onClick={() => setShowModal(false)}>×</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group"><label>Customer Name</label><input className="form-control" value={form.customer_name} onChange={e => setForm({...form, customer_name: e.target.value})} /></div>
                  <div className="form-group"><label>Scheduled Date</label><input type="date" className="form-control" value={form.scheduled_date} onChange={e => setForm({...form, scheduled_date: e.target.value})} /></div>
                </div>
                <h4 style={{ margin: '16px 0 8px', fontSize: '0.9rem' }}>Items</h4>
                {form.items.map((item, i) => (
                  <div className="item-row" key={i}>
                    <div className="form-group"><label>Product</label>
                      <select className="form-control" value={item.product_id} onChange={e => updateItem(i, 'product_id', e.target.value)}>
                        <option value="">Select</option>{products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                      </select></div>
                    <div className="form-group"><label>From Location</label>
                      <select className="form-control" value={item.location_id} onChange={e => updateItem(i, 'location_id', e.target.value)}>
                        <option value="">Select</option>{locations.map(l => <option key={l.id} value={l.id}>{l.warehouse_name} – {l.name}</option>)}
                      </select></div>
                    <div className="form-group"><label>Qty</label>
                      <input type="number" className="form-control" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} min="1" /></div>
                    <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => removeItem(i)}>✕</button>
                  </div>
                ))}
                <button type="button" className="btn btn-secondary btn-sm" onClick={addItem}>+ Add Item</button>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Delivery</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetail && (
        <div className="modal-overlay" onClick={() => setShowDetail(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Delivery {showDetail.reference}</h2><button className="modal-close" onClick={() => setShowDetail(null)}>×</button></div>
            <div className="modal-body">
              <div className="detail-grid mb-lg">
                <div className="detail-item"><label>Customer</label><span>{showDetail.customer_name || '—'}</span></div>
                <div className="detail-item"><label>Status</label><span className={`badge badge-${showDetail.status.toLowerCase()}`}>{showDetail.status}</span></div>
              </div>
              <h4 style={{ marginBottom: '8px', fontSize: '0.9rem' }}>Items</h4>
              <div className="data-table-container">
                <table className="data-table">
                  <thead><tr><th>Product</th><th>SKU</th><th>Location</th><th>Qty</th></tr></thead>
                  <tbody>
                    {showDetail.items?.map((item, i) => <tr key={i}><td>{item.product_name}</td><td><code>{item.sku}</code></td><td>{item.location_name}</td><td style={{ fontWeight: 600 }}>{item.quantity}</td></tr>)}
                  </tbody>
                </table>
              </div>
            </div>
            {showDetail.status !== 'Done' && showDetail.status !== 'Canceled' && (
              <div className="modal-footer"><button className="btn btn-success" onClick={() => handleValidate(showDetail.id)}>✓ Validate Delivery</button></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
