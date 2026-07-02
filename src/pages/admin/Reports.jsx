import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import { BarChart3, ChevronRight, AlertCircle } from 'lucide-react';
import gameAudio from '../../utils/AudioEngine';

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const data = await api.get('/reports');
        setReports(data);
      } catch (err) {
        console.error('Failed to load reports:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const handleRowClick = (id) => {
    gameAudio.playTick();
    navigate(`/admin/reports/${id}`);
  };

  if (loading) return <div style={{ color: '#fff' }}>Loading Reports...</div>;

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: '24px' }}>
        Quiz Performance Reports
      </h2>

      {reports.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-gray)' }}>
          <AlertCircle size={48} color="var(--primary-violet)" style={{ marginBottom: '16px' }} />
          <h3>No Reports Available</h3>
          <p style={{ marginTop: '8px', fontSize: '0.95rem' }}>
            When students complete active live sessions or homework games, their results will appear here.
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="report-table">
            <thead>
              <tr>
                <th>Quiz Title</th>
                <th>Game PIN</th>
                <th>Run Date</th>
                <th>Mode</th>
                <th>Players</th>
                <th>Avg. Accuracy</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr 
                  key={report._id}
                  onClick={() => handleRowClick(report._id)}
                  style={{ cursor: 'pointer', transition: 'var(--transition-smooth)' }}
                  className="table-row-hover"
                >
                  <td style={{ fontWeight: 600 }}>{report.quizTitle}</td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{report.sessionCode}</td>
                  <td style={{ color: 'var(--text-gray)', fontSize: '0.85rem' }}>
                    {new Date(report.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{report.type}</td>
                  <td>{report.totalPlayers}</td>
                  <td>
                    <span className={`accuracy-pill ${
                      report.averageAccuracy >= 75 ? 'high' : report.averageAccuracy >= 50 ? 'medium' : 'low'
                    }`}>
                      {report.averageAccuracy}%
                    </span>
                  </td>
                  <td>
                    <ChevronRight size={18} color="var(--text-dim)" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <style>{`
            .table-row-hover:hover {
              background: rgba(255,255,255,0.03);
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
