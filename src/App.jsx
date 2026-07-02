import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { api } from './utils/api';

// Page Imports
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import Library from './pages/admin/Library';
import QuizCreator from './pages/admin/QuizCreator';
import Reports from './pages/admin/Reports';
import ReportDetail from './pages/admin/ReportDetail';
import TeacherClassrooms from './pages/admin/TeacherClassrooms';
import SuperAdmin from './pages/admin/SuperAdmin';

import StudentLayout from './pages/student/StudentLayout';
import StudentDashboard from './pages/student/StudentDashboard';
import History from './pages/student/History';
import Flashcards from './pages/student/Flashcards';
import Classrooms from './pages/student/Classrooms';
import AvatarShop from './pages/student/AvatarShop';

import Arena from './pages/play/Arena';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const data = await api.get('/auth/me');
          setUser(data.user);
        }
      } catch (err) {
        console.error('Session expired');
        localStorage.removeItem('token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0c0c14',
        color: '#ffffff',
        fontFamily: 'sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ marginBottom: '10px' }}>Loading Live Gaming Center...</h2>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid rgba(255,255,255,0.1)',
            borderTop: '4px solid #6c42f5',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // Protected route wrapper
  const ProtectedRoute = ({ children, allowedRole }) => {
    if (!user) {
      return <Navigate to="/auth" replace />;
    }
    if (allowedRole && user.role !== allowedRole) {
      return <Navigate to={user.role === 'teacher' ? '/admin' : '/student'} replace />;
    }
    return children;
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Landing */}
        <Route path="/" element={<Landing user={user} />} />
        <Route path="/auth" element={<Auth user={user} onLogin={handleLogin} />} />

        {/* Admin/Teacher Dashboard */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRole="teacher">
            <AdminLayout user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="library" element={<Library />} />
          <Route path="create" element={<QuizCreator />} />
          <Route path="reports" element={<Reports />} />
          <Route path="reports/:id" element={<ReportDetail />} />
          <Route path="classrooms" element={<TeacherClassrooms />} />
          <Route path="super" element={<SuperAdmin />} />
        </Route>

        {/* Student Dashboard */}
        <Route path="/student" element={
          <ProtectedRoute allowedRole="student">
            <StudentLayout user={user} onLogout={handleLogout} />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<StudentDashboard user={user} />} />
          <Route path="completed" element={<History />} />
          <Route path="flashcards" element={<Flashcards />} />
          <Route path="classrooms" element={<Classrooms />} />
          <Route path="shop" element={<AvatarShop />} />
        </Route>

        {/* Gamified Play Arena */}
        <Route path="/play/:code" element={<Arena user={user} />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
