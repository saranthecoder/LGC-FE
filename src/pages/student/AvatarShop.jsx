import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { alerts } from '../../utils/alerts';
import gameAudio from '../../utils/AudioEngine';
import confetti from 'canvas-confetti';
import { Award, Zap, Coins, Sparkles } from 'lucide-react';

export default function AvatarShop() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);

  // Available avatars to buy/unlock
  const shopAvatars = [
    { seed: 'NeonBot', cost: 100, rarity: 'Common' },
    { seed: 'RoboKing', cost: 200, rarity: 'Common' },
    { seed: 'CyberPunk', cost: 350, rarity: 'Rare' },
    { seed: 'AstroKid', cost: 500, rarity: 'Rare' },
    { seed: 'PixelGamer', cost: 800, rarity: 'Epic' },
    { seed: 'CosmicQueen', cost: 1200, rarity: 'Legendary' }
  ];

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await api.get('/users/profile');
      setProfile(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimSpin = async () => {
    if (spinning) return;
    setSpinning(true);
    gameAudio.playPowerUp();

    try {
      const res = await api.post('/users/claim-spin');
      
      // Simulate spinning the wheel visually
      const extraDegrees = 1800 + Math.floor(Math.random() * 360);
      setRotation(prev => prev + extraDegrees);

      setTimeout(() => {
        setSpinning(false);
        gameAudio.playCorrect();
        confetti({ particleCount: 80, spread: 60 });
        
        const type = res.reward.type === 'coins' ? 'Coins' : 'Gems';
        alerts.success(
          'Congratulations!',
          `You spun the wheel and won ${res.reward.amount} ${type}!`
        );
        fetchProfile();
      }, 3000);

    } catch (err) {
      setSpinning(false);
      alerts.error('Spin On Cooldown', err.message);
    }
  };

  const handlePurchaseAvatar = async (seed, cost) => {
    const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`;
    const isUnlocked = profile?.unlockedAvatars?.includes(avatarUrl);

    if (isUnlocked) {
      // Just select it
      gameAudio.playTick();
      try {
        const res = await api.post('/users/unlock-avatar', { avatarSeed: seed, cost: 0 });
        alerts.success('Equipped!', 'Your new profile avatar is equipped.');
        setProfile(res.user);
      } catch (err) {
        alerts.error('Error', err.message);
      }
      return;
    }

    const confirmBuy = await alerts.confirm(
      'Unlock Avatar?',
      `Spend ${cost} coins to unlock this avatar?`
    );
    if (!confirmBuy) return;

    try {
      const res = await api.post('/users/unlock-avatar', { avatarSeed: seed, cost });
      gameAudio.playCorrect();
      confetti({ particleCount: 50, spread: 40 });
      alerts.success('Unlocked!', 'New avatar unlocked and equipped successfully!');
      setProfile(res.user);
    } catch (err) {
      gameAudio.playIncorrect();
      alerts.error('Unlock Failed', err.message);
    }
  };

  if (loading) return <div style={{ color: '#fff', padding: '24px' }}>Loading shop details...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', padding: '16px' }}>
      
      {/* Top Header stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--primary-violet)' }}>
            Gamified Rewards Center
          </h2>
          <p style={{ color: 'var(--text-gray)', fontSize: '0.9rem', marginTop: '4px' }}>
            Earn coins and gems from quizzes to unlock avatars!
          </p>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'rgba(242,137,41,0.08)' }}>
            <Coins color="var(--accent-orange)" size={20} />
            <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--accent-orange)' }}>
              {profile?.coins} Coins
            </span>
          </div>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'rgba(31,167,255,0.08)' }}>
            <Sparkles color="var(--accent-blue)" size={20} />
            <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--accent-blue)' }}>
              {profile?.gems} Gems
            </span>
          </div>
        </div>
      </div>

      {/* Lucky Spin and Profile */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* Lucky Spin Dashboard Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.25rem', color: 'var(--accent-orange)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} /> Daily Lucky Spin
          </h3>
          <p style={{ color: 'var(--text-gray)', fontSize: '0.85rem' }}>
            Spin the wheel once every 24 hours to win free currency rewards!
          </p>

          {/* Interactive CSS Wheel */}
          <div style={{
            position: 'relative',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            border: '8px solid #09090e',
            boxShadow: '0 0 15px var(--primary-violet-glow)',
            overflow: 'hidden',
            transition: 'transform 3s cubic-bezier(0.1, 0.8, 0.3, 1)',
            transform: `rotate(${rotation}deg)`,
            background: 'conic-gradient(#6c42f5 0deg 60deg, #e82c88 60deg 120deg, #1fa7ff 120deg 180deg, #f28929 180deg 240deg, #00ce84 240deg 300deg, #6c42f5 300deg 360deg)'
          }}>
            {/* Sector lines indicator */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
              <div style={{ position: 'absolute', width: '2px', height: '100%', background: 'rgba(255,255,255,0.2)', left: '50%', transform: 'translateX(-50%)' }}></div>
              <div style={{ position: 'absolute', height: '2px', width: '100%', background: 'rgba(255,255,255,0.2)', top: '50%', transform: 'translateY(-50%)' }}></div>
            </div>
            {/* Inner center button */}
            <div style={{
              position: 'absolute',
              width: '40px',
              height: '40px',
              background: '#09090e',
              border: '3px solid #fff',
              borderRadius: '50%',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 5
            }}></div>
          </div>

          {/* Marker indicator arrow */}
          <div style={{
            width: 0,
            height: 0,
            borderLeft: '12px solid transparent',
            borderRight: '12px solid transparent',
            borderTop: '20px solid #fff',
            marginTop: '-30px',
            zIndex: 10
          }}></div>

          <button 
            className="btn btn-primary animate-pulse" 
            onClick={handleClaimSpin}
            disabled={spinning}
            style={{ width: '180px', justifyContent: 'center' }}
          >
            {spinning ? 'Spinning...' : 'SPIN NOW'}
          </button>
        </div>

        {/* Current Equipped Avatar */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.25rem' }}>Your Avatar Profile</h3>
          
          <div style={{
            position: 'relative',
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            border: '3px solid var(--primary-violet)',
            padding: '8px',
            background: 'rgba(108,66,245,0.05)',
            boxShadow: '0 0 20px var(--primary-violet-glow)'
          }}>
            <img 
              src={profile?.avatarUrl} 
              alt="Equipped Avatar" 
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>

          <div>
            <h4 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{profile?.username}</h4>
            <span style={{ color: 'var(--text-gray)', fontSize: '0.85rem' }}>
              Level {Math.floor((profile?.points || 0) / 1000) + 1} Player
            </span>
          </div>

          <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
            Unlocked Avatars: {profile?.unlockedAvatars?.length} / {shopAvatars.length + 1}
          </div>
        </div>
      </div>

      {/* Avatar Shop list */}
      <div>
        <h3 style={{ fontSize: '1.4rem', marginBottom: '16px', fontFamily: 'var(--font-display)' }}>
          Avatar Unlock Shop
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px'
        }}>
          {shopAvatars.map((av) => {
            const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${av.seed}`;
            const isUnlocked = profile?.unlockedAvatars?.includes(avatarUrl);
            const isEquipped = profile?.avatarUrl === avatarUrl;

            return (
              <div 
                key={av.seed} 
                className="card" 
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '16px',
                  border: isEquipped ? '2px solid var(--accent-green)' : '1px solid var(--border-color)',
                  position: 'relative'
                }}
              >
                {/* Rarity tag */}
                <span style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  fontSize: '0.7rem',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  background: av.rarity === 'Legendary' ? 'rgba(242,137,41,0.15)' : 'rgba(255,255,255,0.06)',
                  color: av.rarity === 'Legendary' ? 'var(--accent-orange)' : 'var(--text-gray)',
                  fontWeight: 'bold'
                }}>
                  {av.rarity}
                </span>

                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.02)',
                  padding: '8px'
                }}>
                  <img src={avatarUrl} alt={av.seed} style={{ width: '100%', height: '100%' }} />
                </div>

                <div style={{ textAlign: 'center' }}>
                  <h4 style={{ fontWeight: 600 }}>{av.seed}</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                    {isUnlocked ? 'Unlocked' : `${av.cost} Coins`}
                  </p>
                </div>

                <button 
                  className={`btn ${isEquipped ? 'btn-outline' : 'btn-primary'}`}
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    borderColor: isEquipped ? 'var(--accent-green)' : undefined,
                    color: isEquipped ? 'var(--accent-green)' : undefined
                  }}
                  onClick={() => handlePurchaseAvatar(av.seed, av.cost)}
                >
                  {isEquipped ? 'Equipped' : isUnlocked ? 'Equip Avatar' : 'Unlock'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
