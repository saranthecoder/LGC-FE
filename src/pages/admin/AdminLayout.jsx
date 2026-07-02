import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Library, PlusCircle, BarChart3, LogOut, GraduationCap, Users, Shield } from 'lucide-react';
import gameAudio from '../../utils/AudioEngine';

export default function AdminLayout({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogoutClick = () => {
    gameAudio.playPowerUp();
    onLogout();
    navigate('/');
  };

  const navItems = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={20} /> },
    { label: 'My Library', path: '/admin/library', icon: <Library size={20} /> },
    { label: 'Create Quiz', path: '/admin/create', icon: <PlusCircle size={20} /> },
    { label: 'Reports', path: '/admin/reports', icon: <BarChart3 size={20} /> },
    { label: 'Super Admin', path: '/admin/super', icon: <Shield size={20} /> }
  ];

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <GraduationCap size={28} style={{ color: 'var(--primary-violet)' }} />
          <span>Live Gaming Center</span>
        </div>

        <nav className="sidebar-menu">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <div 
                key={item.path}
                className={`sidebar-item ${isActive ? 'active' : ''}`}
                onClick={() => { gameAudio.playTick(); navigate(item.path); }}
              >
                {item.icon}
                <span>{item.label}</span>
              </div>
            );
          })}
        </nav>

        <div style={{ marginTop: 'auto' }}>
          <div 
            className="sidebar-item" 
            style={{ color: 'var(--accent-magenta)' }}
            onClick={handleLogoutClick}
          >
            <LogOut size={20} />
            <span>Log Out</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="dashboard-main">
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '16px'
        }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontFamily: 'var(--font-display)' }}>
              Teacher Panel
            </h1>
            <p style={{ color: 'var(--text-gray)', fontSize: '0.9rem' }}>
              Welcome back, {user?.username || 'Teacher'}
            </p>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'rgba(255,255,255,0.03)',
            padding: '8px 16px',
            borderRadius: '20px',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--primary-violet)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800
            }}>
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontWeight: 600 }}>{user?.username}</span>
          </div>
        </header>

        {/* Dynamic Outlet */}
        <Outlet />
      </main>
    </div>
  );
}
