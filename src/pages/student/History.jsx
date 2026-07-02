import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { Award, CheckCircle, BarChart, Calendar } from 'lucide-react';

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await api.get('/student/history');
        setHistory(data);
      } catch (err) {
        console.error('Failed to load student history:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  if (loading) return <div style={{ color: '#fff' }}>Loading Performance History...</div>;

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: '24px' }}>
        My Quiz History
      </h2>

      {history.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-gray)' }}>
          <CheckCircle size={48} color="var(--primary-violet)" style={{ marginBottom: '16px' }} />
          <h3>No Quizzes Played Yet</h3>
          <p style={{ marginTop: '8px', fontSize: '0.95rem' }}>
            Enter a code on the dashboard or play assigned homework to see your score stats here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {history.map((run, idx) => (
            <div 
              key={idx} 
              className="card"
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1fr',
                alignItems: 'center',
                gap: '16px',
                padding: '20px 24px'
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '6px' }}>{run.quizTitle}</h3>
                <span style={{
                  color: 'var(--text-gray)',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Calendar size={14} /> Played on {new Date(run.createdAt).toLocaleDateString()} • PIN: {run.sessionCode}
                </span>
              </div>

              <div>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>Score</span>
                <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--accent-orange)' }}>
                  {run.score} XP
                </div>
              </div>

              <div>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>Accuracy</span>
                <div>
                  <span className={`accuracy-pill ${
                    run.accuracy >= 75 ? 'high' : run.accuracy >= 50 ? 'medium' : 'low'
                  }`}>
                    {run.accuracy}%
                  </span>
                </div>
              </div>

              <div>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>Rank</span>
                <div style={{ fontWeight: 800, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Award size={18} color="var(--primary-violet)" /> #{run.rank} / {run.totalPlayers}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
