import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import confetti from 'canvas-confetti';
import { Volume2, VolumeX, Users, Play, Gamepad2, Award, ArrowRight, Check, X, ShieldAlert, Zap } from 'lucide-react';
import gameAudio from '../../utils/AudioEngine';
import { api } from '../../utils/api';
import { alerts } from '../../utils/alerts';

export default function Arena({ user }) {
  const { code } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const nickname = searchParams.get('name') || 'Guest-' + Math.floor(Math.random() * 1000);
  const isHost = searchParams.get('host') === 'true';
  const isHomework = searchParams.get('homework') === 'true';

  // Game States
  const [gameState, setGameState] = useState('lobby'); // 'lobby' | 'active' | 'completed'
  const [players, setPlayers] = useState([]);
  const [quizInfo, setQuizInfo] = useState({ title: '', description: '', totalQuestions: 0 });
  const [questions, setQuestions] = useState([]);
  const questionsRef = useRef(questions);
  useEffect(() => { questionsRef.current = questions; }, [questions]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  
  // Active Question Play States
  const [timer, setTimer] = useState(30);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [feedback, setFeedback] = useState(null); // { isCorrect, pointsEarned, correctOptionIndex }
  const [doublePointsActive, setDoublePointsActive] = useState(false);
  const [powerUpUsed, setPowerUpUsed] = useState(false); // Can only use once per game
  const [shieldActive, setShieldActive] = useState(false);
  const [timeFrozen, setTimeFrozen] = useState(false);
  const [shieldUsed, setShieldUsed] = useState(false);
  const [freezeUsed, setFreezeUsed] = useState(false);
  const [fibInput, setFibInput] = useState('');
  const [selectedMatches, setSelectedMatches] = useState({});
  const [hostTimerPaused, setHostTimerPaused] = useState(false);
  const [stage, setStage] = useState('question'); // 'question' | 'waiting' | 'feedback' | 'leaderboard'
  const [hostDoublePointsActive, setHostDoublePointsActive] = useState(false);
  const [hostShieldActive, setHostShieldActive] = useState(false);

  const timerRef = useRef(timer);
  const hasAnsweredRef = useRef(hasAnswered);
  useEffect(() => { timerRef.current = timer; }, [timer]);
  useEffect(() => { hasAnsweredRef.current = hasAnswered; }, [hasAnswered]);

  useEffect(() => {
    if (stage === 'feedback' && feedback) {
      if (feedback.isCorrect) {
        gameAudio.playCorrect();
      } else {
        gameAudio.playIncorrect();
      }
    }
  }, [stage, feedback]);

  const useShield = () => {
    if (shieldUsed || hasAnswered) return;
    gameAudio.playPowerUp();
    setShieldActive(true);
    setShieldUsed(true);
    alerts.success('Shield Equipped!', 'Prevents score/streak loss on your next mistake!');
  };

  const useTimeFreeze = () => {
    if (freezeUsed || hasAnswered) return;
    gameAudio.playPowerUp();
    clearInterval(timerIntervalRef.current);
    setTimeFrozen(true);
    setFreezeUsed(true);
    alerts.success('Time Frozen!', 'Countdown timer is paused for this question.');
  };
  const [streakCount, setStreakCount] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [roundCorrectAnswer, setRoundCorrectAnswer] = useState(null); // { correctOptionIndex, correctAnswers }

  // Completed State
  const [reportId, setReportId] = useState(null);
  const [finalRank, setFinalRank] = useState(1);
  const [accuracy, setAccuracy] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  const [xpClaimed, setXpClaimed] = useState(false);

  // Sockets & Audio Refs
  const socketRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const [muted, setMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 1. Establish Socket Connection (Only for Live synchronous games)
  useEffect(() => {
    if (isHomework) return;

    // Start lobby music automatically
    gameAudio.playLobbyMusic();

    // Create socket connection
    socketRef.current = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000');

    // Offline Resilience helper
    const syncOfflineAnswers = () => {
      const pendingAnswers = JSON.parse(localStorage.getItem(`lgc_pending_${code}`) || '[]');
      if (pendingAnswers.length > 0 && socketRef.current?.connected) {
        pendingAnswers.forEach(ans => {
          socketRef.current.emit('submit_answer', ans);
        });
        localStorage.removeItem(`lgc_pending_${code}`);
        alerts.success('Synced!', 'Offline submissions synchronized with the server.');
      }
    };

    socketRef.current.on('connect', () => {
      setIsOffline(false);
      syncOfflineAnswers();
    });

    socketRef.current.on('disconnect', () => {
      setIsOffline(true);
      alerts.warning('Connection Issue', 'Lost connection. LGC Offline Resilience enabled.');
    });

    const handleOnlineStatus = () => {
      if (navigator.onLine) {
        setIsOffline(false);
        syncOfflineAnswers();
      } else {
        setIsOffline(true);
        alerts.warning('Network Lost', 'You are now offline. Playing in local resilience mode.');
      }
    };

    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    // Emit Join event
    socketRef.current.emit('join_lobby', {
      code,
      username: nickname,
      userId: user?.id || null,
      name: user?.name || null,
      isHost: isHost
    });

    // Sockets Listeners
    socketRef.current.on('lobby_updated', ({ players, quizTitle, quizDescription, totalQuestions, status }) => {
      setPlayers(players);
      if (quizTitle) {
        setQuizInfo({ title: quizTitle, description: quizDescription, totalQuestions });
      }
      if (status && status !== 'lobby') {
        setGameState(status);
      }
    });

    socketRef.current.on('quiz_started', ({ questions, totalQuestions, currentQuestionIndex }) => {
      gameAudio.stopLobbyMusic();
      setQuestions(questions);
      setQuizInfo(prev => ({ ...prev, totalQuestions }));
      setCurrentQIndex(currentQuestionIndex);
      setGameState('active');
      startQuestionTimer(questions[currentQuestionIndex].timeLimit);
    });

    socketRef.current.on('answer_feedback', ({ isCorrect, correctOptionIndex, pointsEarned, newScore, streak }) => {
      if (isCorrect) {
        gameAudio.playCorrect();
        setStreakCount(streak);
      } else {
        gameAudio.playIncorrect();
        setStreakCount(0);
      }
      setTotalScore(newScore);
      setFeedback({ isCorrect, pointsEarned, correctOptionIndex });
      setHasAnswered(true);
    });

    socketRef.current.on('leaderboard_updated', ({ leaderboard }) => {
      setLeaderboard(leaderboard);
    });

    socketRef.current.on('question_changed', ({ currentQuestionIndex }) => {
      setFeedback(null);
      setRoundCorrectAnswer(null); // Clear answer at start of next round
      setHasAnswered(false);
      setDoublePointsActive(false);
      setShieldActive(false);
      setTimeFrozen(false);
      setHostDoublePointsActive(false);
      setHostShieldActive(false);
      setStage('question');
      setCurrentQIndex(currentQuestionIndex);
      startQuestionTimer(questionsRef.current[currentQuestionIndex]?.timeLimit || 30);
    });

    socketRef.current.on('host_double_points_activated', () => {
      setDoublePointsActive(true);
      alerts.info('Power-up Activated!', 'The Teacher has activated Double Points! Correct answers score 2x XP for this question! 🚀');
    });

    socketRef.current.on('host_shield_activated', () => {
      setShieldActive(true);
      alerts.info('Power-up Activated!', 'The Teacher has activated Shield! Incorrect answers will not lose XP for this question! 🛡️');
    });

    socketRef.current.on('quiz_completed', ({ reportId, leaderboard }) => {
      clearInterval(timerIntervalRef.current);
      setGameState('completed');
      setReportId(reportId);
      if (leaderboard) {
        setLeaderboard(leaderboard);
      }
      
      const myStat = leaderboard.find(p => p.username === nickname);
      if (myStat) {
        setFinalRank(myStat.rank);
        setAccuracy(myStat.accuracy);
        setTotalScore(myStat.score);
        
        if (myStat.accuracy >= 70) {
          gameAudio.playConfetti();
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 }
          });
        }
      }
    });

    socketRef.current.on('error_message', (msg) => {
      setErrorMessage(msg);
    });

    socketRef.current.on('timer_paused', () => {
      clearInterval(timerIntervalRef.current);
    });

    socketRef.current.on('timer_resumed', () => {
      startQuestionTimer(timerRef.current);
    });

    socketRef.current.on('timer_skipped', ({ correctOptionIndex, correctAnswers } = {}) => {
      clearInterval(timerIntervalRef.current);
      setTimer(0);
      
      // Store correct answers locally for rendering
      setRoundCorrectAnswer({ correctOptionIndex, correctAnswers });

      if (!hasAnsweredRef.current && !isHost) {
        socketRef.current.emit('submit_answer', {
          code,
          username: nickname,
          questionIndex: currentQIndex,
          selectedOptionIndex: -1,
          timeRemaining: 0,
          powerUpUsed: null
        });
        setFeedback({
          isCorrect: false,
          correctOptionIndex: correctOptionIndex !== undefined ? correctOptionIndex : 0,
          pointsEarned: 0
        });
        setHasAnswered(true);
      }
      triggerFeedbackStage();
    });

    return () => {
      gameAudio.stopLobbyMusic();
      clearInterval(timerIntervalRef.current);
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [code, isHomework]);

  const handleClaimQuizXp = async () => {
    gameAudio.playCorrect();
    try {
      await api.post('/student/add-xp', { xp: totalScore });
      alerts.success('XP Claimed!', `You claimed +${totalScore} XP successfully!`);
      setXpClaimed(true);
    } catch (err) {
      alerts.error('Claim Failed', err.message || 'Could not claim XP.');
    }
  };

  // 1b. Homework Self-Paced Setup
  const [hwAnswers, setHwAnswers] = useState({});
  const [hwLeaderboard, setHwLeaderboard] = useState([]);

  useEffect(() => {
    if (!isHomework) return;

    gameAudio.playLobbyMusic();

    const loadHomework = async () => {
      try {
        const sessionData = await api.get(`/sessions/${code}`);
        setQuizInfo({
          title: sessionData.quiz.title,
          description: sessionData.quiz.description,
          totalQuestions: sessionData.quiz.questions.length
        });
        setQuestions(sessionData.quiz.questions);
        
        const initialLeaderboard = [
          { username: nickname, score: 0, isBot: false },
          { username: 'EinsteinBot', score: 0, isBot: true },
          { username: 'Sparky', score: 0, isBot: true },
          { username: 'QuizWizard', score: 0, isBot: true }
        ];
        setHwLeaderboard(initialLeaderboard);
        setLeaderboard(initialLeaderboard);

        // Skip lobby direct to game play
        gameAudio.stopLobbyMusic();
        setGameState('active');
        setCurrentQIndex(0);
        startQuestionTimer(sessionData.quiz.questions[0].timeLimit);
      } catch (err) {
        setErrorMessage(err.message || 'Failed to load homework details.');
      }
    };

    loadHomework();

    return () => {
      gameAudio.stopLobbyMusic();
      clearInterval(timerIntervalRef.current);
    };
  }, [code, isHomework]);

  // 2. Question Timer Logic
  const triggerFeedbackStage = () => {
    setStage('feedback');
    setTimeout(() => {
      setStage('leaderboard');
    }, 3000);
  };

  // 2. Question Timer Logic
  const startQuestionTimer = (duration) => {
    clearInterval(timerIntervalRef.current);
    setTimer(duration);

    timerIntervalRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current);
          // Stop at 0 and wait for server to emit 'timer_skipped'
          // which is the single authority for ending the round
          return 0;
        }
        if (prev <= 6) {
          gameAudio.playTick();
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Actions
  const handleAddBots = () => {
    gameAudio.playPowerUp();
    socketRef.current.emit('add_bots', { code });
  };

  const handleStartGame = () => {
    gameAudio.playPowerUp();
    socketRef.current.emit('start_quiz', { code });
  };

  const handleAnswerSelect = async (optionIdx) => {
    if (hasAnswered || isHost) return;

    const question = questions[currentQIndex];
    if (!question) return;

    let isCorrect = false;

    // Verify grading locally
    if (!question.type || question.type === 'mcq' || question.type === 'tf') {
      isCorrect = Number(question.correctOptionIndex) === Number(optionIdx);
    } else if (question.type === 'fib') {
      isCorrect = question.correctAnswers[0]?.trim().toLowerCase() === optionIdx.toString().trim().toLowerCase();
    } else if (question.type === 'match') {
      isCorrect = optionIdx.toString() === 'correct';
    }

    if (isHomework) {
      clearInterval(timerIntervalRef.current);
      setHasAnswered(true);
      setFeedback({
        isCorrect,
        correctOptionIndex: question.correctOptionIndex,
        pointsEarned: isCorrect ? 1000 : 0
      });
    } else {
      const ansPayload = {
        code,
        username: nickname,
        questionIndex: currentQIndex,
        selectedOptionIndex: optionIdx,
        timeRemaining: timer,
        powerUpUsed: doublePointsActive ? 'double_points' : null
      };

      if (isOffline || !socketRef.current?.connected) {
        const pending = JSON.parse(localStorage.getItem(`lgc_pending_${code}`) || '[]');
        pending.push(ansPayload);
        localStorage.setItem(`lgc_pending_${code}`, JSON.stringify(pending));
        alerts.warning('Offline Resilience', 'Saved answer locally. Sync will complete when connection is restored.');
      } else {
        socketRef.current.emit('submit_answer', ansPayload);
      }

      // Don't set feedback locally - wait for server's answer_feedback event
      // which has the authoritative grading result
      setHasAnswered(true);
      setStage('waiting');
    }
  };

  const handleNextQuestion = () => {
    gameAudio.playTick();
    socketRef.current.emit('next_question', { code });
  };

  const handleHomeworkNext = async () => {
    gameAudio.playTick();
    const nextIndex = currentQIndex + 1;

    if (nextIndex >= questions.length) {
      setFeedback(null);
      setHasAnswered(false);
      setDoublePointsActive(false);

      let correctCount = 0;
      questions.forEach((q, idx) => {
        if (hwAnswers[idx.toString()] === q.correctOptionIndex) {
          correctCount++;
        }
      });

      const finalAccuracy = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
      setAccuracy(finalAccuracy);
      setGameState('completed');

      try {
        const response = await api.post(`/sessions/homework/${code}/submit`, {
          score: totalScore,
          accuracy: finalAccuracy,
          correctAnswers: correctCount,
          totalQuestions: questions.length,
          answers: hwAnswers
        });

        setReportId(response.reportId);
        setFinalRank(response.rank);

        if (finalAccuracy >= 70) {
          gameAudio.playConfetti();
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 }
          });
        }
      } catch (err) {
        alerts.error('Submit Failed', err.message);
      }
    } else {
      setFeedback(null);
      setHasAnswered(false);
      setDoublePointsActive(false);
      setShieldActive(false);
      setTimeFrozen(false);
      setCurrentQIndex(nextIndex);
      startQuestionTimer(questions[nextIndex]?.timeLimit || 30);
    }
  };

  const handleEndQuiz = () => {
    gameAudio.playIncorrect();
    socketRef.current.emit('end_quiz_manually', { code });
  };

  const toggleSound = () => {
    const isMutedNow = gameAudio.toggleMute();
    setMuted(isMutedNow);
    if (!isMutedNow && gameState === 'lobby') {
      gameAudio.playLobbyMusic();
    }
  };

  const handleHostPause = () => {
    if (!isHost) return;
    gameAudio.playTick();
    socketRef.current.emit('pause_quiz_timer', { code });
    setHostTimerPaused(true);
    clearInterval(timerIntervalRef.current);
  };

  const handleHostResume = () => {
    if (!isHost) return;
    gameAudio.playTick();
    socketRef.current.emit('resume_quiz_timer', { code });
    setHostTimerPaused(false);
    startQuestionTimer(timer);
  };

  const handleHostDoublePoints = () => {
    if (!isHost) return;
    gameAudio.playPowerUp();
    setHostDoublePointsActive(true);
    socketRef.current.emit('host_use_double_points', { code });
  };

  const handleHostShield = () => {
    if (!isHost) return;
    gameAudio.playPowerUp();
    setHostShieldActive(true);
    socketRef.current.emit('host_use_shield', { code });
  };

  const handleHostSkip = () => {
    if (!isHost) return;
    gameAudio.playIncorrect();
    socketRef.current.emit('skip_question_timer', { code });
    clearInterval(timerIntervalRef.current);
    setTimer(0);
  };

  const useDoublePoints = () => {
    if (powerUpUsed || hasAnswered) return;
    gameAudio.playPowerUp();
    setDoublePointsActive(true);
    setPowerUpUsed(true);
  };


  // Render Error state
  if (errorMessage) {
    return (
      <div className="landing-hero">
        <div className="card code-entry-box" style={{ borderColor: 'var(--accent-magenta)' }}>
          <ShieldAlert size={48} color="var(--accent-magenta)" style={{ marginBottom: '16px' }} />
          <h2>Game Error</h2>
          <p style={{ margin: '12px 0 24px 0', color: 'var(--text-gray)' }}>{errorMessage}</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // --- LOBBY VIEW ---
  if (gameState === 'lobby') {
    return (
      <div className="play-arena">
        {/* Top sound toggle and title */}
        <div style={{
          padding: '24px 40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-color)'
        }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem' }}>{quizInfo.title}</h2>
            <span style={{ color: 'var(--text-gray)', fontSize: '0.85rem' }}>Lobby Code: {code}</span>
          </div>

          <button className="btn btn-outline" onClick={toggleSound} style={{ padding: '10px' }}>
            {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        </div>

        {/* Massive Game PIN Showcase */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(108, 66, 245, 0.15) 0%, rgba(232, 44, 136, 0.1) 100%)',
          border: '2px solid rgba(108, 66, 245, 0.3)',
          borderRadius: '16px',
          padding: '24px',
          textAlign: 'center',
          margin: '20px 40px',
          boxShadow: '0 8px 32px rgba(108, 66, 245, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-gray)', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 600 }}>
            Join at <strong>Live Gaming Center</strong> with PIN Code:
          </span>
          <h1 style={{
            fontSize: '5.5rem',
            fontWeight: 900,
            fontFamily: 'var(--font-display)',
            color: 'var(--accent-orange)',
            letterSpacing: '10px',
            textShadow: '0 0 20px rgba(242, 137, 41, 0.4)',
            margin: '8px 0'
          }}>
            {code}
          </h1>
        </div>

        <div className="lobby-grid">
          <div className="lobby-main card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Players Joined ({players.length})</h3>
              {isHost && (
                <button className="btn btn-outline" style={{ fontSize: '0.8rem' }} onClick={handleAddBots}>
                  + Add Bots
                </button>
              )}
            </div>

            <div className="lobby-players-grid">
              {players.map((p, idx) => (
                <div key={idx} className={`lobby-player-card ${p.isBot ? 'bot' : ''}`} style={{ flexDirection: 'column', padding: '14px', gap: '6px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', textAlign: 'center' }}>
                    <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>{p.name || p.username}</span>
                    {p.name && p.name !== p.username && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-gray)' }}>{p.username}</span>
                    )}
                  </div>
                  {p.isBot && <span className="bot-badge" style={{ position: 'static', marginTop: '4px' }}>AI</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Start trigger box */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', justifyContent: 'center', textAlign: 'center' }}>
            <Gamepad2 size={48} color="var(--accent-orange)" style={{ margin: '0 auto' }} />
            {isHost ? (
              <>
                <p style={{ color: 'var(--text-gray)', fontSize: '0.9rem' }}>
                  Wait for all student players to join and click Start when ready.
                </p>
                <button className="btn btn-green" style={{ justifyContent: 'center' }} onClick={handleStartGame}>
                  <Play size={16} /> Start Live Game
                </button>
              </>
            ) : (
              <>
                <p style={{ color: 'var(--text-gray)', fontSize: '0.9rem' }}>
                  Waiting for teacher to start the game session...
                </p>
                <div style={{ color: 'var(--accent-magenta)', fontWeight: 600 }}>Ready to play!</div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- ACTIVE GAME VIEW ---
  // A. Host Teacher View (Live Progress Tracking & Scoreboard Matrix)
  if (gameState === 'active' && isHost) {
    return (
      <div className="play-arena" style={{ padding: '40px', overflowY: 'auto' }}>
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '20px'
        }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--primary-violet)' }}>
              Live Game Control Center
            </h1>
            <p style={{ color: 'var(--text-gray)', fontSize: '0.9rem', marginTop: '4px' }}>
              Game Code PIN: <span style={{ fontWeight: 'bold', color: '#fff', fontSize: '1.1rem' }}>{code}</span>
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '16px' }}>
            <button className="btn btn-outline" style={{ borderColor: 'var(--accent-magenta)', color: 'var(--accent-magenta)' }} onClick={handleEndQuiz}>
              End Session
            </button>
            <button className="btn btn-primary" onClick={handleNextQuestion}>
              {currentQIndex + 1 === quizInfo.totalQuestions ? 'Finish Quiz & Show Results' : `Advance to Question ${currentQIndex + 2}`} <ArrowRight size={16} />
            </button>
          </div>
        </header>

        {stage === 'question' && (
          <>
            {/* Question Info Bar with Countdown Timer and Options Showcase */}
            <div className="card" style={{ marginBottom: '24px', background: 'rgba(108,66,245,0.06)', borderColor: 'var(--primary-violet-glow)', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                {/* Big Countdown Timer Badge */}
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  border: '4px solid var(--primary-violet)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  background: 'rgba(108, 66, 245, 0.05)',
                  boxShadow: '0 0 15px rgba(108, 66, 245, 0.2)',
                  flexShrink: 0
                }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-gray)', textTransform: 'uppercase', letterSpacing: '1px' }}>Timer</span>
                  <span style={{ fontSize: '1.8rem', fontWeight: 900, color: timer <= 5 ? 'var(--accent-magenta)' : '#fff' }}>{timer}</span>
                </div>

                {/* Question Title Details */}
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--primary-violet)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    Current Question {currentQIndex + 1} of {quizInfo.totalQuestions}
                  </span>
                  <h2 style={{ fontSize: '1.5rem', marginTop: '6px', fontWeight: 600 }}>
                    {questions[currentQIndex]?.questionText}
                  </h2>
                </div>
              </div>

              {/* Options Showcase grid */}
              {questions[currentQIndex]?.options && questions[currentQIndex].options.length > 0 && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '12px',
                  marginTop: '20px',
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                  paddingTop: '20px'
                }}>
                  {questions[currentQIndex].options.map((opt, oIdx) => {
                    return (
                      <div 
                        key={oIdx} 
                        style={{ 
                          padding: '14px 18px', 
                          borderRadius: '8px', 
                          border: '1px solid var(--border-color)',
                          background: 'rgba(255,255,255,0.02)',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          fontSize: '0.98rem'
                        }}
                      >
                        <span style={{ color: 'var(--accent-magenta)', fontWeight: 800 }}>{oIdx + 1}.</span> 
                        <span>{opt}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Live Progress Grid */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <h3 style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', fontSize: '1.2rem' }}>
                Student Progress Matrix
              </h3>
              
              <table className="report-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px', paddingLeft: '24px' }}>Rank</th>
                    <th style={{ width: '220px' }}>Player Name</th>
                    <th style={{ width: '120px' }}>Score</th>
                    <th style={{ width: '120px' }}>Accuracy</th>
                    <th>Questions Progress Matrix</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((p, idx) => (
                    <tr key={p.username} className="table-row-hover" style={{ transition: 'var(--transition-smooth)' }}>
                      <td style={{ paddingLeft: '24px', fontWeight: 800 }}>#{idx + 1}</td>
                      <td style={{ fontWeight: 600, border: 'none' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', justifyContent: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{p.name || p.username}</span>
                            {p.isBot && <span className="bot-badge" style={{ position: 'static' }}>AI</span>}
                          </div>
                          {p.name && p.name !== p.username && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-gray)', fontWeight: 500 }}>{p.username}</span>
                          )}
                        </div>
                      </td>
                      <td>{p.score} XP</td>
                      <td>
                        <span className={`accuracy-pill ${p.accuracy >= 75 ? 'high' : p.accuracy >= 50 ? 'medium' : 'low'}`}>
                          {p.accuracy}%
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {questions.map((q, qIdx) => {
                            const ans = p.answers ? p.answers[qIdx.toString()] : undefined;
                            const isCorrect = p.correctness ? p.correctness[qIdx.toString()] : false;
                            const hasAnsweredQ = ans !== undefined;
                            
                            let blockColor = 'rgba(255,255,255,0.05)';
                            let blockBorder = '1px solid var(--border-color)';
                            const isCurrentQuestion = qIdx === currentQIndex;
                            const hideReveal = isCurrentQuestion && (timer > 0);

                            if (hasAnsweredQ) {
                              if (hideReveal) {
                                blockColor = 'var(--primary-violet)';
                                blockBorder = 'none';
                              } else {
                                blockColor = isCorrect ? 'var(--accent-green)' : 'var(--accent-magenta)';
                                blockBorder = 'none';
                              }
                            }
                            
                            return (
                              <div 
                                key={qIdx}
                                title={`Q${qIdx + 1}: ${hasAnsweredQ ? (hideReveal ? 'Submitted' : (isCorrect ? 'Correct' : 'Incorrect')) : 'Unanswered'}`}
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '4px',
                                  background: blockColor,
                                  border: blockBorder,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.65rem',
                                  fontWeight: 'bold',
                                  color: hasAnsweredQ ? '#fff' : 'var(--text-dim)'
                                }}
                              >
                                {qIdx + 1}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {stage === 'feedback' && (
          <div className="card" style={{ padding: '40px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', color: 'var(--accent-green)' }}>
              Round Complete! ⏱️
            </h2>
            <h3 style={{ fontSize: '1.6rem', fontWeight: 600, color: '#fff', maxWidth: '800px' }}>
              {questions[currentQIndex]?.questionText}
            </h3>

            <div style={{
              background: 'rgba(0, 206, 132, 0.08)',
              border: '2px solid var(--accent-green)',
              padding: '20px 40px',
              borderRadius: '12px',
              color: 'var(--accent-green)',
              fontSize: '1.5rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              marginTop: '10px'
            }}>
              <span>✓ Correct Answer:</span>
              <span>
                {(!questions[currentQIndex]?.type || questions[currentQIndex]?.type === 'mcq' || questions[currentQIndex]?.type === 'tf') && questions[currentQIndex]?.options[roundCorrectAnswer?.correctOptionIndex]}
                {questions[currentQIndex]?.type === 'fib' && roundCorrectAnswer?.correctAnswers && roundCorrectAnswer.correctAnswers[0]}
                {questions[currentQIndex]?.type === 'match' && 'All pairs correctly matched!'}
              </span>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '24px' }}>
              <div className="card" style={{ padding: '16px 32px', minWidth: '200px' }}>
                <span style={{ color: 'var(--text-gray)', fontSize: '0.9rem' }}>Average Accuracy</span>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--accent-orange)' }}>
                  {leaderboard.length > 0 ? Math.round(leaderboard.reduce((sum, p) => sum + (p.accuracy || 0), 0) / leaderboard.length) : 0}%
                </div>
              </div>
            </div>
          </div>
        )}

        {stage === 'leaderboard' && (
          <div className="card" style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', color: 'var(--accent-orange)' }}>
              Current Leaderboard standings 🏆
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '600px' }}>
              {leaderboard.slice(0, 5).map((player, idx) => (
                <div 
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 24px',
                    background: idx === 0 ? 'rgba(242, 137, 41, 0.1)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${idx === 0 ? 'var(--accent-orange)' : 'var(--border-color)'}`,
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '1.1rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ 
                      fontSize: '1.3rem', 
                      color: idx === 0 ? 'var(--accent-orange)' : 'var(--text-dim)',
                      fontWeight: 900
                    }}>
                      #{idx + 1}
                    </span>
                    <span>{player.username}</span>
                    {player.isBot && <span className="bot-badge" style={{ position: 'static' }}>AI</span>}
                  </div>
                  <span style={{ color: 'var(--accent-orange)' }}>{player.score} XP</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // B. Student Player View (Split Screen Dashboard)
  if (gameState === 'active') {
    const activeQ = questions[currentQIndex];
    if (!activeQ) return <div style={{ color: '#fff' }}>Loading first question...</div>;

    const timePercent = activeQ.timeLimit > 0 ? (timer / activeQ.timeLimit) * 100 : 0;

    return (
      <div className="play-arena">
        <div className="game-container" style={{ gridTemplateColumns: '1fr' }}>
          
          {/* Main Question Panel */}
          <div className="game-main">
            {/* Timer bar */}
            <div className="game-timer-bar">
              <div 
                className="game-timer-fill" 
                style={{ 
                  width: `${timePercent}%`,
                  transition: 'width 1s linear',
                  background: timer <= 5 ? 'var(--accent-magenta)' : 'linear-gradient(90deg, var(--accent-orange), var(--accent-magenta))'
                }}
              ></div>
            </div>

            {/* Top Stat Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', zIndex: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-gray)' }}>
                  Question {currentQIndex + 1} of {quizInfo.totalQuestions}
                </span>
                {stage === 'question' && (
                  <span style={{ 
                    background: timer <= 5 ? 'rgba(232, 44, 136, 0.15)' : 'rgba(255,255,255,0.05)',
                    color: timer <= 5 ? 'var(--accent-magenta)' : '#fff',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    border: '1px solid var(--border-color)',
                    minWidth: '60px',
                    textAlign: 'center'
                  }}>
                    ⏱️ {timer}s
                  </span>
                )}
              </div>

              {/* Player Name Showcase */}
              <div style={{ 
                background: 'rgba(108, 66, 245, 0.08)',
                border: '1px solid var(--primary-violet-glow)',
                color: '#fff',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ color: 'var(--accent-orange)' }}>👤</span>
                <span>{user?.name ? `${user.name} (${nickname})` : nickname}</span>
              </div>
              
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                {streakCount >= 2 && (
                  <span style={{
                    background: 'rgba(242, 137, 41, 0.15)',
                    color: 'var(--accent-orange)',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontWeight: 800,
                    fontSize: '0.8rem'
                  }}>
                    STREAK x{streakCount} 🔥
                  </span>
                )}
                <span style={{ fontWeight: 800, color: 'var(--accent-orange)', fontFamily: 'var(--font-display)' }}>
                  {totalScore} XP
                </span>
              </div>
            </div>

            {/* Question title & choices */}
            <div className="question-panel">
              {stage === 'question' && (
                <>
                  <h1 className="question-title">{activeQ.questionText}</h1>
                  
                  {/* A. MCQ or TF question types */}
                  {(!activeQ.type || activeQ.type === 'mcq' || activeQ.type === 'tf') && (
                    <div className="options-grid">
                      {activeQ.options.map((opt, oIdx) => (
                        <button 
                          key={oIdx}
                          className={`option-button option-${oIdx}`}
                          onClick={() => handleAnswerSelect(oIdx)}
                          disabled={hasAnswered || isHost}
                          style={{ opacity: hasAnswered ? 0.6 : 1 }}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* B. Fill in the Blank question type */}
                  {activeQ.type === 'fib' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '500px', margin: '20px auto' }}>
                      <input 
                        type="text" 
                        placeholder="Type your answer here..."
                        className="form-input"
                        value={fibInput}
                        onChange={e => setFibInput(e.target.value)}
                        disabled={hasAnswered}
                        style={{ fontSize: '1.2rem', padding: '12px 18px', textAlign: 'center' }}
                      />
                      <button 
                        className="btn btn-primary"
                        disabled={hasAnswered || !fibInput.trim()}
                        onClick={() => {
                          handleAnswerSelect(fibInput.trim());
                          setFibInput('');
                        }}
                        style={{ justifyContent: 'center', padding: '14px' }}
                      >
                        Submit Answer
                      </button>
                    </div>
                  )}

                  {/* C. Match the Following question type */}
                  {activeQ.type === 'match' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '600px', margin: '20px auto' }}>
                      {activeQ.matchPairs.map((pair, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', gap: '16px' }}>
                          <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>{pair.left}</span>
                          <span style={{ color: 'var(--text-gray)' }}>➔</span>
                          <select
                            className="form-input"
                            value={selectedMatches[idx.toString()] || ''}
                            onChange={e => setSelectedMatches({ ...selectedMatches, [idx.toString()]: e.target.value })}
                            disabled={hasAnswered}
                            style={{ maxWidth: '240px', background: '#09090e', fontSize: '0.95rem' }}
                          >
                            <option value="">-- Select Match --</option>
                            {activeQ.matchPairs.map(p => p.right).sort().map((rVal, rIdx) => (
                              <option key={rIdx} value={rVal}>{rVal}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                      
                      <button
                        className="btn btn-primary"
                        disabled={hasAnswered || activeQ.matchPairs.some((_, i) => !selectedMatches[i.toString()])}
                        onClick={() => {
                          const isCorrect = activeQ.matchPairs.every((pair, i) => selectedMatches[i.toString()] === pair.right);
                          handleAnswerSelect(isCorrect ? 'correct' : 'incorrect');
                          setSelectedMatches({});
                        }}
                        style={{ justifyContent: 'center', padding: '14px', marginTop: '12px' }}
                      >
                        Submit Match Pairings
                      </button>
                    </div>
                  )}
                </>
              )}

              {stage === 'waiting' && (
                <div style={{ textAlign: 'center', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', minHeight: '260px', justifyContent: 'center' }}>
                  <style>{`
                    @keyframes arena-spin {
                      0% { transform: rotate(0deg); }
                      100% { transform: rotate(360deg); }
                    }
                  `}</style>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    border: '5px solid rgba(255,255,255,0.05)',
                    borderTopColor: 'var(--primary-violet)',
                    animation: 'arena-spin 1s linear infinite'
                  }}></div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: '#fff' }}>Answer Submitted!</h2>
                  <p style={{ color: 'var(--text-gray)', fontSize: '0.95rem' }}>Waiting for results...</p>
                </div>
              )}

              {stage === 'feedback' && (
                <div style={{
                  textAlign: 'center',
                  padding: '50px 20px',
                  borderRadius: '12px',
                  background: feedback?.isCorrect ? 'rgba(0, 206, 132, 0.08)' : 'rgba(232, 44, 136, 0.08)',
                  border: `2px solid ${feedback?.isCorrect ? 'var(--accent-green)' : 'var(--accent-magenta)'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '20px',
                  minHeight: '260px',
                  justifyContent: 'center'
                }}>
                  <h1 style={{ 
                    fontFamily: 'var(--font-display)', 
                    fontSize: '2.8rem', 
                    color: feedback?.isCorrect ? 'var(--accent-green)' : 'var(--accent-magenta)' 
                  }}>
                    {feedback?.isCorrect ? 'CORRECT! 🎉' : 'INCORRECT! ❌'}
                  </h1>
                  
                  {feedback?.isCorrect ? (
                    <p style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff' }}>
                      +{feedback.pointsEarned} XP Points
                    </p>
                  ) : (
                    <div>
                      <p style={{ color: 'var(--text-gray)', fontSize: '0.95rem', marginBottom: '8px' }}>
                        The correct answer was:
                      </p>
                      <h3 style={{ fontSize: '1.5rem', color: 'var(--accent-green)', fontWeight: 800 }}>
                        {(!activeQ.type || activeQ.type === 'mcq' || activeQ.type === 'tf') && activeQ.options[feedback?.correctOptionIndex]}
                        {activeQ.type === 'fib' && feedback?.correctAnswers && feedback.correctAnswers[0]}
                        {activeQ.type === 'match' && 'Correct Pairs matched!'}
                      </h3>
                    </div>
                  )}
                </div>
              )}

              {stage === 'leaderboard' && (
                <div style={{ width: '100%', maxWidth: '500px', margin: '0 auto', minHeight: '260px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', marginBottom: '20px', textAlign: 'center', color: 'var(--accent-orange)' }}>
                    Live Leaderboard Standings 🏆
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {leaderboard.slice(0, 5).map((player, idx) => {
                      const isMe = player.username === nickname;
                      return (
                        <div 
                          key={idx}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '14px 20px',
                            background: isMe ? 'rgba(108, 66, 245, 0.18)' : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${isMe ? 'var(--primary-violet)' : 'var(--border-color)'}`,
                            borderRadius: '8px',
                            fontWeight: isMe ? 800 : 600,
                            fontSize: '0.98rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontWeight: 800, color: 'var(--text-dim)' }}>#{idx + 1}</span>
                            <span>{player.username}</span>
                          </div>
                          <span style={{ color: 'var(--accent-orange)' }}>{player.score} XP</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions / Power Ups */}
            <div style={{ width: '100%', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                {isHost && (
                  <>
                    <button 
                      className={`btn btn-outline ${hostDoublePointsActive ? 'btn-accent' : ''}`}
                      onClick={handleHostDoublePoints}
                      disabled={hostDoublePointsActive}
                      style={{ border: '1px solid var(--accent-orange)', color: 'var(--accent-orange)' }}
                    >
                      <Zap size={16} /> Double Points (2x XP)
                    </button>
                    <button 
                      className={`btn btn-outline ${hostShieldActive ? 'btn-accent' : ''}`}
                      onClick={handleHostShield}
                      disabled={hostShieldActive}
                      style={{ border: '1px solid var(--accent-blue)', color: 'var(--accent-blue)' }}
                    >
                      🛡️ Active Shield Protection
                    </button>
                    <button 
                      className={`btn btn-outline ${hostTimerPaused ? 'btn-accent' : ''}`}
                      onClick={hostTimerPaused ? handleHostResume : handleHostPause}
                      style={{ border: '1px solid var(--accent-green)', color: 'var(--accent-green)' }}
                    >
                      ❄️ {hostTimerPaused ? 'Unfreeze Time' : 'Freeze Time'}
                    </button>
                  </>
                )}
              </div>

              {isHost && (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <button className="btn btn-outline" style={{ borderColor: 'var(--accent-magenta)', color: 'var(--accent-magenta)' }} onClick={handleEndQuiz}>
                    End Game
                  </button>
                  <button className="btn btn-outline" style={{ borderColor: 'var(--accent-magenta)', color: 'var(--accent-magenta)' }} onClick={handleHostSkip}>
                    ⏭️ Skip Question
                  </button>
                  <button className="btn btn-primary" onClick={handleNextQuestion}>
                    Next Question <ArrowRight size={16} />
                  </button>
                </div>
              )}

              {!isHost && isHomework && hasAnswered && (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button className="btn btn-primary" onClick={handleHomeworkNext}>
                    {currentQIndex + 1 === questions.length ? 'Finish Quiz' : 'Next Question'} <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </div>


          </div>

        </div>
      </div>
    );
  }

  // --- GAME OVER / COMPLETED VIEW ---
  if (gameState === 'completed') {
    if (isHost) {
      const top3 = leaderboard.slice(0, 3);
      const remainingRanks = leaderboard.slice(3);

      return (
        <div className="play-arena" style={{ overflowY: 'auto', padding: '40px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '30px',
            width: '100%',
            maxWidth: '1000px'
          }}>
            {/* Left Side: Final Podium Standings */}
            <div className="card" style={{ height: 'fit-content', display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'center', minHeight: '440px', justifyContent: 'center' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--accent-orange)', marginBottom: '10px' }}>
                Final Podium Standings 🏆
              </h2>

              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '16px', minHeight: '280px', margin: '20px 0' }}>
                {/* 2nd Place */}
                {top3[1] && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.8rem', marginBottom: '8px' }}>🥈</span>
                    <span style={{ fontWeight: 700, fontSize: '0.98rem', marginBottom: '8px', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{top3[1].username}</span>
                    <div style={{
                      width: '90px',
                      height: '130px',
                      background: 'linear-gradient(to top, rgba(166,166,166,0.2) 0%, rgba(166,166,166,0.03) 100%)',
                      border: '1px solid rgb(166,166,166)',
                      borderRadius: '8px 8px 0 0',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'rgb(166,166,166)' }}>2</span>
                      <span style={{ color: 'var(--text-gray)', fontSize: '0.75rem' }}>{top3[1].score} XP</span>
                    </div>
                  </div>
                )}

                {/* 1st Place */}
                {top3[0] && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '2.2rem', marginBottom: '8px' }}>🥇</span>
                    <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--accent-orange)', marginBottom: '8px', maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{top3[0].username}</span>
                    <div style={{
                      width: '100px',
                      height: '180px',
                      background: 'linear-gradient(to top, rgba(242,184,7,0.3) 0%, rgba(242,184,7,0.03) 100%)',
                      border: '1px solid rgb(242,184,7)',
                      borderRadius: '8px 8px 0 0',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 0 20px rgba(242, 184, 7, 0.15)'
                    }}>
                      <span style={{ fontSize: '2.5rem', fontWeight: 900, color: 'rgb(242,184,7)' }}>1</span>
                      <span style={{ color: 'var(--text-gray)', fontSize: '0.75rem' }}>{top3[0].score} XP</span>
                    </div>
                  </div>
                )}

                {/* 3rd Place */}
                {top3[2] && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.8rem', marginBottom: '8px' }}>🥉</span>
                    <span style={{ fontWeight: 700, fontSize: '0.98rem', marginBottom: '8px', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{top3[2].username}</span>
                    <div style={{
                      width: '90px',
                      height: '90px',
                      background: 'linear-gradient(to top, rgba(176,107,46,0.2) 0%, rgba(176,107,46,0.03) 100%)',
                      border: '1px solid rgb(176,107,46)',
                      borderRadius: '8px 8px 0 0',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span style={{ fontSize: '1.6rem', fontWeight: 900, color: 'rgb(176,107,46)' }}>3</span>
                      <span style={{ color: 'var(--text-gray)', fontSize: '0.75rem' }}>{top3[2].score} XP</span>
                    </div>
                  </div>
                )}
              </div>

              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px' }} onClick={() => navigate('/admin/dashboard')}>
                Return to Dashboard
              </button>
            </div>

            {/* Right Side: Remaining Standings */}
            <div className="card" style={{ height: 'fit-content', display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '440px' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--text-dim)', textAlign: 'center' }}>
                Remaining Standings 📋
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {remainingRanks.length === 0 ? (
                  <p style={{ color: 'var(--text-gray)', textAlign: 'center', marginTop: '40px' }}>No remaining ranks to show.</p>
                ) : (
                  remainingRanks.slice(0, 10).map((player, idx) => (
                    <div 
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 18px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        fontWeight: 500,
                        fontSize: '0.95rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontWeight: 800, color: 'var(--text-dim)', minWidth: '24px' }}>
                          #{idx + 4}
                        </span>
                        <span>{player.username}</span>
                      </div>
                      <span style={{ color: 'var(--accent-orange)' }}>{player.score} XP</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Student completed screen layout
    return (
      <div className="play-arena" style={{ overflowY: 'auto', padding: '40px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '30px',
          width: '100%',
          maxWidth: '900px'
        }}>
          {/* Individual Performance Card */}
          <div className="results-container card" style={{ height: 'fit-content' }}>
            <Award size={48} color="var(--accent-orange)" style={{ margin: '0 auto' }} />
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', marginTop: '12px' }}>
              Quiz Completed!
            </h2>
            
            <div className="results-score-circle">
              <span style={{ fontSize: '0.8rem', color: 'var(--text-gray)', textTransform: 'uppercase' }}>Final Rank</span>
              <span style={{ fontSize: '3rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>#{finalRank}</span>
            </div>

            <div style={{ display: 'flex', gap: '30px', justifyContent: 'center', marginBottom: '32px' }}>
              <div>
                <span style={{ color: 'var(--text-gray)', fontSize: '0.85rem' }}>Total Score</span>
                <h3 style={{ fontSize: '1.4rem', color: 'var(--accent-orange)' }}>{totalScore} XP</h3>
              </div>
              <div>
                <span style={{ color: 'var(--text-gray)', fontSize: '0.85rem' }}>Accuracy</span>
                <h3 style={{ fontSize: '1.4rem', color: 'var(--accent-green)' }}>{accuracy}%</h3>
              </div>
            </div>

            <div className="badge-showcase" style={{ marginBottom: '24px' }}>
              {accuracy === 100 && (
                <div className="badge-item earned"><Zap size={14} /> Perfect 100%</div>
              )}
              {totalScore > 5000 && (
                <div className="badge-item earned"><Award size={14} /> Score Master</div>
              )}
              <div className="badge-item earned"><Check size={14} /> Explorer</div>
            </div>

            {!xpClaimed && totalScore > 0 ? (
              <button 
                className="btn btn-primary" 
                style={{ width: '100%', justifyContent: 'center', padding: '14px', background: 'var(--accent-orange)' }} 
                onClick={handleClaimQuizXp}
              >
                Claim {totalScore} XP ⚡
              </button>
            ) : (
              <button 
                className="btn btn-primary" 
                style={{ width: '100%', justifyContent: 'center', padding: '14px' }} 
                onClick={() => navigate('/student/dashboard')}
              >
                Back to Dashboard
              </button>
            )}
          </div>

          {/* Final Standings Leaderboard Card */}
          <div className="card" style={{ height: 'fit-content', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--accent-orange)', textAlign: 'center' }}>
              Final Standings 🏆
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {leaderboard.length === 0 ? (
                <p style={{ color: 'var(--text-gray)', textAlign: 'center' }}>No other players participated.</p>
              ) : (
                leaderboard.slice(0, 8).map((player, idx) => {
                  const isMe = player.username === nickname;
                  return (
                    <div 
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 18px',
                        background: isMe ? 'rgba(108, 66, 245, 0.18)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${isMe ? 'var(--primary-violet)' : 'var(--border-color)'}`,
                        borderRadius: '8px',
                        fontWeight: isMe ? 800 : 500
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontWeight: 800, color: 'var(--text-dim)', minWidth: '24px' }}>
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                          <span style={{ fontWeight: 600 }}>{player.name || player.username}</span>
                          {player.name && player.name !== player.username && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-gray)' }}>{player.username}</span>
                          )}
                        </div>
                      </div>
                      <span style={{ color: 'var(--accent-orange)' }}>{player.score} XP</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
