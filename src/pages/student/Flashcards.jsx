import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, HelpCircle, RefreshCcw } from 'lucide-react';
import gameAudio from '../../utils/AudioEngine';

export default function Flashcards() {
  const [deck, setDeck] = useState('biology'); // 'biology' | 'chemistry' | 'astronomy'
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const decks = {
    biology: [
      { front: 'Chloroplast', back: 'The organelle in plant cells where photosynthesis takes place, containing chlorophyll.' },
      { front: 'Mitochondria', back: 'Known as the powerhouse of the cell, responsible for cellular respiration and ATP generation.' },
      { front: 'Osmosis', back: 'The movement of water molecules across a semipermeable membrane from low to high solute concentration.' },
      { front: 'DNA', back: 'Deoxyribonucleic acid, the molecule carrying genetic instructions for all living organisms.' }
    ],
    chemistry: [
      { front: 'Covalent Bond', back: 'A chemical bond formed by the sharing of one or more electron pairs between atoms.' },
      { front: 'Catalyst', back: 'A substance that increases the rate of a chemical reaction without undergoing permanent chemical change.' },
      { front: 'pH Scale', back: 'A logarithmic scale from 0 to 14 measuring acidity (low) or basicity/alkalinity (high).' },
      { front: 'Mole', back: 'The SI unit representing 6.022 x 10^23 particles of a substance (Avogadro\'s number).' }
    ],
    astronomy: [
      { front: 'Light Year', back: 'The distance light travels in one year, approximately 9.46 trillion kilometers.' },
      { front: 'Supernova', back: 'The powerful and luminous stellar explosion marking the death of a massive star.' },
      { front: 'Event Horizon', back: 'The boundary surrounding a black hole beyond which no light or matter can escape.' },
      { front: 'Nebula', back: 'An interstellar cloud of dust, hydrogen, helium, and other ionized gases where stars are born.' }
    ]
  };

  const currentCards = decks[deck];

  const handleFlip = () => {
    gameAudio.playTick();
    setFlipped(!flipped);
  };

  const handleNext = () => {
    if (currentIndex < currentCards.length - 1) {
      gameAudio.playPowerUp();
      setCurrentIndex(currentIndex + 1);
      setFlipped(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      gameAudio.playPowerUp();
      setCurrentIndex(currentIndex - 1);
      setFlipped(false);
    }
  };

  const handleDeckChange = (selectedDeck) => {
    gameAudio.playTick();
    setDeck(selectedDeck);
    setCurrentIndex(0);
    setFlipped(false);
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: '16px' }}>
        Interactive Study Decks
      </h2>
      <p style={{ color: 'var(--text-gray)', fontSize: '0.9rem', marginBottom: '24px' }}>
        Practice terminology and definitions with gamified flashcards.
      </p>

      {/* Deck Selector */}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '32px' }}>
        {Object.keys(decks).map(key => (
          <button 
            key={key}
            className={`btn ${deck === key ? 'btn-primary' : 'btn-outline'}`}
            style={{ textTransform: 'capitalize', fontSize: '0.85rem', padding: '8px 16px' }}
            onClick={() => handleDeckChange(key)}
          >
            {key}
          </button>
        ))}
      </div>

      {/* Card Arena */}
      <div 
        onClick={handleFlip}
        style={{
          height: '280px',
          width: '100%',
          perspective: '1000px',
          cursor: 'pointer',
          marginBottom: '24px'
        }}
      >
        <div style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          textAlign: 'center',
          transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          transformStyle: 'preserve-3d',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
        }}>
          {/* Front of Card */}
          <div style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backfaceVisibility: 'hidden',
            background: 'linear-gradient(135deg, #18182c 0%, #20203a 100%)',
            border: '2px solid var(--primary-violet)',
            boxShadow: '0 10px 25px var(--primary-violet-glow)',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            color: '#fff'
          }}>
            <HelpCircle size={32} color="var(--primary-violet)" style={{ marginBottom: '16px' }} />
            <h3 style={{ fontSize: '2.2rem', fontFamily: 'var(--font-display)' }}>
              {currentCards[currentIndex].front}
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '20px' }}>
              Click to Flip
            </span>
          </div>

          {/* Back of Card */}
          <div style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backfaceVisibility: 'hidden',
            background: 'linear-gradient(135deg, #10101b 0%, #171728 100%)',
            border: '2px solid var(--accent-orange)',
            boxShadow: '0 10px 25px rgba(242, 137, 41, 0.25)',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '30px',
            transform: 'rotateY(180deg)',
            color: '#fff'
          }}>
            <RefreshCcw size={28} color="var(--accent-orange)" style={{ marginBottom: '16px' }} />
            <p style={{ fontSize: '1.25rem', lineHeight: '1.6', fontWeight: 500 }}>
              {currentCards[currentIndex].back}
            </p>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '20px' }}>
              Click to Flip Back
            </span>
          </div>
        </div>
      </div>

      {/* Control bar */}
      <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', alignItems: 'center' }}>
        <button 
          className="btn btn-outline" 
          disabled={currentIndex === 0}
          onClick={handlePrev}
          style={{ padding: '10px' }}
        >
          <ChevronLeft size={20} />
        </button>
        
        <span style={{ fontWeight: 600, color: 'var(--text-gray)' }}>
          {currentIndex + 1} / {currentCards.length}
        </span>

        <button 
          className="btn btn-outline" 
          disabled={currentIndex === currentCards.length - 1}
          onClick={handleNext}
          style={{ padding: '10px' }}
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
