import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Gamepad2, History, Award, BookOpen, LogOut, Users, Coins } from 'lucide-react';
import gameAudio from '../../utils/AudioEngine';

export default function StudentLayout({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogoutClick = () => {
    gameAudio.playPowerUp();
    onLogout();
    navigate('/');
  };

  const navItems = [
    { label: 'Join / Dashboard', path: '/student/dashboard', icon: <Gamepad2 size={20} /> },
    { label: 'My Performance', path: '/student/completed', icon: <History size={20} /> }
  ];

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Award size={28} style={{ color: 'var(--accent-orange)' }} />
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
              Student Hub
            </h1>
            <p style={{ color: 'var(--text-gray)', fontSize: '0.9rem' }}>
              Study hard, play harder!
            </p>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            {/* Points / XP display */}
            <div style={{
              background: 'rgba(242, 137, 41, 0.1)',
              color: 'var(--accent-orange)',
              border: '1px solid rgba(242, 137, 41, 0.2)',
              padding: '6px 14px',
              borderRadius: '20px',
              fontWeight: 800,
              fontFamily: 'var(--font-display)',
              fontSize: '0.9rem'
            }}>
              {user?.points || 0} XP
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
                background: 'var(--accent-magenta)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800
              }}>
                {user?.username?.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontWeight: 600 }}>{user?.username}</span>
            </div>
          </div>
        </header>

        {/* Dynamic Outlet */}
        <Outlet />
      </main>
    </div>
  );
}
