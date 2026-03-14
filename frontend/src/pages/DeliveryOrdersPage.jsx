import { useEffect, useState } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

export default function DeliveryOrdersPage() {
  const [deliveries, setDeliveries] = useState([]);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [form, setForm] = useState({ customer_name: '', scheduled_date: '', items: [{ product_id: '', location_id: '', quantity: '' }] });
  const toast = useToast();

  const fetchDeliveries = () => {
    const params = {};
    if (statusFilter) params.status = statusFilter;
    if (catFilter) params.category_id = catFilter;
    if (searchFilter) params.search = searchFilter;
    api.get('/deliveries', { params }).then(r => setDeliveries(r.data));
  };

  useEffect(() => { fetchDeliveries(); }, [statusFilter, catFilter, searchFilter]);
  useEffect(() => {
    api.get('/products').then(r => setProducts(r.data));
    api.get('/locations').then(r => setLocations(r.data));
    api.get('/products/categories/all').then(r => setCategories(r.data));
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
      toast.success('Delivery shipped! Stock reduced.');
      fetchDeliveries(); setShowDetail(null);
    } catch (err) { toast.error(err.response?.data?.error || 'Validation failed. Insufficient stock?'); }
  };

  const handlePick = async (id) => {
    try {
      await api.put(`/deliveries/${id}/pick`);
      toast.success('Items picked from shelves.');
      fetchDeliveries();
      if (showDetail) { const r = await api.get(`/deliveries/${id}`); setShowDetail(r.data); }
    } catch (err) { toast.error(err.response?.data?.error || err.message || 'Pick failed.'); }
  };

  const handlePack = async (id) => {
    try {
      await api.put(`/deliveries/${id}/pack`);
      toast.success('Items packed for shipment.');
      fetchDeliveries();
      if (showDetail) { const r = await api.get(`/deliveries/${id}`); setShowDetail(r.data); }
    } catch (err) { toast.error(err.response?.data?.error || err.message || 'Pack failed.'); }
  };

  const handleItemPack = async (deliveryId, itemId) => {
    try {
      await api.put(`/deliveries/items/${itemId}/pack`);
      toast.success('Item packed.');
      fetchDeliveries();
      const r = await api.get(`/deliveries/${deliveryId}`);
      setShowDetail(r.data);
    } catch (err) { toast.error(err.response?.data?.error || err.message || 'Item pack failed.'); }
  };

  const handleItemPick = async (deliveryId, itemId) => {
    try {
      await api.put(`/deliveries/items/${itemId}/pick`);
      toast.success('Item picked.');
      fetchDeliveries();
      const r = await api.get(`/deliveries/${deliveryId}`);
      setShowDetail(r.data);
    } catch (err) { toast.error(err.response?.data?.error || err.message || 'Item pick failed.'); }
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

  // Pick/Pack step label
  const getStepLabel = (status) => {
    if (status === 'Draft') return { step: 1, label: 'Step 1: Pending Pack', color: 'var(--info)' };
    if (status === 'Waiting') return { step: 2, label: 'Step 2: Packed → Pick', color: 'var(--warning)' };
    if (status === 'Ready') return { step: 3, label: 'Step 3: Picked → Ship', color: 'var(--success)' };
    if (status === 'Done') return { step: 4, label: 'Completed ✓', color: 'var(--success)' };
    return { step: 0, label: status, color: 'var(--text-muted)' };
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>📤 Delivery Orders</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Delivery</button>
      </div>

      <div className="filters-bar">
        <input className="form-control" placeholder="Search by reference or customer..."
          style={{ maxWidth: 230 }} value={searchFilter} onChange={e => setSearchFilter(e.target.value)} />
        <select className="form-control" style={{ maxWidth: 170 }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {statuses.map(s => (
          <button key={s} className={`filter-chip ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>{s || 'All'}</button>
        ))}
      </div>

      {deliveries.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">📤</div><h3>No delivery orders</h3></div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead><tr><th>Reference</th><th>Customer</th><th>Date</th><th>Workflow</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {deliveries.map(d => {
                const step = getStepLabel(d.status);
                return (
                <tr key={d.id}>
                  <td><span style={{ fontWeight: 600, color: 'var(--accent-light)' }}>{d.reference}</span></td>
                  <td>{d.customer_name || '—'}</td>
                  <td className="text-muted">{d.scheduled_date ? new Date(d.scheduled_date).toLocaleDateString() : '—'}</td>
                  <td><span className="text-sm" style={{ color: step.color, fontWeight: 600 }}>{step.label}</span></td>
                  <td><span className={`badge badge-${d.status.toLowerCase()}`}>{d.status}</span></td>
                  <td className="action-btns">
                    <button className="btn btn-ghost btn-sm" onClick={() => viewDetail(d.id)}>View</button>
                    {d.status !== 'Done' && d.status !== 'Canceled' && (
                      <>
                        {d.status !== 'Ready' && (
                          <>
                            <button className="btn btn-primary btn-sm" onClick={() => handlePack(d.id)} title="Pack All">🏷️ Pack</button>
                            <button className="btn btn-secondary btn-sm" onClick={() => handlePick(d.id)} title="Pick All">📦 Pick</button>
                          </>
                        )}
                        {d.status === 'Ready' && <button className="btn btn-success btn-sm" onClick={() => handleValidate(d.id)}>🚚 Ship</button>}
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleCancel(d.id)}>Cancel</button>
                      </>
                    )}
                  </td>
                </tr>
                );
              })}
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
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header"><h2>Delivery {showDetail.reference}</h2><button className="modal-close" onClick={() => setShowDetail(null)}>×</button></div>
            <div className="modal-body">
              <div className="detail-grid mb-lg">
                <div className="detail-item"><label>Customer</label><span>{showDetail.customer_name || '—'}</span></div>
                <div className="detail-item"><label>Status</label><span className={`badge badge-${showDetail.status.toLowerCase()}`}>{showDetail.status}</span></div>
                <div className="detail-item"><label>Date</label><span>{showDetail.scheduled_date ? new Date(showDetail.scheduled_date).toLocaleDateString() : '—'}</span></div>
                <div className="detail-item"><label>Workflow</label><span style={{ fontWeight: 600, color: getStepLabel(showDetail.status).color }}>{getStepLabel(showDetail.status).label}</span></div>
              </div>

              {/* Pick & Pack Progress Bar */}
              {showDetail.status !== 'Canceled' && (
                <div style={{ marginBottom: '16px' }}>
                  <div className="text-sm fw-600" style={{ marginBottom: '8px' }}>Pack, Pick & Ship Progress</div>
                  <div style={{ display: 'flex', gap: '4px', height: '8px', borderRadius: '4px', overflow: 'hidden', background: 'var(--bg-input)' }}>
                    <div style={{ flex: 1, background: showDetail.status !== 'Draft' ? 'var(--info)' : 'var(--border)', borderRadius: '4px 0 0 4px', transition: 'background 0.3s' }} title="Packed" />
                    <div style={{ flex: 1, background: showDetail.status === 'Ready' || showDetail.status === 'Done' ? 'var(--warning)' : 'var(--border)', transition: 'background 0.3s' }} title="Picked" />
                    <div style={{ flex: 1, background: showDetail.status === 'Done' ? 'var(--success)' : 'var(--border)', borderRadius: '0 4px 4px 0', transition: 'background 0.3s' }} title="Shipped" />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span className="text-sm text-muted">🏷️ Pack</span>
                    <span className="text-sm text-muted">📦 Pick</span>
                    <span className="text-sm text-muted">🚚 Ship</span>
                  </div>
                </div>
              )}

              <h4 style={{ marginBottom: '8px', fontSize: '0.9rem' }}>Items</h4>
              <div className="data-table-container">
                <table className="data-table">
                  <thead><tr><th>Product</th><th>SKU</th><th>Location</th><th>Qty</th><th>Packed</th><th>Picked</th></tr></thead>
                  <tbody>
                    {showDetail.items?.map((item, i) => (
                      <tr key={i}>
                        <td>{item.product_name}</td>
                        <td><code>{item.sku}</code></td>
                        <td>{item.location_name}</td>
                        <td style={{ fontWeight: 600 }}>{item.quantity}</td>
                        <td>
                          {item.packed 
                            ? <span className="badge badge-done">✓ Yes</span> 
                            : <button className="btn btn-primary btn-sm" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => handleItemPack(showDetail.id, item.id)}>Pack</button>
                          }
                        </td>
                        <td>
                          {item.picked 
                            ? <span className="badge badge-done">✓ Yes</span> 
                            : <button className="btn btn-secondary btn-sm" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => handleItemPick(showDetail.id, item.id)}>Pick</button>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {showDetail.status !== 'Done' && showDetail.status !== 'Canceled' && (
              <div className="modal-footer">
                {showDetail.status === 'Draft' && <button className="btn btn-primary" onClick={() => handlePack(showDetail.id)}>🏷️ Pack Items</button>}
                {showDetail.status === 'Waiting' && <button className="btn btn-secondary" onClick={() => handlePick(showDetail.id)}>📦 Pick Items</button>}
                {showDetail.status === 'Ready' && <button className="btn btn-success" onClick={() => handleValidate(showDetail.id)}>🚚 Ship & Validate</button>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
