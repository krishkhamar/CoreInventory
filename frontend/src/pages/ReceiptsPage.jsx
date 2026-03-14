import { useEffect, useState } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState([]);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [form, setForm] = useState({ supplier_name: '', scheduled_date: '', items: [{ product_id: '', location_id: '', quantity: '' }] });
  const toast = useToast();

  const fetchReceipts = () => {
    const params = statusFilter ? { status: statusFilter } : {};
    api.get('/receipts', { params }).then(r => setReceipts(r.data));
  };

  useEffect(() => { fetchReceipts(); }, [statusFilter]);
  useEffect(() => {
    api.get('/products').then(r => setProducts(r.data));
    api.get('/locations').then(r => setLocations(r.data));
  }, []);

  const addItem = () => setForm({ ...form, items: [...form.items, { product_id: '', location_id: '', quantity: '' }] });
  const removeItem = (i) => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });
  const updateItem = (i, field, val) => {
    const items = [...form.items]; items[i][field] = val; setForm({ ...form, items });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/receipts', { ...form, items: form.items.filter(i => i.product_id && i.quantity) });
      toast.success('Receipt created.');
      setShowModal(false); fetchReceipts();
      setForm({ supplier_name: '', scheduled_date: '', items: [{ product_id: '', location_id: '', quantity: '' }] });
    } catch (err) { toast.error(err.response?.data?.error || 'Failed.'); }
  };

  const handleValidate = async (id) => {
    try {
      await api.put(`/receipts/${id}/validate`);
      toast.success('Receipt validated! Stock updated.');
      fetchReceipts(); setShowDetail(null);
    } catch (err) { toast.error(err.response?.data?.error || 'Validation failed.'); }
  };

  const handleCancel = async (id) => {
    await api.put(`/receipts/${id}/cancel`);
    toast.info('Receipt canceled.'); fetchReceipts();
  };

  const viewDetail = async (id) => {
    const r = await api.get(`/receipts/${id}`);
    setShowDetail(r.data);
  };

  const statuses = ['', 'Draft', 'Waiting', 'Ready', 'Done', 'Canceled'];

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>📥 Receipts</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Receipt</button>
      </div>

      <div className="filters-bar">
        {statuses.map(s => (
          <button key={s} className={`filter-chip ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {receipts.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">📥</div><h3>No receipts</h3></div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead><tr><th>Reference</th><th>Supplier</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {receipts.map(r => (
                <tr key={r.id}>
                  <td><span style={{ fontWeight: 600, color: 'var(--accent-light)' }}>{r.reference}</span></td>
                  <td>{r.supplier_name || '—'}</td>
                  <td className="text-muted">{r.scheduled_date ? new Date(r.scheduled_date).toLocaleDateString() : '—'}</td>
                  <td><span className={`badge badge-${r.status.toLowerCase()}`}>{r.status}</span></td>
                  <td className="action-btns">
                    <button className="btn btn-ghost btn-sm" onClick={() => viewDetail(r.id)}>View</button>
                    {r.status !== 'Done' && r.status !== 'Canceled' && (
                      <>
                        <button className="btn btn-success btn-sm" onClick={() => handleValidate(r.id)}>Validate</button>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleCancel(r.id)}>Cancel</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header"><h2>New Receipt</h2><button className="modal-close" onClick={() => setShowModal(false)}>×</button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group"><label>Supplier Name</label><input className="form-control" value={form.supplier_name} onChange={e => setForm({...form, supplier_name: e.target.value})} /></div>
                  <div className="form-group"><label>Scheduled Date</label><input type="date" className="form-control" value={form.scheduled_date} onChange={e => setForm({...form, scheduled_date: e.target.value})} /></div>
                </div>
                <h4 style={{ margin: '16px 0 8px', fontSize: '0.9rem' }}>Items</h4>
                {form.items.map((item, i) => (
                  <div className="item-row" key={i}>
                    <div className="form-group"><label>Product</label>
                      <select className="form-control" value={item.product_id} onChange={e => updateItem(i, 'product_id', e.target.value)}>
                        <option value="">Select</option>{products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                      </select></div>
                    <div className="form-group"><label>Location</label>
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
                <button type="submit" className="btn btn-primary">Create Receipt</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && (
        <div className="modal-overlay" onClick={() => setShowDetail(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>Receipt {showDetail.reference}</h2><button className="modal-close" onClick={() => setShowDetail(null)}>×</button></div>
            <div className="modal-body">
              <div className="detail-grid mb-lg">
                <div className="detail-item"><label>Supplier</label><span>{showDetail.supplier_name || '—'}</span></div>
                <div className="detail-item"><label>Status</label><span className={`badge badge-${showDetail.status.toLowerCase()}`}>{showDetail.status}</span></div>
                <div className="detail-item"><label>Date</label><span>{showDetail.scheduled_date ? new Date(showDetail.scheduled_date).toLocaleDateString() : '—'}</span></div>
                <div className="detail-item"><label>Created By</label><span>{showDetail.created_by || '—'}</span></div>
              </div>
              <h4 style={{ marginBottom: '8px', fontSize: '0.9rem' }}>Items</h4>
              <div className="data-table-container">
                <table className="data-table">
                  <thead><tr><th>Product</th><th>SKU</th><th>Location</th><th>Qty</th></tr></thead>
                  <tbody>
                    {showDetail.items?.map((item, i) => (
                      <tr key={i}><td>{item.product_name}</td><td><code>{item.sku}</code></td><td>{item.location_name}</td><td style={{ fontWeight: 600 }}>{item.quantity}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {showDetail.status !== 'Done' && showDetail.status !== 'Canceled' && (
              <div className="modal-footer">
                <button className="btn btn-success" onClick={() => handleValidate(showDetail.id)}>✓ Validate Receipt</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
