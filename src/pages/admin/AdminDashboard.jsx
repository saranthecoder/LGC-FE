import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import { BookOpen, Users, BarChart2, PlusCircle, Search } from 'lucide-react';
import gameAudio from '../../utils/AudioEngine';
import { alerts } from '../../utils/alerts';

export default function AdminDashboard() {
  const [quizzes, setQuizzes] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const quizData = await api.get('/quizzes');
        const reportData = await api.get('/reports');
        setQuizzes(quizData);
        setReports(reportData);
      } catch (err) {
        console.error('Error fetching dashboard statistics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Quick calculations
  const totalQuizzes = quizzes.length;
  const totalRuns = reports.length;
  const avgAccuracy = reports.length > 0 
    ? Math.round(reports.reduce((sum, r) => sum + r.averageAccuracy, 0) / reports.length) 
    : 0;

  const handleCreateClick = () => {
    gameAudio.playPowerUp();
    navigate('/admin/create');
  };

  const communityQuizzes = [
    { title: 'Algebra & Equations 101', questionsCount: 3, creator: 'Prof. Gauss', category: 'Math' },
    { title: 'Cell Biology & Mitosis', questionsCount: 3, creator: 'Dr. Pasteur', category: 'Biology' },
    { title: 'World War II Timeline', questionsCount: 2, creator: 'Ms. Clio', category: 'History' }
  ];

  const handleUseTemplate = async (template) => {
    gameAudio.playPowerUp();
    
    let templateQuestions = [];
    if (template.title === 'Algebra & Equations 101') {
      templateQuestions = [
        {
          questionText: "Solve for x: 2x + 7 = 15",
          type: "mcq",
          options: ["x = 3", "x = 4", "x = 5", "x = 6"],
          correctOptionIndex: 1,
          timeLimit: 20
        },
        {
          questionText: "What is the value of x^2 - 4 when x = 3?",
          type: "mcq",
          options: ["5", "4", "6", "3"],
          correctOptionIndex: 0,
          timeLimit: 20
        },
        {
          questionText: "True or False: x = 2 is a solution to 3x + 4 = 10.",
          type: "tf",
          options: ["True", "False"],
          correctOptionIndex: 0,
          timeLimit: 15
        }
      ];
    } else if (template.title === 'Cell Biology & Mitosis') {
      templateQuestions = [
        {
          questionText: "Which organelle is known as the powerhouse of the cell?",
          type: "mcq",
          options: ["Nucleus", "Ribosome", "Mitochondria", "Golgi body"],
          correctOptionIndex: 2,
          timeLimit: 15
        },
        {
          questionText: "True or False: Mitosis results in four daughter cells.",
          type: "tf",
          options: ["True", "False"],
          correctOptionIndex: 1,
          timeLimit: 15
        },
        {
          questionText: "What is the outer layer of a plant cell called?",
          type: "fib",
          correctAnswers: ["Cell Wall"],
          timeLimit: 20
        }
      ];
    } else {
      templateQuestions = [
        {
          questionText: "In which year did World War II end?",
          type: "mcq",
          options: ["1943", "1944", "1945", "1946"],
          correctOptionIndex: 2,
          timeLimit: 15
        },
        {
          questionText: "True or False: The United States entered WWII immediately in 1939.",
          type: "tf",
          options: ["True", "False"],
          correctOptionIndex: 1,
          timeLimit: 15
        }
      ];
    }

    try {
      await api.post('/quizzes', {
        title: template.title,
        description: `Imported community template quiz about ${template.category}.`,
        questions: templateQuestions
      });
      gameAudio.playCorrect();
      alerts.success('Template Added!', `Quiz "${template.title}" has been successfully added to your My Library!`);
      navigate('/admin/library');
    } catch (err) {
      alerts.error('Import Failed', err.message || 'Failed to import template.');
    }
  };

  return (
    <div>
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="card stat-card">
          <div>
            <span style={{ color: 'var(--text-gray)', fontSize: '0.9rem' }}>Created Quizzes</span>
            <div className="stat-val">{totalQuizzes}</div>
          </div>
          <BookOpen size={36} color="var(--primary-violet)" />
        </div>

        <div className="card stat-card">
          <div>
            <span style={{ color: 'var(--text-gray)', fontSize: '0.9rem' }}>Total Play Sessions</span>
            <div className="stat-val">{totalRuns}</div>
          </div>
          <Users size={36} color="var(--accent-magenta)" />
        </div>

        <div className="card stat-card">
          <div>
            <span style={{ color: 'var(--text-gray)', fontSize: '0.9rem' }}>Average Accuracy</span>
            <div className="stat-val">{avgAccuracy}%</div>
          </div>
          <BarChart2 size={36} color="var(--accent-green)" />
        </div>
      </div>

      {/* Main Grid split */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px', marginTop: '32px' }}>
        
        {/* Left Side: Templates explore */}
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', marginBottom: '16px' }}>
            Explore Community Templates
          </h2>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '12px 16px',
            marginBottom: '20px'
          }}>
            <Search size={20} color="var(--text-dim)" style={{ marginRight: '10px' }} />
            <input 
              type="text" 
              placeholder="Search math, chemistry, geography templates..." 
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                outline: 'none',
                width: '100%',
                fontSize: '0.95rem'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {communityQuizzes.map((cq, idx) => (
              <div 
                key={idx}
                className="card"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 24px',
                  cursor: 'pointer'
                }}
                onClick={() => handleUseTemplate(cq)}
              >
                <div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>{cq.title}</h3>
                  <span style={{ color: 'var(--text-gray)', fontSize: '0.85rem' }}>
                    {cq.category} • {cq.questionsCount} Questions • Created by {cq.creator}
                  </span>
                </div>
                <button className="btn btn-outline" style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
                  Use Template
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Quick Actions */}
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', marginBottom: '16px' }}>
            Quick Actions
          </h2>
          
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-gray)', fontSize: '0.9rem' }}>
              Want to create a test instantly? Use our advanced AI quiz creator or compose it manually!
            </p>
            <button 
              className="btn btn-primary"
              style={{ justifyContent: 'center', padding: '12px' }}
              onClick={handleCreateClick}
            >
              <PlusCircle size={20} /> Create New Quiz
            </button>
            <button 
              className="btn btn-outline"
              style={{ justifyContent: 'center', padding: '12px' }}
              onClick={() => { gameAudio.playTick(); navigate('/admin/library'); }}
            >
              View My Library
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
