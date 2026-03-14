import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';

const navItems = [
  { section: 'Overview', items: [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  ]},
  { section: 'Products', items: [
    { path: '/products', label: 'Products', icon: '📦' },
    { path: '/categories', label: 'Categories', icon: '🏷️' },
  ]},
  { section: 'Operations', items: [
    { path: '/receipts', label: 'Receipts', icon: '📥' },
    { path: '/deliveries', label: 'Delivery Orders', icon: '📤' },
    { path: '/transfers', label: 'Internal Transfers', icon: '🔄' },
    { path: '/adjustments', label: 'Adjustments', icon: '⚖️' },
    { path: '/move-history', label: 'Move History', icon: '📋' },
  ]},
  { section: 'Settings', items: [
    { path: '/warehouses', label: 'Warehouses', icon: '🏭' },
    { path: '/profile', label: 'My Profile', icon: '👤' },
  ]},
];

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  const initials = user?.name ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : 'U';

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo-container">
          <span style={{ fontSize: '1.4rem' }}>📦</span>
          {!collapsed && <span className="logo-text">CoreInventory</span>}
        </div>
      </div>

      <nav className="nav-links">
        {navItems.map(section => (
          <div key={section.section}>
            <div className="nav-section">{section.section}</div>
            {section.items.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                title={collapsed ? item.label : ''}
              >
                <span className="nav-icon">{item.icon}</span>
                {!collapsed && <span className="nav-label">{item.label}</span>}
              </NavLink>
            ))}
          </div>
        ))}

        <div className="nav-section" style={{ marginTop: 'auto' }}>Account</div>
        <div className="nav-item" onClick={handleLogout} style={{ cursor: 'pointer' }} title={collapsed ? 'Logout' : ''}>
          <span className="nav-icon">🚪</span>
          {!collapsed && <span className="nav-label">Logout</span>}
        </div>
      </nav>

      <div className="profile-section">
        <button className="profile-btn" onClick={() => navigate('/profile')}>
          <div className="avatar">{initials}</div>
          {!collapsed && (
            <div className="profile-info">
              <div className="profile-name">{user?.name || 'User'}</div>
              <div className="profile-role">{user?.role || 'Administrator'}</div>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}
