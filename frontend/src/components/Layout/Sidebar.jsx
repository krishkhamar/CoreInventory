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
        <span style={{ fontSize: '1.4rem' }}>📦</span>
        <span className="logo-text">CoreInventory</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(section => (
          <div key={section.section}>
            <div className="nav-section-title">{section.section}</div>
            {section.items.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}

        <div className="nav-section-title" style={{ marginTop: '8px' }}>Account</div>
        <div className="nav-item" onClick={handleLogout} style={{ cursor: 'pointer' }}>
          <span className="nav-icon">🚪</span>
          <span className="nav-label">Logout</span>
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="user-avatar">{initials}</div>
        <div className="user-info">
          <div className="user-name">{user?.name || 'User'}</div>
          <div className="user-email">{user?.email || ''}</div>
        </div>
      </div>
    </aside>
  );
}
