import { useEffect, useState } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [showWHModal, setShowWHModal] = useState(false);
  const [showLocModal, setShowLocModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [whForm, setWhForm] = useState({ name: '', address: '' });
  const [locForm, setLocForm] = useState({ warehouse_id: '', name: '' });
  const toast = useToast();

  const fetchAll = () => {
    api.get('/warehouses').then(r => setWarehouses(r.data));
    api.get('/locations').then(r => setLocations(r.data));
  };
  useEffect(() => { fetchAll(); }, []);

  const handleWHSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await api.put(`/warehouses/${editing.id}`, whForm); toast.success('Updated.'); }
      else { await api.post('/warehouses', whForm); toast.success('Warehouse created.'); }
      setShowWHModal(false); fetchAll();
    } catch (err) { toast.error('Failed.'); }
  };

  const handleLocSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/locations', locForm);
      toast.success('Location created.');
      setShowLocModal(false); fetchAll();
    } catch (err) { toast.error('Failed.'); }
  };

  const deleteWH = async (id) => { if (!confirm('Delete warehouse & its locations?')) return; await api.delete(`/warehouses/${id}`); toast.success('Deleted.'); fetchAll(); };
  const deleteLoc = async (id) => { if (!confirm('Delete location?')) return; await api.delete(`/locations/${id}`); toast.success('Deleted.'); fetchAll(); };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>🏭 Warehouses & Locations</h1>
        <div className="flex gap-sm">
          <button className="btn btn-secondary" onClick={() => { setLocForm({ warehouse_id: warehouses[0]?.id || '', name: '' }); setShowLocModal(true); }}>+ Add Location</button>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setWhForm({ name: '', address: '' }); setShowWHModal(true); }}>+ Add Warehouse</button>
        </div>
      </div>

      {warehouses.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">🏭</div><h3>No warehouses</h3></div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {warehouses.map(wh => (
            <div key={wh.id} className="card">
              <div className="flex-between mb-md">
                <div>
                  <h3 style={{ fontSize: '1.1rem' }}>{wh.name}</h3>
                  <p className="text-muted text-sm">{wh.address || 'No address'}</p>
                </div>
                <div className="action-btns">
                  <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(wh); setWhForm({ name: wh.name, address: wh.address || '' }); setShowWHModal(true); }}>Edit</button>
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => deleteWH(wh.id)}>Delete</button>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {locations.filter(l => l.warehouse_id === wh.id).map(loc => (
                  <div key={loc.id} style={{ background: 'var(--bg-input)', padding: '6px 14px', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📍 {loc.name}
                    <button onClick={() => deleteLoc(loc.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.75rem' }}>✕</button>
                  </div>
                ))}
                {locations.filter(l => l.warehouse_id === wh.id).length === 0 && <span className="text-muted text-sm">No locations added</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showWHModal && (
        <div className="modal-overlay" onClick={() => setShowWHModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>{editing ? 'Edit Warehouse' : 'New Warehouse'}</h2><button className="modal-close" onClick={() => setShowWHModal(false)}>×</button></div>
            <form onSubmit={handleWHSubmit}>
              <div className="modal-body">
                <div className="form-group"><label>Name *</label><input className="form-control" value={whForm.name} onChange={e => setWhForm({...whForm, name: e.target.value})} required /></div>
                <div className="form-group"><label>Address</label><textarea className="form-control" value={whForm.address} onChange={e => setWhForm({...whForm, address: e.target.value})} /></div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowWHModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'}</button></div>
            </form>
          </div>
        </div>
      )}

      {showLocModal && (
        <div className="modal-overlay" onClick={() => setShowLocModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>New Location</h2><button className="modal-close" onClick={() => setShowLocModal(false)}>×</button></div>
            <form onSubmit={handleLocSubmit}>
              <div className="modal-body">
                <div className="form-group"><label>Warehouse *</label>
                  <select className="form-control" value={locForm.warehouse_id} onChange={e => setLocForm({...locForm, warehouse_id: e.target.value})} required>
                    <option value="">Select</option>{warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select></div>
                <div className="form-group"><label>Location Name *</label><input className="form-control" value={locForm.name} onChange={e => setLocForm({...locForm, name: e.target.value})} required placeholder="e.g., Rack A, Receiving Dock" /></div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowLocModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">Create</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
