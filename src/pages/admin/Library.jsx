import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import { Play, Calendar, Trash2, BookOpen, AlertCircle, Edit } from 'lucide-react';
import gameAudio from '../../utils/AudioEngine';
import { alerts } from '../../utils/alerts';

export default function Library() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      const data = await api.get('/quizzes');
      setQuizzes(data);
    } catch (err) {
      setError('Failed to load library quizzes.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartLive = async (quizId) => {
    const settings = await alerts.configureLobby('Configure Live Game Lobby');
    if (!settings) return; // Host cancelled

    gameAudio.playPowerUp();
    try {
      const session = await api.post('/sessions/live', { quizId, settings });
      navigate(`/play/${session.code}?host=true`);
    } catch (err) {
      alerts.error('Lobby Failed', 'Failed to start live session.');
    }
  };

  const handleAssignHomework = async (quizId) => {
    const settings = await alerts.configureLobby('Configure Homework Settings');
    if (!settings) return; // Host cancelled

    gameAudio.playPowerUp();
    try {
      const session = await api.post('/sessions/homework', { quizId, settings });
      alerts.success(
        'Homework Code Generated!',
        `Homework PIN: ${session.code}\n\nStudents can enter this PIN on the homepage or see it in their assigned homework list!`
      );
    } catch (err) {
      alerts.error('Assign Failed', 'Failed to assign homework session.');
    }
  };

  const handleDelete = async (quizId) => {
    const confirmDelete = await alerts.confirm('Delete Quiz?', 'Are you sure you want to delete this quiz?');
    if (!confirmDelete) return;
    gameAudio.playIncorrect();
    try {
      await api.delete(`/quizzes/${quizId}`);
      setQuizzes(quizzes.filter(q => q._id !== quizId));
    } catch (err) {
      alerts.error('Delete Failed', 'Failed to delete quiz.');
    }
  };

  if (loading) return <div style={{ color: '#fff' }}>Loading Library...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem' }}>My Quiz Library</h2>
        <button className="btn btn-primary" onClick={() => { gameAudio.playPowerUp(); navigate('/admin/create'); }}>
          Create Quiz
        </button>
      </div>

      {error && <div style={{ color: 'var(--accent-magenta)', marginBottom: '16px' }}>{error}</div>}

      {quizzes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-gray)' }}>
          <AlertCircle size={48} color="var(--primary-violet)" style={{ marginBottom: '16px' }} />
          <h3>Your Library is Empty</h3>
          <p style={{ marginTop: '8px', marginBottom: '24px', fontSize: '0.95rem' }}>
            Get started by creating a quiz manually or generating one using AI in seconds.
          </p>
          <button className="btn btn-outline" onClick={() => navigate('/admin/create')}>
            Create Your First Quiz
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px'
        }}>
          {quizzes.map((quiz) => (
            <div key={quiz._id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <span style={{
                  background: 'rgba(108, 66, 245, 0.1)',
                  color: 'var(--primary-violet)',
                  fontSize: '0.75rem',
                  padding: '4px 8px',
                  borderRadius: '10px',
                  fontWeight: 600,
                  display: 'inline-block',
                  marginBottom: '8px'
                }}>
                  {quiz.questions.length} Questions
                </span>
                <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', marginBottom: '6px' }}>
                  {quiz.title}
                </h3>
                <p style={{ color: 'var(--text-gray)', fontSize: '0.88rem', lineClamp: 2, overflow: 'hidden' }}>
                  {quiz.description || 'No description provided.'}
                </p>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                <button 
                  className="btn btn-primary" 
                  style={{ flex: 2, padding: '10px 14px', fontSize: '0.85rem', justifyContent: 'center' }}
                  onClick={() => handleStartLive(quiz._id)}
                >
                  <Play size={16} /> Start Live Quiz Game
                </button>
                <button 
                  className="btn btn-outline" 
                  style={{ 
                    border: '1px solid rgba(255, 255, 255, 0.1)', 
                    padding: '10px',
                    color: 'var(--text-gray)' 
                  }}
                  onClick={() => { gameAudio.playTick(); navigate(`/admin/create?edit=${quiz._id}`); }}
                  title="Edit Quiz"
                >
                  <Edit size={16} />
                </button>
                <button 
                  className="btn btn-outline" 
                  style={{ 
                    border: '1px solid rgba(232, 44, 136, 0.2)', 
                    color: 'var(--accent-magenta)',
                    padding: '10px' 
                  }}
                  onClick={() => handleDelete(quiz._id)}
                  title="Delete Quiz"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
