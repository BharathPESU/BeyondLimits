// Sound and Text-to-Speech utilities for the Workout feature

class WorkoutSoundManager {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;
  private speechSafetyTimer: NodeJS.Timeout | null = null;

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public speak(text: string, onComplete?: () => void) {
    if (this.isMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onComplete?.();
      return;
    }

    try {
      if (this.speechSafetyTimer) {
        clearTimeout(this.speechSafetyTimer);
        this.speechSafetyTimer = null;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Select high quality English voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Alex'))
      ) || voices.find((v) => v.lang.startsWith('en'));

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      let completed = false;
      const finishSpeech = () => {
        if (completed) return;
        completed = true;
        if (this.speechSafetyTimer) {
          clearTimeout(this.speechSafetyTimer);
          this.speechSafetyTimer = null;
        }
        onComplete?.();
      };

      utterance.onend = finishSpeech;
      utterance.onerror = finishSpeech;

      // Safety timeout: estimated duration based on word count + safety buffer
      const wordCount = text.split(/\s+/).filter(Boolean).length;
      const estimatedMs = Math.max(3000, Math.min(15000, (wordCount / 2.2) * 1000 + 1500));
      this.speechSafetyTimer = setTimeout(finishSpeech, estimatedMs);

      window.speechSynthesis.speak(utterance);
    } catch {
      // Graceful fallback if speech synthesis throws or is blocked
      onComplete?.();
    }
  }

  public playBeep(type: 'countdown' | 'start' | 'rest' | 'complete') {
    if (this.isMuted) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'countdown') {
        // Short high beep for 3, 2, 1
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.16);
      } else if (type === 'start') {
        // High energetic start beep
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1046.5, now); // C6
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.42);
      } else if (type === 'rest') {
        // Softer lower chime
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, now); // D5
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.36);
      } else if (type === 'complete') {
        // Chord progression celebration
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
          const chordOsc = ctx.createOscillator();
          const chordGain = ctx.createGain();
          chordOsc.connect(chordGain);
          chordGain.connect(ctx.destination);
          chordOsc.type = 'sine';
          chordOsc.frequency.setValueAtTime(freq, now + idx * 0.1);
          chordGain.gain.setValueAtTime(0.2, now + idx * 0.1);
          chordGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.4);
          chordOsc.start(now + idx * 0.1);
          chordOsc.stop(now + idx * 0.1 + 0.42);
        });
      }
    } catch {
      // AudioContext could fail on restricted environments
    }
  }

  public stopAll() {
    if (this.speechSafetyTimer) {
      clearTimeout(this.speechSafetyTimer);
      this.speechSafetyTimer = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}

export const workoutSound = new WorkoutSoundManager();

