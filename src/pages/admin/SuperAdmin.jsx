import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { alerts } from '../../utils/alerts';
import gameAudio from '../../utils/AudioEngine';
import { Shield, Users, BarChart3, ShieldAlert, Cpu, Award } from 'lucide-react';

export default function SuperAdmin() {
  const [stats, setStats] = useState({
    totalUsers: 1420,
    teachersCount: 180,
    studentsCount: 1240,
    totalQuizzes: 480,
    activeSessions: 14,
    reportedQuizzes: 3,
    aiTokensUsed: 84200,
    premiumRevenue: 4250
  });
  const [loading, setLoading] = useState(false);

  // Mock reported quizzes list
  const reportedQuizzes = [
    { _id: '1', title: 'Calculus Cheat Sheet Test', reason: 'Copyrighted textbook material', creator: 'CheatMaster' },
    { _id: '2', title: 'Offensive Language Vocab Quiz', reason: 'Inappropriate vocabulary words', creator: 'SpamUser' }
  ];

  const handleApproveQuiz = (id) => {
    gameAudio.playCorrect();
    alerts.success('Approved!', 'Quiz cleared of reports and marked safe.');
  };

  const handleRemoveQuiz = (id) => {
    gameAudio.playIncorrect();
    alerts.success('Removed!', 'Quiz permanently deleted from the platform.');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', padding: '16px' }}>
      
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--accent-magenta)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Shield size={28} /> Super Admin Control Console
        </h2>
        <p style={{ color: 'var(--text-gray)', fontSize: '0.9rem', marginTop: '4px' }}>
          Monitor system health, moderate public content, and audit platform API usage!
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px'
      }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(108,66,245,0.08)', borderRadius: '12px' }}>
            <Users size={24} color="var(--primary-violet)" />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-gray)' }}>Total Enrolled Users</span>
            <h4 style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '4px' }}>{stats.totalUsers}</h4>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(31,167,255,0.08)', borderRadius: '12px' }}>
            <BarChart3 size={24} color="var(--accent-blue)" />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-gray)' }}>Created Quizzes</span>
            <h4 style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '4px' }}>{stats.totalQuizzes}</h4>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(242,137,41,0.08)', borderRadius: '12px' }}>
            <Award size={24} color="var(--accent-orange)" />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-gray)' }}>Active Game Lobbies</span>
            <h4 style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '4px' }}>{stats.activeSessions}</h4>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(232,44,136,0.08)', borderRadius: '12px' }}>
            <Cpu size={24} color="var(--accent-magenta)" />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-gray)' }}>AI Tokens Budget</span>
            <h4 style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '4px' }}>{stats.aiTokensUsed}</h4>
          </div>
        </div>
      </div>

      {/* Moderation Queue */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        
        {/* Reported Content */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--accent-magenta)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={18} /> Reported Content Queue ({reportedQuizzes.length})
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {reportedQuizzes.map(q => (
              <div key={q._id} style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <h4 style={{ fontWeight: 700, fontSize: '0.98rem' }}>{q.title}</h4>
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Created by {q.creator}</span>
                </div>
                <p style={{ color: 'var(--accent-magenta)', fontSize: '0.8rem' }}>
                  Reason: {q.reason}
                </p>
                <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                  <button 
                    className="btn btn-outline" 
                    onClick={() => handleApproveQuiz(q._id)}
                    style={{ fontSize: '0.75rem', padding: '4px 10px', borderColor: 'var(--accent-green)', color: 'var(--accent-green)' }}
                  >
                    Clear & Approve
                  </button>
                  <button 
                    className="btn btn-outline" 
                    onClick={() => handleRemoveQuiz(q._id)}
                    style={{ fontSize: '0.75rem', padding: '4px 10px', borderColor: 'var(--accent-magenta)', color: 'var(--accent-magenta)' }}
                  >
                    Delete Content
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Usage Tracker */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={18} color="var(--primary-violet)" /> AI Usage & System Health
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                <span>AI Prompt Tokens Used</span>
                <span>84.2% (Budget: 100k)</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '84.2%', height: '100%', background: 'var(--primary-violet)' }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                <span>Server API Health</span>
                <span style={{ color: 'var(--accent-green)' }}>99.9% (Normal)</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '99.9%', height: '100%', background: 'var(--accent-green)' }}></div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255,255,255,0.01)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-gray)' }}>Database Engine</span>
                <span style={{ fontWeight: 600 }}>MongoDB Cluster Atlas</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-gray)' }}>Premium Subscriptions</span>
                <span style={{ fontWeight: 600 }}>$4,250 Month Revenue</span>
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
