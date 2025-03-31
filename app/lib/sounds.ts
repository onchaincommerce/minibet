import * as Tone from 'tone';
import { Howl } from 'howler';

type SoundEffect = {
  sound: Howl | null;
  volume: number;
};

// Sound manager for slot machine effects
class SlotMachineSounds {
  private initialized = false;
  private audioContext: Tone.BaseContext | null = null;
  private spinningSound: Tone.PolySynth | null = null;
  private spinningLoop: number | null = null;
  private muted = false;

  private sounds: Record<string, SoundEffect> = {
    buttonClick: { sound: null, volume: 0.3 },
    spinStart: { sound: null, volume: 0.5 },
    reelStop: { sound: null, volume: 0.3 },
    win: { sound: null, volume: 0.5 },
    bigWin: { sound: null, volume: 0.6 },
    jackpot: { sound: null, volume: 0.7 },
    loss: { sound: null, volume: 0.3 }
  };

  constructor() {
    // Initialize on first interaction
    this.init = this.init.bind(this);
    this.spinStart = this.spinStart.bind(this);
    this.reelStop = this.reelStop.bind(this);
    this.win = this.win.bind(this);
    this.jackpot = this.jackpot.bind(this);
    this.loss = this.loss.bind(this);
    this.buttonClick = this.buttonClick.bind(this);
    this.toggleMute = this.toggleMute.bind(this);
    this.isMuted = this.isMuted.bind(this);
  }

  // Initialize audio engine (must be called after user interaction)
  async init() {
    if (this.initialized) return;
    
    try {
      await Tone.start();
      this.audioContext = Tone.context;
      console.log('Audio context started');
      this.initialized = true;
      
      // Check if user had previously muted
      const savedMute = localStorage.getItem('minibet_muted');
      if (savedMute === 'true') {
        this.muted = true;
        Tone.Destination.mute = true;
      }
    } catch (error) {
      console.error('Failed to start audio context', error);
    }
  }
  
  // Toggle mute state
  toggleMute() {
    this.muted = !this.muted;
    Tone.Destination.mute = this.muted;
    
    // Save preference to localStorage
    localStorage.setItem('minibet_muted', this.muted.toString());
    
    return this.muted;
  }
  
  // Get current mute state
  isMuted() {
    return this.muted;
  }

  // Sound when spin button is clicked and reels begin spinning
  spinStart() {
    if (!this.initialized) return;
    
    // Rising pitch sound
    const synth = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.5,
        release: 0.1
      }
    }).toDestination();

    // Play ascending notes
    synth.triggerAttackRelease('C4', 0.1, Tone.now());
    synth.triggerAttackRelease('E4', 0.1, Tone.now() + 0.1);
    synth.triggerAttackRelease('G4', 0.1, Tone.now() + 0.2);
    synth.triggerAttackRelease('C5', 0.2, Tone.now() + 0.3);
    
    // Start spinning loop sound
    this.startSpinningSound();
  }

  // Sound for spinning reels (continuous until stopped)
  private startSpinningSound() {
    if (!this.initialized || this.spinningLoop) return;
    
    // Create a synth for clicking sounds
    this.spinningSound = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'square8' },
      envelope: {
        attack: 0.001,
        decay: 0.05,
        sustain: 0,
        release: 0.01
      }
    }).toDestination();
    this.spinningSound.volume.value = -12; // Reduce volume

    // Set up repeating pattern
    let counter = 0;
    this.spinningLoop = Tone.Transport.scheduleRepeat((time) => {
      counter++;
      this.spinningSound?.triggerAttackRelease(['C6', 'C5'][counter % 2], 0.02, time);
    }, 0.12);
    
    Tone.Transport.start();
  }

  // Stop the spinning sound loop
  private stopSpinningSound() {
    if (this.spinningLoop) {
      Tone.Transport.clear(this.spinningLoop);
      this.spinningLoop = null;
    }
    
    if (this.spinningSound) {
      this.spinningSound.dispose();
      this.spinningSound = null;
    }
  }

  // Sound for each reel stopping
  reelStop(reelIndex: number) {
    if (!this.initialized) return;
    
    // Different pitch for each reel
    const notes = ['D4', 'G3', 'C3'];
    
    const synth = new Tone.Synth({
      oscillator: { type: 'square8' },
      envelope: {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.3,
        release: 0.3
      }
    }).toDestination();
    
    synth.volume.value = -6;
    synth.triggerAttackRelease(notes[reelIndex % 3], 0.2);
    
    // If this is the last reel, stop the spinning sound
    if (reelIndex === 2) {
      this.stopSpinningSound();
    }
  }

  // Sound for small win (tier 3)
  win(tier: number) {
    if (!this.initialized) return;
    
    // Stop spinning sound
    this.stopSpinningSound();
    
    if (tier === 3) {
      // Small win
      const synth = new Tone.PolySynth(Tone.Synth).toDestination();
      synth.set({
        oscillator: { type: 'square' },
        envelope: {
          attack: 0.01,
          decay: 0.1,
          sustain: 0.5,
          release: 0.3
        }
      });
      
      // Play a simple arpeggio
      synth.triggerAttackRelease('C4', 0.2, Tone.now());
      synth.triggerAttackRelease('E4', 0.2, Tone.now() + 0.2);
      synth.triggerAttackRelease('G4', 0.2, Tone.now() + 0.4);
      synth.triggerAttackRelease('C5', 0.4, Tone.now() + 0.6);
    } else if (tier === 2) {
      // Medium win
      const synth = new Tone.PolySynth(Tone.Synth).toDestination();
      synth.set({
        oscillator: { type: 'square8' },
        envelope: {
          attack: 0.01,
          decay: 0.1,
          sustain: 0.5,
          release: 0.5
        }
      });
      
      // Play a fancier arpeggio
      synth.triggerAttackRelease(['C4', 'E4'], 0.2, Tone.now());
      synth.triggerAttackRelease(['G4', 'C5'], 0.3, Tone.now() + 0.3);
      synth.triggerAttackRelease(['E5', 'G5'], 0.4, Tone.now() + 0.6);
      synth.triggerAttackRelease(['C6'], 0.5, Tone.now() + 1);
      synth.triggerAttackRelease(['G5', 'C6', 'E6'], 0.6, Tone.now() + 1.6);
    }
  }

  // Sound for jackpot win (tier 1)
  jackpot() {
    if (!this.initialized) return;
    
    // Stop spinning sound
    this.stopSpinningSound();
    
    // Create a synth with rich harmonics
    const synth = new Tone.PolySynth(Tone.Synth).toDestination();
    synth.set({
      oscillator: { type: 'square8' },
      envelope: {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.6,
        release: 0.8
      }
    });
    
    // Create a second synth for bass notes
    const bassSynth = new Tone.PolySynth(Tone.Synth).toDestination();
    bassSynth.set({
      oscillator: { type: 'triangle' },
      envelope: {
        attack: 0.05,
        decay: 0.2,
        sustain: 0.8,
        release: 1.5
      }
    });
    bassSynth.volume.value = -6;
    
    // Extended triumphant sequence
    synth.triggerAttackRelease(['C4', 'E4', 'G4'], 0.3, Tone.now());
    bassSynth.triggerAttackRelease(['C3'], 0.6, Tone.now());
    
    synth.triggerAttackRelease(['C5', 'E5', 'G5'], 0.5, Tone.now() + 0.4);
    bassSynth.triggerAttackRelease(['G2'], 0.6, Tone.now() + 0.5);
    
    synth.triggerAttackRelease(['E5', 'G5', 'C6'], 0.5, Tone.now() + 0.9);
    bassSynth.triggerAttackRelease(['E2'], 0.6, Tone.now() + 1);
    
    synth.triggerAttackRelease(['G5', 'C6', 'E6'], 0.7, Tone.now() + 1.5);
    bassSynth.triggerAttackRelease(['C2'], 0.8, Tone.now() + 1.6);
    
    synth.triggerAttackRelease(['C6', 'E6', 'G6'], 1.5, Tone.now() + 2.3);
    bassSynth.triggerAttackRelease(['C2', 'G2', 'C3'], 2, Tone.now() + 2.4);
  }

  // Sound for loss (tier 4)
  loss() {
    if (!this.initialized) return;
    
    // Stop spinning sound
    this.stopSpinningSound();
    
    const synth = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.2,
        release: 0.4
      }
    }).toDestination();
    
    // Play descending notes
    synth.triggerAttackRelease('C4', 0.15, Tone.now());
    synth.triggerAttackRelease('G3', 0.15, Tone.now() + 0.2);
    synth.triggerAttackRelease('E3', 0.3, Tone.now() + 0.4);
  }

  // Sound for button clicks
  buttonClick() {
    if (!this.initialized) return;
    
    const synth = new Tone.NoiseSynth({
      noise: {
        type: 'white'
      },
      envelope: {
        attack: 0.005,
        decay: 0.1,
        sustain: 0,
        release: 0.1
      }
    }).toDestination();
    
    synth.volume.value = -20;
    synth.triggerAttackRelease(0.05);
  }
}

// Export a singleton instance to be used throughout the app
export const soundManager = new SlotMachineSounds(); 