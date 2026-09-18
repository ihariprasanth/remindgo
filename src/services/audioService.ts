export type AlarmSoundId = 'digital-alarm' | 'gentle-chime' | 'radar-pulse' | 'synth-bell' | 'classic-beep';

export interface SoundOption {
  id: AlarmSoundId;
  name: string;
  description: string;
}

export const SOUND_OPTIONS: SoundOption[] = [
  { id: 'digital-alarm', name: 'Digital Alarm', description: 'Classic rhythmic electronic alarm clock' },
  { id: 'gentle-chime', name: 'Gentle Chime', description: 'Harmonic soft melodic crystalline bells' },
  { id: 'radar-pulse', name: 'Radar Pulse', description: 'Deep sonar ping with reverberation' },
  { id: 'synth-bell', name: 'Synth Bell', description: 'Warm synthesizer chime tones' },
  { id: 'classic-beep', name: 'Classic Beep', description: 'Rapid double alert beeps' },
];

class AudioService {
  private audioCtx: AudioContext | null = null;
  private isLooping: boolean = false;
  private loopTimeoutId: any = null;
  private currentGainNode: GainNode | null = null;
  private volume: number = 0.8;

  private getAudioContext(): AudioContext {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public getVolume(): number {
    return this.volume;
  }

  // Play a single pattern cycle based on soundId
  private playPattern(soundId: string, durationMs: number = 2000): Promise<void> {
    return new Promise((resolve) => {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(this.volume, now);
      masterGain.connect(ctx.destination);
      this.currentGainNode = masterGain;

      switch (soundId) {
        case 'gentle-chime': {
          // Melodic sequence: C5 (523.25), E5 (659.25), G5 (783.99), C6 (1046.50)
          const notes = [523.25, 659.25, 783.99, 1046.50];
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const noteGain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.18);

            noteGain.gain.setValueAtTime(0.001, now + idx * 0.18);
            noteGain.gain.exponentialRampToValueAtTime(0.4 * this.volume, now + idx * 0.18 + 0.04);
            noteGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.18 + 0.7);

            osc.connect(noteGain);
            noteGain.connect(masterGain);
            osc.start(now + idx * 0.18);
            osc.stop(now + idx * 0.18 + 0.75);
          });
          break;
        }

        case 'radar-pulse': {
          // Frequency sweep downward
          for (let p = 0; p < 2; p++) {
            const startT = now + p * 0.6;
            const osc = ctx.createOscillator();
            const pingGain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1100, startT);
            osc.frequency.exponentialRampToValueAtTime(320, startT + 0.35);

            pingGain.gain.setValueAtTime(0.001, startT);
            pingGain.gain.exponentialRampToValueAtTime(0.6 * this.volume, startT + 0.03);
            pingGain.gain.exponentialRampToValueAtTime(0.001, startT + 0.5);

            osc.connect(pingGain);
            pingGain.connect(masterGain);
            osc.start(startT);
            osc.stop(startT + 0.52);
          }
          break;
        }

        case 'synth-bell': {
          // Synthesized bell chords
          const freqs = [440, 880, 1320];
          for (let i = 0; i < 3; i++) {
            const startT = now + i * 0.28;
            freqs.forEach((freq, fIdx) => {
              const osc = ctx.createOscillator();
              const bellGain = ctx.createGain();
              osc.type = fIdx === 0 ? 'triangle' : 'sine';
              osc.frequency.setValueAtTime(freq, startT);

              const amp = (0.4 / (fIdx + 1)) * this.volume;
              bellGain.gain.setValueAtTime(0.001, startT);
              bellGain.gain.exponentialRampToValueAtTime(amp, startT + 0.02);
              bellGain.gain.exponentialRampToValueAtTime(0.001, startT + 0.45);

              osc.connect(bellGain);
              bellGain.connect(masterGain);
              osc.start(startT);
              osc.stop(startT + 0.48);
            });
          }
          break;
        }

        case 'classic-beep': {
          // Double beep beep ... pause ... beep beep
          for (let b = 0; b < 4; b++) {
            const startT = now + b * 0.14 + (b >= 2 ? 0.25 : 0);
            const osc = ctx.createOscillator();
            const beepGain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(950, startT);

            beepGain.gain.setValueAtTime(0.001, startT);
            beepGain.gain.linearRampToValueAtTime(0.25 * this.volume, startT + 0.01);
            beepGain.gain.setValueAtTime(0.25 * this.volume, startT + 0.08);
            beepGain.gain.linearRampToValueAtTime(0.001, startT + 0.09);

            osc.connect(beepGain);
            beepGain.connect(masterGain);
            osc.start(startT);
            osc.stop(startT + 0.1);
          }
          break;
        }

        case 'digital-alarm':
        default: {
          // Repeating digital alarm beeps (beep beep beep beep)
          for (let i = 0; i < 4; i++) {
            const startT = now + i * 0.22;
            const osc = ctx.createOscillator();
            const toneGain = ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(784, startT); // G5
            osc.frequency.setValueAtTime(987.77, startT + 0.06); // B5

            toneGain.gain.setValueAtTime(0.001, startT);
            toneGain.gain.linearRampToValueAtTime(0.28 * this.volume, startT + 0.01);
            toneGain.gain.setValueAtTime(0.28 * this.volume, startT + 0.12);
            toneGain.gain.linearRampToValueAtTime(0.001, startT + 0.14);

            osc.connect(toneGain);
            toneGain.connect(masterGain);
            osc.start(startT);
            osc.stop(startT + 0.15);
          }
          break;
        }
      }

      setTimeout(() => {
        resolve();
      }, durationMs);
    });
  }

  // Starts looping alarm sound indefinitely until stopLoop()
  public startLoop(soundId: string = 'digital-alarm'): void {
    if (this.isLooping) return;
    this.isLooping = true;

    const cycle = async () => {
      if (!this.isLooping) return;
      await this.playPattern(soundId, 1600);
      if (this.isLooping) {
        this.loopTimeoutId = setTimeout(cycle, 400); // 400ms gap between alarm bursts
      }
    };

    cycle();
  }

  // Stops looping alarm sound immediately
  public stopLoop(): void {
    this.isLooping = false;
    if (this.loopTimeoutId) {
      clearTimeout(this.loopTimeoutId);
      this.loopTimeoutId = null;
    }
    if (this.currentGainNode && this.audioCtx) {
      try {
        this.currentGainNode.gain.setValueAtTime(0.0001, this.audioCtx.currentTime);
      } catch {
        // ignore
      }
      this.currentGainNode = null;
    }
  }

  // Preview sound once for settings
  public async preview(soundId: string): Promise<void> {
    this.stopLoop();
    await this.playPattern(soundId, 1800);
  }
}

export const audioService = new AudioService();
