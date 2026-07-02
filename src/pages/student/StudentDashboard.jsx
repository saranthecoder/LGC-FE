import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import { Gamepad2, Play, Award, Zap, Smile, BookOpen, Star, Sparkles, Check, X, Users, History, TrendingUp, BarChart2, UserPlus, Search } from 'lucide-react';
import gameAudio from '../../utils/AudioEngine';
import { alerts } from '../../utils/alerts';

export default function StudentDashboard({ user }) {
  const [code, setCode] = useState('');
  const [homeworkList, setHomeworkList] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinError, setJoinError] = useState('');
  const navigate = useNavigate();

  // Dynamic analysis states
  const [analysisStats, setAnalysisStats] = useState({
    totalGames: 0,
    avgAccuracy: 0,
    perfectGames: 0,
    strengths: []
  });

  // Daily quest claims state
  const [quest1Claimed, setQuest1Claimed] = useState(() => {
    const todayStr = new Date().toDateString();
    const username = user?.username || 'default';
    return localStorage.getItem(`quest1_claimed_${username}`) === todayStr;
  });
  const [quest2Claimed, setQuest2Claimed] = useState(() => {
    const todayStr = new Date().toDateString();
    const username = user?.username || 'default';
    return localStorage.getItem(`quest2_claimed_${username}`) === todayStr;
  });
  const [homeworkProgress, setHomeworkProgress] = useState(0);
  const [liveProgress, setLiveProgress] = useState(0);
  const [livePoints, setLivePoints] = useState(user?.points || 0);

  // Daily Join XP claim state
  const [dailyJoinClaimed, setDailyJoinClaimed] = useState(() => {
    const todayStr = new Date().toDateString();
    const username = user?.username || 'default';
    const locallyClaimedDate = localStorage.getItem(`daily_claimed_date_${username}`);
    if (locallyClaimedDate === todayStr) {
      return true;
    }
    return user?.lastSpinClaimed ? new Date(user.lastSpinClaimed).toDateString() === todayStr : false;
  });

  // Badge list claimed state
  const [claimedBadges, setClaimedBadges] = useState(user?.badges || []);

  // Friend list state
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [searchUsername, setSearchUsername] = useState('');
  const [searchError, setSearchError] = useState('');
  const [searchSuccess, setSearchSuccess] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch active homework
        const hws = await api.get('/student/homework');
        setHomeworkList(hws);

        // Fetch completed history to build dynamic analysis and quest progress
        const historyData = await api.get('/student/history');
        if (historyData) {
          const todayStr = new Date().toDateString();
          const hwCount = historyData.filter(h => h.type === 'homework' && new Date(h.createdAt).toDateString() === todayStr).length;
          const liveCount = historyData.filter(h => h.type === 'live' && new Date(h.createdAt).toDateString() === todayStr).length;
          setHomeworkProgress(hwCount);
          setLiveProgress(liveCount);

          if (historyData.length > 0) {
            const totalAccuracy = historyData.reduce((acc, curr) => acc + (curr.accuracy || 0), 0);
            const avgAccuracy = Math.round(totalAccuracy / historyData.length);
            const perfectGames = historyData.filter(h => h.accuracy === 100).length;

            const categoryMap = {};
            historyData.forEach(h => {
              let cat = 'General';
              const title = (h.quizTitle || '').toLowerCase();
              if (title.includes('math') || title.includes('arithmetic') || title.includes('algebra')) {
                cat = 'Mathematics';
              } else if (title.includes('bio') || title.includes('mitosis') || title.includes('cell')) {
                cat = 'Biology';
              } else if (title.includes('history') || title.includes('heroes')) {
                cat = 'History';
              } else if (title.includes('science') || title.includes('physics')) {
                cat = 'Science';
              }

              if (!categoryMap[cat]) {
                categoryMap[cat] = { totalAcc: 0, count: 0 };
              }
              categoryMap[cat].totalAcc += h.accuracy || 0;
              categoryMap[cat].count += 1;
            });

            const strengths = Object.keys(categoryMap).map(cat => ({
              category: cat,
              accuracy: Math.round(categoryMap[cat].totalAcc / categoryMap[cat].count)
            }));

            setAnalysisStats({
              totalGames: historyData.length,
              avgAccuracy,
              perfectGames,
              strengths
            });
          } else {
            setAnalysisStats({
              totalGames: 0,
              avgAccuracy: 0,
              perfectGames: 0,
              strengths: [
                { category: 'Mathematics', accuracy: 0 },
                { category: 'Biology', accuracy: 0 },
                { category: 'General', accuracy: 0 }
              ]
            });
          }
        }

        // Fetch populated friends list
        fetchFriends();

        // Fetch top student leaderboard dynamically
        try {
          const topStudents = await api.get('/student/leaderboard');
          const formatted = topStudents.map(s => ({
            username: s.username,
            score: s.points || 0,
            badge: s.badges && s.badges.length > 0 ? s.badges[s.badges.length - 1] : 'Explorer'
          }));
          // Make sure current user is visible in list if not in top 5
          if (user && !formatted.some(f => f.username === user.username)) {
            formatted.push({
              username: user.username,
              score: livePoints,
              badge: claimedBadges.length > 0 ? claimedBadges[claimedBadges.length - 1] : 'Explorer'
            });
          }
          setLeaderboard(formatted.sort((a, b) => b.score - a.score));
        } catch (err) {
          // Fallback if no database users
          const currentUsername = user?.username || 'Guest';
          setLeaderboard([
            { username: 'Syahru M', score: 105200, badge: 'Grand Master' },
            { username: 'Salsabila P', score: 92200, badge: 'Expert' },
            { username: 'Aditya A', score: 89000, badge: 'Expert' },
            { username: currentUsername, score: livePoints, badge: 'Beginner' }
          ].sort((a, b) => b.score - a.score));
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, livePoints]);

  const fetchFriends = async () => {
    try {
      const data = await api.get('/student/friends');
      setFriends(data.friends || []);
      setFriendRequests(data.friendRequests || []);
    } catch (err) {
      console.error('Failed to load friends list:', err);
    }
  };

  const handleSendFriendRequest = async (e) => {
    e.preventDefault();
    if (!searchUsername.trim()) return;
    setSearchError('');
    setSearchSuccess('');
    try {
      const res = await api.post('/student/friends/request', { username: searchUsername.trim() });
      setSearchSuccess(res.message);
      setSearchUsername('');
      gameAudio.playCorrect();
      fetchFriends();
    } catch (err) {
      setSearchError(err.message || 'Failed to send request.');
      gameAudio.playIncorrect();
    }
  };

  const handleAcceptRequest = async (requesterId) => {
    gameAudio.playPowerUp();
    try {
      await api.post('/student/friends/accept', { requesterId });
      alerts.success('Accepted!', 'Friend request accepted.');
      fetchFriends();
    } catch (err) {
      alerts.error('Error', err.message);
    }
  };

  const handleDeclineRequest = async (requesterId) => {
    gameAudio.playIncorrect();
    try {
      await api.post('/student/friends/decline', { requesterId });
      alerts.success('Declined', 'Friend request declined.');
      fetchFriends();
    } catch (err) {
      alerts.error('Error', err.message);
    }
  };

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    if (code.length !== 6) {
      setJoinError('Please enter a 6-digit PIN');
      return;
    }
    setJoinError('');
    gameAudio.playPowerUp();
    setShowJoinModal(false);
    if (!user?.username) return;
    navigate(`/play/${code}?name=${user.username}`);
  };

  const handlePlayHomework = (sessionCode) => {
    if (!user?.username) return;
    gameAudio.playPowerUp();
    navigate(`/play/${sessionCode}?name=${user.username}&homework=true`);
  };

  const claimQuest = async (questNumber, xpAmount) => {
    // Validate if student has completed the action
    if (questNumber === 1 && homeworkProgress < 1) {
      alerts.error('Quest Locked', 'Complete at least 1 homework challenge first!');
      return;
    }
    if (questNumber === 2 && liveProgress < 1) {
      alerts.error('Quest Locked', 'Complete at least 1 live quiz game first!');
      return;
    }

    gameAudio.playCorrect();
    try {
      const data = await api.post('/student/add-xp', { xp: xpAmount });
      setLivePoints(data.points);
      const username = user?.username || 'default';
      localStorage.setItem(`quest${questNumber}_claimed_${username}`, new Date().toDateString());
      alerts.success('XP Claimed!', `You gained +${xpAmount} XP points!`);
      if (questNumber === 1) setQuest1Claimed(true);
      if (questNumber === 2) setQuest2Claimed(true);
    } catch (err) {
      alerts.error('Claim Failed', 'Could not claim XP.');
    }
  };

  const handleClaimDailyJoin = async () => {
    gameAudio.playCorrect();
    try {
      const res = await api.post('/student/claim-daily-join');
      setLivePoints(res.points);
      setDailyJoinClaimed(true);
      const username = user?.username || 'default';
      localStorage.setItem(`daily_claimed_date_${username}`, new Date().toDateString());
      alerts.success('Bonus Claimed!', res.message);
    } catch (err) {
      alerts.error('Claim Failed', err.message || 'Could not claim daily join XP.');
    }
  };

  const handleClaimBadge = async (badgeName, xpRequired) => {
    gameAudio.playCorrect();
    try {
      const res = await api.post('/student/claim-badge', { badgeName, xpRequired });
      setClaimedBadges(res.badges);
      alerts.success('Unlocked!', res.message);
    } catch (err) {
      alerts.error('Unlock Failed', err.message || 'Could not claim badge.');
    }
  };

  // Gamification calculations scaled for daily 30-100 questions
  const level = Math.floor(livePoints / 5000) + 1; // 5000 XP per level
  const currentXPInLevel = livePoints % 5000;
  const xpPercentage = Math.min(100, (currentXPInLevel / 5000) * 100);
  const nextLevelXPNeeded = 5000 - currentXPInLevel;

  // Milestone Progress (Scaled up to 250,000 XP max limit)
  let activeMilestoneName = 'Explorer';
  let prevMilestonePoints = 0;
  let targetMilestonePoints = 5000;

  if (livePoints >= 5000 && livePoints < 20000) {
    activeMilestoneName = 'Bronze Competitor';
    prevMilestonePoints = 5000;
    targetMilestonePoints = 20000;
  } else if (livePoints >= 20000 && livePoints < 50000) {
    activeMilestoneName = 'Silver Champion';
    prevMilestonePoints = 20000;
    targetMilestonePoints = 50000;
  } else if (livePoints >= 50000 && livePoints < 100000) {
    activeMilestoneName = 'Gold Master';
    prevMilestonePoints = 50000;
    targetMilestonePoints = 100000;
  } else if (livePoints >= 100000) {
    activeMilestoneName = 'Legendary Grandmaster';
    prevMilestonePoints = 100000;
    targetMilestonePoints = 250000;
  }

  const milestoneProgressPercentage = Math.min(
    100,
    ((livePoints - prevMilestonePoints) / (targetMilestonePoints - prevMilestonePoints)) * 100
  );

  // Dynamic coordinates for SVG projection curve (scaled for 100k XP)
  const pointsOnCurve = [
    { xp: 0, x: 20, y: 130 },
    { xp: 5000, x: 80, y: 110 },
    { xp: 20000, x: 150, y: 85 },
    { xp: 50000, x: 220, y: 60 },
    { xp: 100000, x: 320, y: 25 }
  ];

  let dotX = 20;
  let dotY = 130;
  if (livePoints <= 5000) {
    const ratio = livePoints / 5000;
    dotX = 20 + ratio * 60;
    dotY = 130 - ratio * 20;
  } else if (livePoints <= 20000) {
    const ratio = (livePoints - 5000) / 15000;
    dotX = 80 + ratio * 70;
    dotY = 110 - ratio * 25;
  } else if (livePoints <= 50000) {
    const ratio = (livePoints - 20000) / 30000;
    dotX = 150 + ratio * 70;
    dotY = 85 - ratio * 25;
  } else {
    const ratio = Math.min(1.0, (livePoints - 50000) / 200000);
    dotX = 220 + ratio * 100;
    dotY = 60 - ratio * 35;
  }

  // Rank name calculation
  let rankLabel = 'BEGINNER';
  if (level >= 3) rankLabel = 'VETERAN';
  if (level >= 6) rankLabel = 'EXPERT';
  if (level >= 10) rankLabel = 'MASTER';

  // GAMING CONTROLLER SVG (Floating loop animation)
  const ControllerConsoleSVG = (
    <svg width="104" height="74" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{
      animation: 'controllerFloat 3s ease-in-out infinite',
      color: '#6366f1',
      filter: 'drop-shadow(0 0 12px rgba(99, 102, 241, 0.5))'
    }}>
      <style>{`
        @keyframes controllerFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(-3deg); }
        }
      `}</style>
      <rect x="2" y="6" width="20" height="12" rx="3" />
      <path d="M6 12h4M8 10v4" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="15" cy="11" r="0.8" fill="currentColor" />
      <circle cx="17" cy="13" r="0.8" fill="currentColor" />
      <circle cx="13" cy="13" r="0.8" fill="currentColor" />
      <circle cx="15" cy="15" r="0.8" fill="currentColor" />
      <circle cx="9" cy="15" r="1.2" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="12" cy="15" r="1.2" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );

  const TrophySVG = (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{
      animation: 'trophyWobble 2.4s ease-in-out infinite',
      color: '#fbbf24',
      filter: 'drop-shadow(0 0 6px rgba(251, 191, 36, 0.4))',
      verticalAlign: 'middle',
      marginLeft: '8px'
    }}>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34" />
      <path d="M12 2a6 6 0 0 0-6 6v4a6 6 0 0 0 12 0V8a6 6 0 0 0-6-6z" />
    </svg>
  );

  const FlameSVG = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{
      animation: 'flameFlicker 1.2s ease-in-out infinite',
      color: '#f97316',
      filter: 'drop-shadow(0 0 4px rgba(249, 115, 22, 0.5))',
      verticalAlign: 'middle',
      marginLeft: '4px'
    }}>
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );

  const CheckSVG = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" style={{
      animation: 'checkPop 0.3s ease-out forwards',
      color: '#22c55e',
      display: 'inline-block',
      marginLeft: '6px',
      verticalAlign: 'middle'
    }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );

  // Helper to determine and render the highest unlocked badge in place of the avatar
  const getBadgeIcon = () => {
    let highestBadge = 'None';
    if (claimedBadges.includes('Legendary Grandmaster')) highestBadge = 'Legendary Grandmaster';
    else if (claimedBadges.includes('Gold Master')) highestBadge = 'Gold Master';
    else if (claimedBadges.includes('Silver Champion')) highestBadge = 'Silver Champion';
    else if (claimedBadges.includes('Bronze Competitor')) highestBadge = 'Bronze Competitor';
    else if (claimedBadges.includes('Explorer')) highestBadge = 'Explorer';

    const baseStyle = {
      width: '56px',
      height: '56px',
      display: 'inline-block'
    };

    switch (highestBadge) {
      case 'Legendary Grandmaster':
        return (
          <svg style={{ ...baseStyle, filter: 'drop-shadow(0 0 12px rgba(168, 85, 247, 0.6))', color: '#a855f7' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        );
      case 'Gold Master':
        return (
          <svg style={{ ...baseStyle, filter: 'drop-shadow(0 0 12px rgba(234, 179, 8, 0.6))', color: '#eab308' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        );
      case 'Silver Champion':
        return (
          <svg style={{ ...baseStyle, filter: 'drop-shadow(0 0 10px rgba(148, 163, 184, 0.5))', color: '#94a3b8' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        );
      case 'Bronze Competitor':
        return (
          <svg style={{ ...baseStyle, filter: 'drop-shadow(0 0 8px rgba(180, 83, 9, 0.5))', color: '#b45309' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        );
      case 'Explorer':
        return (
          <svg style={{ ...baseStyle, filter: 'drop-shadow(0 0 8px rgba(34, 197, 94, 0.5))', color: '#22c55e' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
          </svg>
        );
      default:
        return (
          <svg style={{ ...baseStyle, color: '#4b5563', filter: 'drop-shadow(0 0 6px rgba(75, 85, 99, 0.3))' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <circle cx="12" cy="11" r="3" />
          </svg>
        );
    }
  };

  return (
    <div style={{ padding: '16px', position: 'relative' }}>
      
      <style>{`
        @keyframes rocketFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(3deg); }
        }
        @keyframes trophyWobble {
          0%, 100% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(6deg) scale(1.08); }
        }
        @keyframes flameFlicker {
          0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.9; }
          50% { transform: scale(1.15) rotate(-3deg); opacity: 1; }
        }
        @keyframes checkPop {
          0% { transform: scale(0.6); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }

        .gamified-container {
          background-image: 
            linear-gradient(rgba(99, 102, 241, 0.02) 1px, transparent 1px), 
            linear-gradient(90deg, rgba(99, 102, 241, 0.02) 1px, transparent 1px);
          background-size: 32px 32px;
          min-height: 100vh;
        }

        .kuest-grid {
          display: grid;
          grid-template-columns: 2.2fr 1fr;
          gap: 32px;
        }
        .overview-row {
          display: grid;
          grid-template-columns: 1fr 1.2fr 1fr;
          gap: 28px;
          margin-bottom: 32px;
        }
        .bottom-row-grid {
          display: grid;
          grid-template-columns: 1.15fr 1.1fr 1.25fr;
          gap: 32px;
          margin-top: 32px;
          align-items: stretch;
        }
        
        .spacious-card {
          background: #09090b;
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 28px;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: inset 0 0 12px rgba(255, 255, 255, 0.01);
          display: flex;
          flex-direction: column;
        }
        .spacious-card:hover {
          transform: translateY(-4px);
          border-color: rgba(99, 102, 241, 0.4) !important;
          box-shadow: 0 12px 24px rgba(99, 102, 241, 0.1), inset 0 0 12px rgba(255, 255, 255, 0.02);
        }
        
        .avatar-circle {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          border: 2px solid #6366f1;
          padding: 2px;
          box-shadow: 0 0 12px rgba(99, 102, 241, 0.25);
          display: flex;
          alignItems: center;
          justifyContent: center;
          background: rgba(255,255,255,0.01);
        }
        .analysis-progress-bar {
          background: rgba(255, 255, 255, 0.05);
          height: 8px;
          border-radius: 4px;
          overflow: hidden;
          width: 100%;
        }
        .analysis-progress-fill {
          height: 100%;
          border-radius: 4px;
        }
        @media (max-width: 1300px) {
          .bottom-row-grid { grid-template-columns: 1fr; gap: 32px; }
        }
        @media (max-width: 1024px) {
          .kuest-grid { grid-template-columns: 1fr; gap: 32px; }
          .overview-row { grid-template-columns: 1fr; gap: 28px; }
        }
      `}</style>

      <div className="gamified-container">
        
        {/* Top Section split in 2.2fr / 1fr */}
        <div className="kuest-grid">
          
          {/* LEFT COLUMN: Main dashboard widgets */}
          <div>
            
            {/* Welcome Banner */}
            <div className="spacious-card" style={{
              background: 'linear-gradient(135deg, #131230 0%, #09090b 100%)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              padding: '32px',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '32px',
              borderRadius: '16px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ flex: 1, zIndex: 2 }}>
                <h2 style={{ fontSize: '1.8rem', fontFamily: 'var(--font-display)', color: '#fff', marginBottom: '8px', letterSpacing: '0.5px' }}>
                  Learn, Play and Dominate the Board!
                </h2>
                <p style={{ color: 'var(--text-gray)', fontSize: '0.92rem', lineHeight: '1.6', marginBottom: '20px', maxWidth: '500px' }}>
                  Challenge your friends in live quiz games, climb the global standings, and increase rank points to claim rewards!
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button className="btn btn-primary" onClick={() => { gameAudio.playPowerUp(); setShowJoinModal(true); }}>
                    Join Live PIN
                  </button>
                </div>
              </div>
              <div style={{ zIndex: 1, filter: 'drop-shadow(0 0 15px rgba(99, 102, 241, 0.3))' }}>
                {ControllerConsoleSVG}
              </div>
            </div>

            {/* Overview Row */}
            <div className="overview-row">
              
              {/* 1. Profile Level Card */}
              <div className="spacious-card" style={{ minHeight: '180px', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="avatar-circle">
                    {getBadgeIcon()}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700, letterSpacing: '0.5px' }}>{user?.username || 'Guest'}</h4>
                    <span style={{ fontSize: '0.78rem', color: 'var(--accent-orange)', fontWeight: 600 }}>
                      Lv. {level} Quizzer
                    </span>
                  </div>
                </div>
                <div style={{ marginTop: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600 }}>
                    <span style={{ color: 'var(--text-gray)' }}>Exp. Level</span>
                    <span>{livePoints % 5000} / 5000 ({Math.round(xpPercentage)}%)</span>
                  </div>
                  <div className="xp-bar" style={{ height: '8px', marginTop: '6px' }}>
                    <div className="xp-progress" style={{ width: `${xpPercentage}%` }}></div>
                  </div>
                </div>
              </div>

              {/* 2. XP & Milestone Rewards Progress */}
              <div className="spacious-card" style={{ minHeight: '180px', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '1px', fontWeight: 700 }}>
                    Milestone Progress
                  </span>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginTop: '4px', letterSpacing: '0.5px' }}>
                    Next Reward: {activeMilestoneName}
                  </h4>
                </div>
                
                <div style={{ marginTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-dim)' }}>{prevMilestonePoints} XP</span>
                    <span style={{ color: 'var(--accent-orange)' }}>{livePoints} / {targetMilestonePoints} XP</span>
                  </div>
                  <div className="xp-bar" style={{ height: '8px', background: 'rgba(255, 255, 255, 0.05)' }}>
                    <div className="xp-progress" style={{ width: `${milestoneProgressPercentage}%`, background: 'linear-gradient(90deg, #6366f1, var(--accent-orange))' }}></div>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '8px', display: 'block' }}>
                    {targetMilestonePoints - livePoints} XP more needed to claim badge!
                  </span>
                </div>
              </div>

              {/* 3. Performance Stats Card */}
              <div className="spacious-card" style={{ minHeight: '180px', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', margin: 0, fontWeight: 700 }}>
                  XP Analytics
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.82rem', marginTop: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Correct Answers:</span>
                    <span style={{ fontWeight: 600, color: '#fff' }}>{user?.correctAnswers || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Total Points:</span>
                    <span style={{ fontWeight: 600, color: 'var(--accent-magenta)' }}>{livePoints} pts</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Badges Unlocked:</span>
                    <span style={{ fontWeight: 600, color: 'var(--accent-green)' }}>{claimedBadges.length} Claimed</span>
                  </div>
                </div>
              </div>

            </div>

            {/* XP & Level Milestone Projection Chart */}
            <div className="spacious-card" style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '1.15rem', fontFamily: 'var(--font-display)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '0.5px' }}>
                <TrendingUp size={18} color="var(--primary-violet)" /> XP Milestone Projection Chart
              </h3>
              <p style={{ color: 'var(--text-gray)', fontSize: '0.85rem', lineHeight: '1.6', marginBottom: '20px' }}>
                Visual projection mapping of checkpoints and level thresholds. Your current rank trajectory is highlighted below.
              </p>

              <div style={{ width: '100%', overflowX: 'auto', background: '#050508', borderRadius: '8px', padding: '24px 16px', border: '1px solid var(--border-color)' }}>
                <svg viewBox="0 0 360 160" width="100%" height="160px" style={{ display: 'block' }}>
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25"/>
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0"/>
                    </linearGradient>
                  </defs>

                  {/* Horizontal reference grid lines */}
                  <line x1="20" y1="25" x2="340" y2="25" stroke="#1f1f2e" strokeWidth="1" strokeDasharray="3,3" />
                  <line x1="20" y1="60" x2="340" y2="60" stroke="#1f1f2e" strokeWidth="1" strokeDasharray="3,3" />
                  <line x1="20" y1="85" x2="340" y2="85" stroke="#1f1f2e" strokeWidth="1" strokeDasharray="3,3" />
                  <line x1="20" y1="110" x2="340" y2="110" stroke="#1f1f2e" strokeWidth="1" strokeDasharray="3,3" />
                  <line x1="20" y1="130" x2="340" y2="130" stroke="#1f1f2e" strokeWidth="1" />

                  {/* Gradient area under projection path */}
                  <path 
                    d="M 20 130 Q 80 110, 150 85 T 220 60 T 320 25 L 320 130 Z" 
                    fill="url(#chartGrad)" 
                  />

                  {/* Smooth projection line */}
                  <path 
                    d="M 20 130 Q 80 110, 150 85 T 220 60 T 320 25" 
                    fill="none" 
                    stroke="#6366f1" 
                    strokeWidth="3" 
                    strokeLinecap="round"
                  />

                  {/* Milestone nodes */}
                  {pointsOnCurve.map((pt, idx) => (
                    <g key={idx}>
                      <circle cx={pt.x} cy={pt.y} r="5" fill="#18181b" stroke="#eab308" strokeWidth="2" />
                      <text x={pt.x} y={pt.y - 10} fill="var(--text-dim)" fontSize="7.5" textAnchor="middle" fontWeight="bold">
                        {pt.xp} XP
                      </text>
                    </g>
                  ))}

                  {/* Pulsing indicator representing the student's current standing */}
                  <circle cx={dotX} cy={dotY} r="8" fill="#eab308" opacity="0.3">
                    <animate attributeName="r" values="6;10;6" dur="2s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={dotX} cy={dotY} r="4.5" fill="#f59e0b" stroke="#fff" strokeWidth="1" />

                  {/* Vertical projection line from current position */}
                  <line x1={dotX} y1={dotY} x2={dotX} y2="130" stroke="#f59e0b" strokeWidth="1" strokeDasharray="2,2" opacity="0.7" />

                  {/* X Axis Labels */}
                  <text x="20" y="145" fill="var(--text-dim)" fontSize="8" textAnchor="middle">Start</text>
                  <text x="80" y="145" fill="var(--text-dim)" fontSize="8" textAnchor="middle">Explorer</text>
                  <text x="150" y="145" fill="var(--text-dim)" fontSize="8" textAnchor="middle">Bronze</text>
                  <text x="220" y="145" fill="var(--text-dim)" fontSize="8" textAnchor="middle">Silver</text>
                  <text x="320" y="145" fill="var(--text-dim)" fontSize="8" textAnchor="middle">Gold Master</text>
                </svg>
              </div>
            </div>

            {/* Active Homework Assignments shelf (only renders if homeworkList is populated) */}
            {homeworkList.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Pending Homework Challenges <Sparkles size={18} color="var(--primary-violet)" />
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
                  {homeworkList.map((hw) => (
                    <div key={hw._id} className="spacious-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: '4px solid #6366f1' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Teacher assignment</span>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>{hw.quizTitle}</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>PIN Code: {hw.code}</p>
                      <button 
                        className="btn btn-primary" 
                        style={{ marginTop: 'auto', padding: '8px 14px', fontSize: '0.8rem', justifyContent: 'center' }}
                        onClick={() => handlePlayHomework(hw.code)}
                      >
                        Play Challenge
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* RIGHT COLUMN: Real performance Analysis widget & Friend requests */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* Analysis Header Card */}
            <div className="spacious-card" style={{ gap: '20px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(9, 9, 11, 0.9) 100%)' }}>
              <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <BarChart2 size={20} color="var(--primary-violet)" /> Performance Analysis
              </h3>
              <p style={{ color: 'var(--text-gray)', fontSize: '0.82rem', lineHeight: '1.6', margin: 0 }}>
                Review your accuracy trends, topic focus areas, and metrics aggregated from completed live games and homework.
              </p>

              {/* Aggregated accuracy circle meter */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px 0',
                borderTop: '1px solid var(--border-color)',
                borderBottom: '1px solid var(--border-color)'
              }}>
                <div style={{
                  width: '98px',
                  height: '98px',
                  borderRadius: '50%',
                  border: '6px solid #27272a',
                  borderTopColor: '#6366f1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column'
                }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>{analysisStats.avgAccuracy}%</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 600 }}>ACCURACY</span>
                </div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-gray)', marginTop: '14px', fontWeight: 600 }}>
                  {analysisStats.totalGames} sessions completed
                </span>
              </div>

              {/* Quick counters */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', textAlign: 'center' }}>
                <div style={{ background: 'rgba(255,255,255,0.01)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-orange)' }}>{analysisStats.perfectGames}</span>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '2px' }}>Perfect Runs</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.01)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-green)', display: 'inline-flex', alignItems: 'center' }}>
                    {user?.streak || 0} {FlameSVG}
                  </span>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '2px' }}>Active Streak</div>
                </div>
              </div>
            </div>

            {/* Topic Strengths Breakdown */}
            <div className="spacious-card" style={{ gap: '20px', borderRadius: '12px' }}>
              <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                <TrendingUp size={16} color="var(--accent-green)" /> Topic Performance
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {analysisStats.strengths.length > 0 ? (
                  analysisStats.strengths.map((str, idx) => {
                    let fillBarColor = '#6366f1';
                    if (str.accuracy < 50) fillBarColor = '#ef4444';
                    else if (str.accuracy < 75) fillBarColor = '#eab308';
                    else fillBarColor = '#22c55e';

                    return (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600 }}>
                          <span style={{ color: '#fff' }}>{str.category}</span>
                          <span style={{ color: fillBarColor }}>{str.accuracy}%</span>
                        </div>
                        <div className="analysis-progress-bar">
                          <div 
                            className="analysis-progress-fill" 
                            style={{ width: `${str.accuracy}%`, background: fillBarColor }}
                          ></div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: 0 }}>Play a quiz challenge to record topic analysis.</p>
                )}
              </div>
            </div>

            {/* Friend Network & Search */}
            <div className="spacious-card" style={{ gap: '20px', borderRadius: '12px' }}>
              <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <UserPlus size={16} color="var(--accent-blue)" /> Friend Network
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-gray)', margin: '0 0 12px 0' }}>
                Your Student ID: <strong style={{ color: '#6366f1' }}>{user?.username || 'default'}</strong>
              </p>

              {/* Friend Request Search Form */}
              <form onSubmit={handleSendFriendRequest} style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Search student ID..." 
                  value={searchUsername}
                  onChange={e => setSearchUsername(e.target.value)}
                  style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }}
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '6px 14px' }} title="Send Friend Request">
                  <Search size={14} />
                </button>
              </form>
              {searchError && <p style={{ color: 'var(--accent-magenta)', fontSize: '0.75rem', margin: 0 }}>{searchError}</p>}
              {searchSuccess && <p style={{ color: 'var(--accent-green)', fontSize: '0.75rem', margin: 0 }}>{searchSuccess}</p>}

              {/* Received Requests list */}
              {friendRequests.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                    INCOMING REQUESTS
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {friendRequests.map((reqUser) => (
                      <div key={reqUser._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '6px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{reqUser.username}</span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn btn-primary" style={{ padding: '4px' }} onClick={() => handleAcceptRequest(reqUser._id)} title="Accept">
                            <Check size={12} />
                          </button>
                          <button className="btn btn-outline" style={{ padding: '4px', borderColor: 'rgba(232, 44, 136, 0.4)' }} onClick={() => handleDeclineRequest(reqUser._id)} title="Decline">
                            <X size={12} color="var(--accent-magenta)" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Friend List directory */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                  MY FRIENDS ({friends.length})
                </span>
                {friends.length === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: 0 }}>No friends added yet. Search classmate IDs above!</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '120px', overflowY: 'auto' }}>
                    {friends.map((f) => (
                      <div key={f._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: 600, color: '#fff' }}>{f.username}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--accent-orange)' }}>{f.points || 0} XP</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>

        </div>

        {/* FULL WIDTH ROW OUTSIDE GRID: Occupies total row width completely */}
        <div className="bottom-row-grid">
          
          {/* Leaderboard List Card */}
          <div className="spacious-card" style={{ gap: '20px', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', margin: 0 }}>
              Podium Leaderboard {TrophySVG}
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px', flex: 1, justifyContent: 'center' }}>
              {leaderboard.slice(0, 5).map((player, idx) => {
                let rankColor = 'var(--text-dim)';
                let rowBorder = '1px solid var(--border-color)';
                if (idx === 0) { rankColor = '#fbbf24'; rowBorder = '1px solid rgba(251,191,36,0.3)'; }
                if (idx === 1) { rankColor = '#94a3b8'; rowBorder = '1px solid rgba(148,163,184,0.3)'; }
                if (idx === 2) { rankColor = '#b45309'; rowBorder = '1px solid rgba(180,83,9,0.3)'; }

                return (
                  <div key={idx} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(255,255,255,0.01)',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: rowBorder,
                    fontSize: '0.8rem',
                    transition: 'transform 0.2s',
                    cursor: 'default'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: 800, color: rankColor, fontSize: '0.9rem' }}>#{idx + 1}</span>
                      <span style={{ fontWeight: 600, color: '#fff' }}>{player.username}</span>
                    </div>
                    <span style={{ fontWeight: 700, color: 'var(--accent-orange)' }}>{player.score} XP</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Daily Quest Card */}
          <div className="spacious-card" style={{ gap: '20px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-display)', margin: 0 }}>
                Daily Quests
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--primary-violet)' }}>Claim rewards</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, justifyContent: 'center' }}>
              
              {/* Daily Join XP Check-In */}
              <div style={{ background: 'rgba(255,255,255,0.01)', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Daily Login Bonus</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-orange)' }}>+150 XP</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.72rem', margin: 0, flex: 1 }}>
                    Check-in today!
                  </p>
                  <button 
                    className="btn btn-primary" 
                    style={{ padding: '4px 10px', fontSize: '0.7rem', background: dailyJoinClaimed ? 'transparent' : 'var(--accent-orange)' }} 
                    disabled={dailyJoinClaimed}
                    onClick={handleClaimDailyJoin}
                  >
                    {dailyJoinClaimed ? 'Claimed' : 'Claim Check-In'}
                  </button>
                </div>
              </div>

              {/* Quest 1 */}
              <div style={{ background: 'rgba(255,255,255,0.01)', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Complete 1 Challenge</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-orange)' }}>+140 Exp</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                  <div className="xp-bar" style={{ height: '6px', margin: 0, flex: 1 }}>
                    <div className="xp-progress" style={{ width: '100%' }}></div>
                  </div>
                  <button 
                    className="btn btn-primary" 
                    style={{ padding: '4px 10px', fontSize: '0.7rem' }} 
                    disabled={quest1Claimed}
                    onClick={() => claimQuest(1, 140)}
                  >
                    {quest1Claimed ? 'Claimed' : 'Claim'}
                  </button>
                </div>
              </div>

              {/* Quest 2 */}
              <div style={{ background: 'rgba(255,255,255,0.01)', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Compete in 1 Live Quiz Game</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-orange)' }}>+250 Exp</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                  <div className="xp-bar" style={{ height: '6px', margin: 0, flex: 1 }}>
                    <div className="xp-progress" style={{ width: '100%', background: 'var(--accent-orange)' }}></div>
                  </div>
                  <button 
                    className="btn btn-primary" 
                    style={{ padding: '4px 10px', fontSize: '0.7rem' }} 
                    disabled={quest2Claimed}
                    onClick={() => claimQuest(2, 250)}
                  >
                    {quest2Claimed ? 'Claimed' : 'Claim'}
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Badges Claim Card */}
          <div className="spacious-card" style={{ gap: '20px', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
              <Award size={18} color="var(--accent-orange)" /> Rewards & Badges
            </h3>
            <p style={{ color: 'var(--text-gray)', fontSize: '0.8rem', margin: 0, lineHeight: '1.5' }}>
              Next Level in <strong style={{ color: '#fff' }}>{nextLevelXPNeeded} XP</strong>. Claim badges as you reach milestones!
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginTop: '10px', flex: 1, justifyContent: 'center' }}>
              {[
                { name: 'Explorer', xp: 5000, desc: 'Reach 5,000 total points' },
                { name: 'Bronze Competitor', xp: 20000, desc: 'Reach 20,000 total points' },
                { name: 'Silver Champion', xp: 50000, desc: 'Reach 50,000 total points' },
                { name: 'Gold Master', xp: 100000, desc: 'Reach 100,000 total points' },
                { name: 'Legendary Grandmaster', xp: 250000, desc: 'Reach 250,000 total points' }
              ].map((bdg, bIdx) => {
                const hasBadge = claimedBadges.includes(bdg.name);
                const canClaim = livePoints >= bdg.xp;

                return (
                  <div key={bIdx} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(255,255,255,0.01)',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.75rem'
                  }}>
                    <div>
                      <strong style={{ color: '#fff', display: 'block' }}>{bdg.name}</strong>
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>{bdg.desc}</span>
                    </div>
                    <div>
                      {hasBadge ? (
                        <span style={{ color: 'var(--accent-green)', fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>
                          Claimed {CheckSVG}
                        </span>
                      ) : canClaim ? (
                        <button 
                          className="btn btn-primary" 
                          style={{ padding: '4px 8px', fontSize: '0.65rem', background: 'var(--accent-green)' }}
                          onClick={() => handleClaimBadge(bdg.name, bdg.xp)}
                        >
                          Claim
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-dim)', fontSize: '0.65rem' }}>
                          Needs {bdg.xp - livePoints} XP
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

      {/* Join PIN Modal */}
      {showJoinModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <form onSubmit={handleJoinSubmit} className="card" style={{
            width: '100%',
            maxWidth: '400px',
            padding: '32px',
            background: '#09090b',
            border: '1px solid var(--border-color)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)' }}>Join Active Live Game</h3>
            <p style={{ color: 'var(--text-gray)', fontSize: '0.85rem' }}>Enter the 6-digit game PIN provided by your teacher</p>
            
            <input 
              type="text" 
              placeholder="123456" 
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              style={{
                padding: '12px',
                textAlign: 'center',
                fontSize: '1.6rem',
                fontWeight: 'bold',
                letterSpacing: '3px',
                background: 'rgba(0,0,0,0.3)',
                border: '2px solid var(--border-color)',
                borderRadius: '8px',
                color: '#fff',
                outline: 'none'
              }}
            />

            {joinError && <p style={{ color: 'var(--accent-magenta)', fontSize: '0.8rem', fontWeight: 600 }}>{joinError}</p>}

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button type="button" className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { setShowJoinModal(false); setJoinError(''); }}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                Join Game
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
