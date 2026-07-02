class AudioEngine {
  constructor() {
    this.ctx = null;
    this.lobbyInterval = null;
    this.isMuted = false;
    this.currentSource = null;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopLobbyMusic();
    }
    return this.isMuted;
  }

  playCorrect() {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;
    
    // Quick ascending major arpeggio
    const notes = [329.63, 415.30, 493.88, 659.25]; // E4, G#4, B4, E5
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      
      gain.gain.setValueAtTime(0, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.4);
    });
  }

  playIncorrect() {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;
    
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    
    osc1.frequency.setValueAtTime(130, now); // C3
    osc1.frequency.linearRampToValueAtTime(90, now + 0.3);
    
    osc2.frequency.setValueAtTime(133, now); // Detuned C3
    osc2.frequency.linearRampToValueAtTime(93, now + 0.3);
    
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc1.start(now);
    osc2.start(now);
    
    osc1.stop(now + 0.4);
    osc2.stop(now + 0.4);
  }

  playTick() {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1000, now);
    
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.06);
  }

  playPowerUp() {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.5);
    
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.55);
  }

  playConfetti() {
    if (this.isMuted) return;
    this.init();
    const now = this.ctx.currentTime;
    
    // Quick burst of pops
    for (let i = 0; i < 5; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const delay = i * 0.1;
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400 + Math.random() * 400, now + delay);
      osc.frequency.exponentialRampToValueAtTime(100, now + delay + 0.1);
      
      gain.gain.setValueAtTime(0.08, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.12);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(now + delay);
      osc.stop(now + delay + 0.15);
    }
  }

  playLobbyMusic() {
    if (this.isMuted) return;
    this.init();
    if (this.lobbyInterval) return;

    let beat = 0;
    // Pentatonic scale notes for melody
    const melodyNotes = [220.00, 246.94, 277.18, 329.63, 369.99, 440.00]; // A3, B3, C#4, E4, F#4, A4
    const bassNotes = [110.00, 110.00, 146.83, 164.81]; // A2, A2, D2, E2
    
    this.lobbyInterval = setInterval(() => {
      if (this.isMuted || !this.ctx) return;
      const now = this.ctx.currentTime;
      
      // 1. Play constant bass drone on beat 0 and 4
      if (beat % 4 === 0) {
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = 'triangle';
        
        const noteIndex = Math.floor(beat / 4) % bassNotes.length;
        bassOsc.frequency.setValueAtTime(bassNotes[noteIndex], now);
        
        bassGain.gain.setValueAtTime(0.12, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
        
        bassOsc.connect(bassGain);
        bassGain.connect(this.ctx.destination);
        bassOsc.start(now);
        bassOsc.stop(now + 0.75);
      }

      // 2. Play light arpeggiator on every 8th beat (fast ticks)
      if (Math.random() > 0.3) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        
        const randNote = melodyNotes[Math.floor(Math.random() * melodyNotes.length)];
        osc.frequency.setValueAtTime(randNote, now);
        
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      }

      beat = (beat + 1) % 8;
    }, 200); // 120 BPM 8th notes
  }

  stopLobbyMusic() {
    if (this.lobbyInterval) {
      clearInterval(this.lobbyInterval);
      this.lobbyInterval = null;
    }
  }
}

const gameAudio = new AudioEngine();
export default gameAudio;
