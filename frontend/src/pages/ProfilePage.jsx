import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function ProfilePage() {
  const { user } = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState({ name: '', email: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/auth/profile').then(r => { setProfile({ name: r.data.name, email: r.data.email }); setLoading(false); });
  }, []);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.put('/auth/profile', profile);
      toast.success('Profile updated.');
    } catch (err) { toast.error('Failed to update.'); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) { toast.error('Passwords do not match.'); return; }
    try {
      await api.put('/auth/change-password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password changed.');
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) { toast.error(err.response?.data?.error || 'Failed.'); }
  };

  if (loading) return <p className="text-muted">Loading...</p>;

  return (
    <div className="fade-in">
      <div className="page-header"><h1>👤 My Profile</h1></div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', maxWidth: '800px' }}>
        <div className="card">
          <h3 style={{ marginBottom: '16px', fontSize: '1rem' }}>Profile Information</h3>
          <form onSubmit={handleProfileUpdate}>
            <div className="form-group"><label>Name</label>
              <input className="form-control" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} required /></div>
            <div className="form-group"><label>Email</label>
              <input type="email" className="form-control" value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} required /></div>
            <button type="submit" className="btn btn-primary">Save Changes</button>
          </form>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '16px', fontSize: '1rem' }}>Change Password</h3>
          <form onSubmit={handlePasswordChange}>
            <div className="form-group"><label>Current Password</label>
              <input type="password" className="form-control" value={pwForm.currentPassword} onChange={e => setPwForm({...pwForm, currentPassword: e.target.value})} required /></div>
            <div className="form-group"><label>New Password</label>
              <input type="password" className="form-control" value={pwForm.newPassword} onChange={e => setPwForm({...pwForm, newPassword: e.target.value})} required /></div>
            <div className="form-group"><label>Confirm New Password</label>
              <input type="password" className="form-control" value={pwForm.confirm} onChange={e => setPwForm({...pwForm, confirm: e.target.value})} required /></div>
            <button type="submit" className="btn btn-primary">Change Password</button>
          </form>
        </div>
      </div>
    </div>
  );
}
