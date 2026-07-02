import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import { ArrowLeft, Award, CheckCircle, XCircle, Info, Calendar } from 'lucide-react';
import gameAudio from '../../utils/AudioEngine';

export default function ReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedPlayer, setExpandedPlayer] = useState(null);

  useEffect(() => {
    const fetchReportDetail = async () => {
      try {
        const reportData = await api.get(`/reports/${id}`);
        setReport(reportData);
        // Load quiz questions
        const quizData = await api.get(`/quizzes/${reportData.quiz}`);
        setQuiz(quizData);
      } catch (err) {
        console.error('Error fetching report details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReportDetail();
  }, [id]);

  if (loading) return <div style={{ color: '#fff' }}>Loading Report Details...</div>;
  if (!report) return <div style={{ color: '#fff' }}>Report not found.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button 
          className="btn btn-outline" 
          style={{ padding: '8px' }}
          onClick={() => { gameAudio.playTick(); navigate('/admin/reports'); }}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem' }}>Report Details</h2>
          <span style={{ color: 'var(--text-gray)', fontSize: '0.85rem' }}>PIN: {report.sessionCode}</span>
        </div>
      </div>

      {/* Overview Card */}
      <div className="card" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '20px',
        background: 'linear-gradient(135deg, var(--bg-card) 0%, #17112c 100%)'
      }}>
        <div>
          <span style={{ color: 'var(--text-gray)', fontSize: '0.85rem' }}>Quiz Title</span>
          <h3 style={{ fontSize: '1.2rem', marginTop: '4px' }}>{report.quizTitle}</h3>
        </div>
        <div>
          <span style={{ color: 'var(--text-gray)', fontSize: '0.85rem' }}>Class Accuracy</span>
          <h3 style={{ fontSize: '1.6rem', marginTop: '4px', color: 'var(--accent-green)' }}>
            {report.averageAccuracy}%
          </h3>
        </div>
        <div>
          <span style={{ color: 'var(--text-gray)', fontSize: '0.85rem' }}>Total Players</span>
          <h3 style={{ fontSize: '1.6rem', marginTop: '4px' }}>{report.totalPlayers}</h3>
        </div>
        <div>
          <span style={{ color: 'var(--text-gray)', fontSize: '0.85rem' }}>Session Date</span>
          <h3 style={{ fontSize: '1.1rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={16} /> {new Date(report.createdAt).toLocaleDateString()}
          </h3>
        </div>
      </div>

      {/* Roster & Stats */}
      <div className="card" style={{ padding: '24px 0' }}>
        <h3 style={{ padding: '0 24px 16px 24px', borderBottom: '1px solid var(--border-color)', fontSize: '1.2rem' }}>
          Student Roster Performance
        </h3>

        <table className="report-table">
          <thead>
            <tr>
              <th style={{ paddingLeft: '24px' }}>Rank</th>
              <th>Player Name</th>
              <th>Total Score</th>
              <th>Accuracy</th>
              <th>Correct Answers</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {report.playerStats.map((stat, idx) => {
              const isExpanded = expandedPlayer === stat.username;
              return (
                <React.Fragment key={stat.username}>
                  <tr 
                    style={{ transition: 'var(--transition-smooth)' }}
                    className="table-row-hover"
                  >
                    <td style={{ paddingLeft: '24px', fontWeight: 800 }}>
                      {stat.rank === 1 ? <Award size={18} color="var(--accent-orange)" style={{ verticalAlign: 'middle', marginRight: '4px' }} /> : null}
                      {stat.rank}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {stat.username}
                      {stat.isBot && (
                        <span style={{
                          background: 'var(--accent-magenta)',
                          color: '#fff',
                          fontSize: '0.65rem',
                          padding: '2px 6px',
                          borderRadius: '8px',
                          marginLeft: '8px',
                          fontWeight: 700
                        }}>
                          BOT
                        </span>
                      )}
                    </td>
                    <td>{stat.score} pts</td>
                    <td>
                      <span className={`accuracy-pill ${
                        stat.accuracy >= 75 ? 'high' : stat.accuracy >= 50 ? 'medium' : 'low'
                      }`}>
                        {stat.accuracy}%
                      </span>
                    </td>
                    <td>{stat.correctAnswers} / {stat.totalQuestions}</td>
                    <td>
                      <button 
                        className="btn btn-outline" 
                        style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                        onClick={() => {
                          gameAudio.playTick();
                          setExpandedPlayer(isExpanded ? null : stat.username);
                        }}
                      >
                        {isExpanded ? 'Hide Grid' : 'Review Answers'}
                      </button>
                    </td>
                  </tr>

                  {/* Expanded detail section */}
                  {isExpanded && quiz && (
                    <tr>
                      <td colSpan={6} style={{ background: 'rgba(0,0,0,0.15)', padding: '20px 24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <h4 style={{ color: 'var(--text-gray)', fontSize: '0.9rem' }}>
                            Answer Breakdown for {stat.username}:
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {quiz.questions.map((q, qIdx) => {
                              // stat.answers could be a Map or object depending on MongoDB formatting.
                              // Our backend maps Map to standard object.
                              const selectedIdx = stat.answers[qIdx.toString()];
                              const isCorrect = selectedIdx === q.correctOptionIndex;

                              return (
                                <div 
                                  key={qIdx}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    background: isCorrect ? 'rgba(0, 206, 132, 0.06)' : 'rgba(226, 27, 60, 0.06)',
                                    borderLeft: `3px solid ${isCorrect ? 'var(--accent-green)' : 'var(--accent-magenta)'}`,
                                    alignItems: 'center'
                                  }}
                                >
                                  <div>
                                    <span style={{ fontWeight: 600 }}>Q{qIdx + 1}: {q.questionText}</span>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-gray)', marginTop: '4px' }}>
                                      Selected: <span style={{ color: isCorrect ? 'var(--accent-green)' : 'var(--accent-magenta)' }}>
                                        {selectedIdx !== undefined ? q.options[selectedIdx] : 'No Answer'}
                                      </span> 
                                      {!isCorrect && ` | Correct: ${q.options[q.correctOptionIndex]}`}
                                    </div>
                                  </div>
                                  <div>
                                    {isCorrect ? (
                                      <CheckCircle size={18} color="var(--accent-green)" />
                                    ) : (
                                      <XCircle size={18} color="var(--accent-magenta)" />
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
