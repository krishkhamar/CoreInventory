import { useEffect, useState } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterStock, setFilterStock] = useState('');
  const [form, setForm] = useState({ name: '', sku: '', category_id: '', unit_of_measure: 'Units', reorder_point: 10, initial_stock: '', location_id: '' });
  const toast = useToast();

  const fetchProducts = () => {
    const params = {};
    if (search) params.search = search;
    if (filterCat) params.category_id = filterCat;
    if (filterStock) params.stock_status = filterStock;
    api.get('/products', { params }).then(r => { setProducts(r.data); setLoading(false); });
  };

  useEffect(() => { fetchProducts(); }, [search, filterCat, filterStock]);
  useEffect(() => {
    api.get('/products/categories/all').then(r => setCategories(r.data));
    api.get('/locations').then(r => setLocations(r.data));
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', sku: '', category_id: '', unit_of_measure: 'Units', reorder_point: 10, initial_stock: '', location_id: '' });
    setShowModal(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({ name: p.name, sku: p.sku, category_id: p.category_id || '', unit_of_measure: p.unit_of_measure, reorder_point: p.reorder_point, initial_stock: '', location_id: '' });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/products/${editing.id}`, form);
        toast.success('Product updated.');
      } else {
        await api.post('/products', form);
        toast.success('Product created.');
      }
      setShowModal(false);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed.');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success('Product deleted.');
      fetchProducts();
    } catch (err) { toast.error('Failed to delete.'); }
  };

  const getStockBadge = (p) => {
    if (p.total_stock === 0) return <span className="badge badge-out">Out of Stock</span>;
    if (p.total_stock <= p.reorder_point) return <span className="badge badge-low">Low Stock</span>;
    return <span className="badge badge-ok">In Stock</span>;
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Products</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Product</button>
      </div>

      <div className="filters-bar">
        <input className="form-control" placeholder="Search by name or SKU..."
          style={{ maxWidth: 250 }} value={search} onChange={e => setSearch(e.target.value)} />
        <select className="form-control" style={{ maxWidth: 180 }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="form-control" style={{ maxWidth: 160 }} value={filterStock} onChange={e => setFilterStock(e.target.value)}>
          <option value="">All Stock</option>
          <option value="low">Low Stock</option>
          <option value="out">Out of Stock</option>
        </select>
      </div>

      {loading ? <p className="text-muted">Loading...</p> : products.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">📦</div><h3>No products found</h3><p>Create your first product to get started.</p></div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead><tr><th>SKU</th><th>Name</th><th>Category</th><th>UoM</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td><code style={{ color: 'var(--accent-light)' }}>{p.sku}</code></td>
                  <td style={{ fontWeight: 500 }}>{p.name}</td>
                  <td>{p.category_name || '—'}</td>
                  <td>{p.unit_of_measure}</td>
                  <td style={{ fontWeight: 600 }}>{p.total_stock}</td>
                  <td>{getStockBadge(p)}</td>
                  <td className="action-btns">
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>Edit</button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(p.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editing ? 'Edit Product' : 'New Product'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Product Name *</label>
                  <input name="name" className="form-control" value={form.name} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>SKU Code *</label>
                  <input name="sku" className="form-control" value={form.sku} onChange={handleChange} required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label>Category</label>
                    <select name="category_id" className="form-control" value={form.category_id} onChange={handleChange}>
                      <option value="">None</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Unit of Measure</label>
                    <select name="unit_of_measure" className="form-control" value={form.unit_of_measure} onChange={handleChange}>
                      {['Units', 'kg', 'liters', 'meters', 'sheets', 'sets', 'boxes', 'pieces'].map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Reorder Point</label>
                  <input name="reorder_point" type="number" className="form-control" value={form.reorder_point} onChange={handleChange} />
                </div>
                {!editing && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label>Initial Stock</label>
                      <input name="initial_stock" type="number" className="form-control" value={form.initial_stock} onChange={handleChange} placeholder="0" />
                    </div>
                    <div className="form-group">
                      <label>Location</label>
                      <select name="location_id" className="form-control" value={form.location_id} onChange={handleChange}>
                        <option value="">Select location</option>
                        {locations.map(l => <option key={l.id} value={l.id}>{l.warehouse_name} – {l.name}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
