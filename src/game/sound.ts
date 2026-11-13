import type { TowerType } from './constants';

class SoundFXManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  public enabled = true;
  public masterVolume = 0.7;

  public ensureCtx(): AudioContext | null {
    if (!this.enabled || this.masterVolume <= 0) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.masterVolume;
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(
        this.enabled ? this.masterVolume : 0,
        this.ctx.currentTime
      );
    }
    return this.ctx;
  }

  public setMasterVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(1, volume));
    this.masterVolume = clamped;
    this.enabled = clamped > 0;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(
        this.enabled ? this.masterVolume : 0,
        this.ctx.currentTime
      );
    }
  }

  public setMuted(muted: boolean): void {
    this.enabled = !muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(
        this.enabled ? this.masterVolume : 0,
        this.ctx.currentTime
      );
    }
  }

  public playTone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.1
  ): void {
    try {
      const ctx = this.ensureCtx();
      if (!ctx || !this.masterGain) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freqStart, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + duration);
    } catch {
      // Ignore browser autoplay restrictions
    }
  }

  public playBuild(): void {
    this.playTone(260, 520, 0.14, 'triangle', 0.12);
    window.setTimeout(() => this.playTone(520, 780, 0.12, 'sine', 0.09), 60);
  }

  public playShoot(towerType: TowerType): void {
    if (towerType === 'frost') {
      this.playTone(960, 520, 0.11, 'sine', 0.055);
    } else if (towerType === 'cannon') {
      this.playTone(180, 52, 0.16, 'sawtooth', 0.09);
    } else {
      this.playTone(680, 240, 0.08, 'triangle', 0.045);
    }
  }

  public playHit(): void {
    this.playTone(190, 95, 0.06, 'square', 0.03);
  }

  public playFreeze(): void {
    this.playTone(1180, 760, 0.12, 'sine', 0.05);
  }

  public playGlobalFreeze(): void {
    this.playTone(1320, 440, 0.38, 'sine', 0.12);
    window.setTimeout(() => this.playTone(980, 320, 0.34, 'triangle', 0.09), 80);
  }

  public playHeal(): void {
    this.playTone(440, 660, 0.16, 'sine', 0.11);
    window.setTimeout(() => this.playTone(660, 880, 0.22, 'triangle', 0.1), 90);
  }

  public playAchievement(): void {
    this.playTone(523.25, 659.25, 0.14, 'triangle', 0.1);
    window.setTimeout(() => this.playTone(783.99, 1046.5, 0.22, 'sine', 0.1), 100);
  }

  public playExplosion(): void {
    this.playTone(145, 34, 0.24, 'sawtooth', 0.12);
  }

  public playKill(): void {
    this.playTone(587, 880, 0.12, 'sine', 0.08);
  }

  public playDamage(): void {
    this.playTone(150, 65, 0.25, 'sawtooth', 0.14);
  }
}

export const SoundFX = new SoundFXManager();
