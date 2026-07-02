import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { api } from '../utils/api';
import { ShieldAlert } from 'lucide-react';
import gameAudio from '../utils/AudioEngine';

export default function Auth({ user, onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('student'); // 'student' | 'teacher'
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const navigate = useNavigate();

  // If already logged in, redirect
  if (user) {
    return <Navigate to={user.role === 'teacher' ? '/admin' : '/student'} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    gameAudio.playPowerUp();

    try {
      if (isLogin) {
        // Log In
        const data = await api.post('/auth/login', { email, password });
        onLogin(data.user, data.token);
      } else {
        // Sign Up
        if (!username) {
          setError('Username is required for sign up.');
          setSubmitting(false);
          return;
        }
        const data = await api.post('/auth/signup', { username, email, password, role });
        onLogin(data.user, data.token);
      }
    } catch (err) {
      setError(err.message || 'Authorization failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="landing-hero" style={{ padding: '40px 20px' }}>
      <div style={{
        position: 'absolute',
        top: '30px',
        fontFamily: 'var(--font-display)',
        fontWeight: 800,
        fontSize: '2rem'
      }}>
        <span style={{ color: 'var(--accent-magenta)' }}>Live Gaming</span> Center
      </div>

      <div className="auth-container">
        <div className="auth-tabs">
          <div 
            className={`auth-tab ${isLogin ? 'active' : ''}`}
            onClick={() => { setIsLogin(true); setError(''); }}
          >
            Login
          </div>
          <div 
            className={`auth-tab ${!isLogin ? 'active' : ''}`}
            onClick={() => { setIsLogin(false); setError(''); }}
          >
            Sign Up
          </div>
        </div>

        {error && (
          <div style={{
            background: 'rgba(232, 44, 136, 0.15)',
            border: '1px solid var(--accent-magenta)',
            borderRadius: '8px',
            padding: '12px',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.85rem',
            marginBottom: '20px'
          }}>
            <ShieldAlert size={16} color="var(--accent-magenta)" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexType: 'column', flexDirection: 'column', gap: '16px' }}>
          
          {!isLogin && (
            <div className="form-group">
              <label>Student ID</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. SR1234 (Optional, leaves blank to auto-generate)" 
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>
          )}

          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email" 
              className="form-input" 
              placeholder="name@school.com" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="••••••••" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>



          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '14px', justifyContent: 'center', marginTop: '10px' }}
            disabled={submitting}
          >
            {submitting ? 'Authenticating...' : isLogin ? 'Log In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
