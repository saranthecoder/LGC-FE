import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import { alerts } from '../../utils/alerts';
import gameAudio from '../../utils/AudioEngine';
import { Plus, Users, Calendar, ArrowRight, Megaphone, BookOpen } from 'lucide-react';

export default function Classrooms() {
  const [classrooms, setClassrooms] = useState([]);
  const [classCode, setClassCode] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const fetchClassrooms = async () => {
    try {
      const data = await api.get('/classrooms');
      setClassrooms(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClass = async (e) => {
    e.preventDefault();
    if (!classCode.trim()) return;
    gameAudio.playPowerUp();

    try {
      await api.post('/classrooms/join', { code: classCode.trim() });
      alerts.success('Success!', 'You have joined the classroom!');
      setClassCode('');
      fetchClassrooms();
    } catch (err) {
      alerts.error('Join Failed', err.message);
    }
  };

  const handleLaunchAssignment = async (quizId) => {
    gameAudio.playPowerUp();
    try {
      // Find or create a session code for homework play
      const session = await api.post('/sessions/homework', { quizId });
      navigate(`/play/${session.code}`);
    } catch (err) {
      alerts.error('Launch Failed', 'Could not open assignment session.');
    }
  };

  if (loading) return <div style={{ color: '#fff', padding: '24px' }}>Loading classrooms...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', padding: '16px' }}>
      
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--primary-violet)' }}>
          My Classrooms
        </h2>
        <p style={{ color: 'var(--text-gray)', fontSize: '0.9rem', marginTop: '4px' }}>
          Enter a class code to enroll, check bulletins, and solve assigned quizzes!
        </p>
      </div>

      {/* Classroom Join Input */}
      <div className="card" style={{ maxWidth: '600px' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '12px' }}>Join Class</h3>
        <form onSubmit={handleJoinClass} style={{ display: 'flex', gap: '12px' }}>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Enter 6-digit class code" 
            value={classCode}
            onChange={e => setClassCode(e.target.value)}
            maxLength={6}
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn btn-primary" disabled={!classCode.trim()}>
            <Plus size={16} /> Enroll Class
          </button>
        </form>
      </div>

      {/* Classroom List grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {classrooms.map((cls) => (
          <div key={cls._id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700 }}>{cls.name}</h3>
              <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                Teacher: {cls.teacher?.username || 'Teacher'}
              </span>
            </div>

            {/* Assignments Section */}
            <div>
              <h4 style={{ fontSize: '0.95rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-blue)' }}>
                <BookOpen size={16} /> Assigned Quizzes
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {cls.assignments?.map((assign, aIdx) => (
                  <div 
                    key={aIdx} 
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                        Assignment {aIdx + 1}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                        Assigned on: {new Date(assign.assignedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <button 
                      className="btn btn-primary"
                      onClick={() => handleLaunchAssignment(assign.quizId)}
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    >
                      Play <ArrowRight size={12} />
                    </button>
                  </div>
                ))}
                {(!cls.assignments || cls.assignments.length === 0) && (
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>No assignments yet!</span>
                )}
              </div>
            </div>

            {/* Bulletins Section */}
            <div>
              <h4 style={{ fontSize: '0.95rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-orange)' }}>
                <Megaphone size={16} /> Bulletins
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                {cls.announcements?.slice().reverse().map((ann, aIdx) => (
                  <div key={aIdx} style={{ background: 'rgba(255,255,255,0.01)', padding: '10px 12px', borderRadius: '6px', fontSize: '0.8rem' }}>
                    <p style={{ lineHeight: 1.5 }}>{ann.content}</p>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '4px', display: 'inline-block' }}>
                      {new Date(ann.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
                {(!cls.announcements || cls.announcements.length === 0) && (
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>No bulletins posted.</span>
                )}
              </div>
            </div>

          </div>
        ))}

        {classrooms.length === 0 && (
          <div style={{ color: 'var(--text-dim)', fontSize: '0.95rem' }}>
            You haven't joined any classrooms yet. Input a join code to connect with your teacher.
          </div>
        )}
      </div>

    </div>
  );
}
