import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Gamepad2, ArrowRight, ShieldCheck, Sparkles, BookOpen } from 'lucide-react';
import gameAudio from '../utils/AudioEngine';

export default function Landing({ user }) {
  const navigate = useNavigate();

  return (
    <div className="landing-hero" style={{ overflow: 'hidden', position: 'relative' }}>
      
      {/* Floating Animated Emojis for Gamification Experience */}
      <div className="floating-particle" style={{ position: 'absolute', top: '15%', left: '8%', fontSize: '3rem', zIndex: 1, animation: 'floatAnim 5s ease-in-out infinite', filter: 'drop-shadow(0 0 15px rgba(108,66,245,0.4))' }}>🎮</div>
      <div className="floating-particle" style={{ position: 'absolute', top: '65%', left: '12%', fontSize: '3.5rem', zIndex: 1, animation: 'floatAnim 7s ease-in-out infinite', animationDelay: '1s', filter: 'drop-shadow(0 0 15px rgba(242,137,41,0.4))' }}>🏆</div>
      <div className="floating-particle" style={{ position: 'absolute', top: '22%', right: '10%', fontSize: '2.8rem', zIndex: 1, animation: 'floatAnim 6s ease-in-out infinite', animationDelay: '0.5s', filter: 'drop-shadow(0 0 15px rgba(232,44,136,0.4))' }}>⚡</div>
      <div className="floating-particle" style={{ position: 'absolute', top: '70%', right: '14%', fontSize: '3.2rem', zIndex: 1, animation: 'floatAnim 8s ease-in-out infinite', animationDelay: '1.5s', filter: 'drop-shadow(0 0 15px rgba(0,206,132,0.4))' }}>🔥</div>
      <div className="floating-particle" style={{ position: 'absolute', top: '42%', left: '4%', fontSize: '2rem', zIndex: 1, animation: 'floatAnim 5.5s ease-in-out infinite', animationDelay: '0.2s', filter: 'drop-shadow(0 0 15px rgba(242,184,7,0.4))' }}>⭐</div>
      <div className="floating-particle" style={{ position: 'absolute', top: '48%', right: '6%', fontSize: '2.5rem', zIndex: 1, animation: 'floatAnim 6.5s ease-in-out infinite', animationDelay: '0.8s', filter: 'drop-shadow(0 0 15px rgba(108,66,245,0.4))' }}>🎯</div>

      <style>{`
        @keyframes floatAnim {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(8deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
      `}</style>

      {/* Header Bar */}
      <header style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        padding: '20px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 5
      }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: '1.8rem',
          letterSpacing: '-0.5px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ color: 'var(--accent-magenta)' }}>Live Gaming</span>
          <span> Center</span>
        </div>
        
        <div>
          {user ? (
            <Link to={user.role === 'teacher' ? '/admin' : '/student'} className="btn btn-primary">
              Go to Dashboard <ArrowRight size={18} />
            </Link>
          ) : (
            <Link to="/auth" className="btn btn-outline" style={{ border: '1px solid var(--primary-violet)' }} onClick={() => gameAudio.playTick()}>
              Student Login / Register
            </Link>
          )}
        </div>
      </header>

      {/* Main Content Box */}
      <main style={{ zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
        <div className="code-entry-box" style={{ padding: '40px', gap: '20px', textAlign: 'center', position: 'relative', zIndex: 3 }}>
          <Gamepad2 size={56} color="var(--primary-violet)" style={{ margin: '0 auto 10px' }} />
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 800 }}>
            Live Gaming Center
          </h1>
          <p style={{ color: 'var(--text-gray)', fontSize: '1rem', lineHeight: '1.6', maxWidth: '400px', margin: '0 auto' }}>
            Gamify your learning! Conduct live multiplayer quizzes, track performance, and master any subject together.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', marginTop: '10px' }}>
            {user ? (
              <button 
                className="btn btn-primary" 
                style={{ justifyContent: 'center', padding: '14px', fontSize: '1rem' }} 
                onClick={() => { gameAudio.playPowerUp(); navigate(user.role === 'teacher' ? '/admin' : '/student'); }}
              >
                Go to My Dashboard <ArrowRight size={18} />
              </button>
            ) : (
              <button 
                className="btn btn-primary" 
                style={{ justifyContent: 'center', padding: '14px', fontSize: '1rem' }} 
                onClick={() => { gameAudio.playPowerUp(); navigate('/auth'); }}
              >
                Student Login / Register <ArrowRight size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Informational Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
          maxWidth: '900px',
          width: '100%',
          marginTop: '60px',
          padding: '0 20px',
          position: 'relative',
          zIndex: 3
        }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <BookOpen color="var(--primary-violet)" />
              <h3>Rich Gamification</h3>
            </div>
            <p style={{ color: 'var(--text-gray)', fontSize: '0.9rem', lineHeight: '1.5' }}>
              Earn points, unlock cool performance badges, maintain correct streaks, and buy power-ups like Double Points to dominate the board!
            </p>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Sparkles color="var(--accent-magenta)" />
              <h3>AI-Generated Quizzes</h3>
            </div>
            <p style={{ color: 'var(--text-gray)', fontSize: '0.9rem', lineHeight: '1.5' }}>
              Teachers can generate complete quizzes in seconds on any academic topic by typing simple natural language prompts.
            </p>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck color="var(--accent-green)" />
              <h3>Classroom Reports</h3>
            </div>
            <p style={{ color: 'var(--text-gray)', fontSize: '0.9rem', lineHeight: '1.5' }}>
              Deep-dive metrics showing precise player details, average accuracy, response speed, and performance tracking.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
