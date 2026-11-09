// Global Background Music & Workout Sound Manager for BeyondLimits PWA
// Provides continuous background playback on mobile (even when minimized or switching apps),
// seamless voice-coach interruption and resumption from exact timestamp,
// and automatic continuous track advancement (autoplay one after another).

export interface MusicTrack {
  id: number;
  title: string;
  artist: string;
  genre: string;
  src: string;
  fallbackSrc?: string;
  durationSeconds?: number;
}

export const WORKOUT_TRACKS: MusicTrack[] = [
  {
    id: 1,
    title: 'Take the Lead',
    artist: 'Kevin MacLeod — Gym Rock Energy',
    genre: 'High-Energy Rock Drive',
    src: '/audio/take-the-lead.mp3',
    fallbackSrc: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Take%20the%20Lead.mp3',
    durationSeconds: 206,
  },
  {
    id: 2,
    title: 'Volatile Reaction',
    artist: 'Kevin MacLeod — Cardio Power',
    genre: 'Electronic Rock Pulse',
    src: '/audio/volatile-reaction.mp3',
    fallbackSrc: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Volatile%20Reaction.mp3',
    durationSeconds: 165,
  },
  {
    id: 3,
    title: 'Hitman',
    artist: 'Kevin MacLeod — Heavy Bass & Drive',
    genre: 'Adrenaline Action Beat',
    src: '/audio/hitman.mp3',
    fallbackSrc: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Hitman.mp3',
    durationSeconds: 201,
  },
  {
    id: 4,
    title: 'Mechanolith',
    artist: 'Kevin MacLeod — Industrial Power',
    genre: 'Industrial Power Synth',
    src: '/audio/mechanolith.mp3',
    fallbackSrc: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Mechanolith.mp3',
    durationSeconds: 110,
  },
  {
    id: 5,
    title: 'Exhilarate',
    artist: 'Kevin MacLeod — Peak Intensity',
    genre: 'High-Tempo Cardio EDM',
    src: '/audio/exhilarate.mp3',
    fallbackSrc: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Exhilarate.mp3',
    durationSeconds: 145,
  },
  {
    id: 6,
    title: 'Decisions',
    artist: 'Kevin MacLeod — Steady Rhythm',
    genre: 'Electronic Workout Pulse',
    src: '/audio/decisions.mp3',
    fallbackSrc: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Decisions.mp3',
    durationSeconds: 120,
  },
  {
    id: 7,
    title: 'Cephalopod',
    artist: 'Kevin MacLeod — Upbeat Synthwave',
    genre: 'Upbeat Synthwave',
    src: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Cephalopod.mp3',
    fallbackSrc: '/audio/take-the-lead.mp3',
    durationSeconds: 198,
  },
  {
    id: 8,
    title: 'Cut and Run',
    artist: 'Kevin MacLeod — High Speed Pace',
    genre: 'Adrenaline Chase',
    src: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Cut%20and%20Run.mp3',
    fallbackSrc: '/audio/volatile-reaction.mp3',
    durationSeconds: 180,
  },
  {
    id: 9,
    title: 'District Four',
    artist: 'Kevin MacLeod — Urban Beat',
    genre: 'Urban Power Beat',
    src: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/District%20Four.mp3',
    fallbackSrc: '/audio/hitman.mp3',
    durationSeconds: 198,
  },
  {
    id: 10,
    title: 'Who Likes to Party',
    artist: 'Kevin MacLeod — Upbeat Groove',
    genre: 'Funky Cardio Pump',
    src: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Who%20Likes%20to%20Party.mp3',
    fallbackSrc: '/audio/exhilarate.mp3',
    durationSeconds: 257,
  },
  {
    id: 11,
    title: 'Electrodoodle',
    artist: 'Kevin MacLeod — Electronic Rhythm',
    genre: 'Synth Power Drive',
    src: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Electrodoodle.mp3',
    fallbackSrc: '/audio/mechanolith.mp3',
    durationSeconds: 166,
  },
  {
    id: 12,
    title: 'Five Armies',
    artist: 'Kevin MacLeod — Epic Warrior',
    genre: 'Cinematic Battle Rock',
    src: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Five%20Armies.mp3',
    fallbackSrc: '/audio/take-the-lead.mp3',
    durationSeconds: 156,
  },
];

export interface MusicPlayerState {
  isPlaying: boolean;
  isWorkoutMusicEnabled: boolean;
  currentTrackIndex: number;
  currentTrack: MusicTrack;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  voiceActive: boolean;
}

type StateListener = (state: MusicPlayerState) => void;

class WorkoutMusicManager {
  private audio: HTMLAudioElement | null = null;
  private playlist: MusicTrack[] = WORKOUT_TRACKS;
  private currentIndex: number = 0;
  private isWorkoutMusicEnabled: boolean = false;
  private wasPlayingBeforeVoice: boolean = false;
  private pausedPosition: number = 0;
  private volume: number = 0.85;
  private isMuted: boolean = false;
  private isVoiceActive: boolean = false;
  private listeners: Set<StateListener> = new Set();
  private lastNotifiedTime: number = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initAudio();
    }
  }

  private initAudio() {
    if (this.audio) return;
    try {
      this.audio = new Audio();
      this.audio.preload = 'auto';
      this.audio.volume = this.volume;
      this.audio.src = this.playlist[this.currentIndex].src;

      this.audio.addEventListener('play', () => {
        this.updateMediaSession();
        this.notify();
      });

      this.audio.addEventListener('pause', () => {
        this.updateMediaSession();
        this.notify();
      });

      this.audio.addEventListener('timeupdate', () => {
        const now = Date.now();
        if (now - this.lastNotifiedTime > 250) {
          this.lastNotifiedTime = now;
          this.notify();
        }
      });

      // Autoplay next track continuously when current song finishes
      this.audio.addEventListener('ended', () => {
        this.next(true);
      });

      // Handle stream network errors gracefully by falling back to local track
      this.audio.addEventListener('error', () => {
        const current = this.playlist[this.currentIndex];
        if (current && current.fallbackSrc && this.audio?.src !== current.fallbackSrc) {
          if (this.audio) {
            this.audio.src = current.fallbackSrc;
            this.audio.play().catch(() => {});
          }
        } else {
          // Advance to next available track
          this.next(true);
        }
      });
    } catch {
      // Audio element creation blocked in SSR
    }
  }

  private updateMediaSession() {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
    const track = this.playlist[this.currentIndex];
    if (!track) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: 'BeyondLimits Discipline & Workout',
        artwork: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
        ],
      });

      navigator.mediaSession.playbackState = this.isPlaying() ? 'playing' : 'paused';

      navigator.mediaSession.setActionHandler('play', () => void this.play());
      navigator.mediaSession.setActionHandler('pause', () => this.pause());
      navigator.mediaSession.setActionHandler('nexttrack', () => void this.next());
      navigator.mediaSession.setActionHandler('previoustrack', () => void this.prev());
    } catch {
      // Graceful fallback if MediaSession throws
    }
  }

  public setPlaylist(tracks: MusicTrack[], startIndex: number = 0) {
    if (!tracks || tracks.length === 0) return;
    this.playlist = tracks;
    this.currentIndex = Math.max(0, Math.min(startIndex, tracks.length - 1));
    if (this.audio) {
      const isCurrentlyPlaying = !this.audio.paused;
      this.audio.src = this.playlist[this.currentIndex].src;
      if (isCurrentlyPlaying) {
        this.audio.play().catch(() => {});
      }
    }
    this.updateMediaSession();
    this.notify();
  }

  public async play(): Promise<void> {
    this.initAudio();
    if (!this.audio) return;
    try {
      if (!this.audio.src || this.audio.src === '' || this.audio.src.endsWith('/')) {
        this.audio.src = this.playlist[this.currentIndex].src;
      }
      await this.audio.play();
      this.updateMediaSession();
    } catch {
      // Audio playback rejected (e.g. requires user interaction)
    }
    this.notify();
  }

  public pause(): void {
    if (this.audio && !this.audio.paused) {
      this.audio.pause();
      this.updateMediaSession();
    }
    this.notify();
  }

  public togglePlay(): void {
    if (this.isPlaying()) {
      this.pause();
    } else {
      void this.play();
    }
  }

  public async playTrack(index: number): Promise<void> {
    this.initAudio();
    if (!this.audio) return;
    this.currentIndex = (index + this.playlist.length) % this.playlist.length;
    const track = this.playlist[this.currentIndex];
    this.audio.src = track.src;
    this.audio.currentTime = 0;
    this.pausedPosition = 0;
    await this.play();
  }

  public async next(auto: boolean = false): Promise<void> {
    const nextIdx = (this.currentIndex + 1) % this.playlist.length;
    await this.playTrack(nextIdx);
  }

  public async prev(): Promise<void> {
    const prevIdx = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
    await this.playTrack(prevIdx);
  }

  public seek(seconds: number): void {
    if (this.audio) {
      this.audio.currentTime = Math.max(0, Math.min(seconds, this.audio.duration || 0));
      this.pausedPosition = this.audio.currentTime;
      this.notify();
    }
  }

  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(volume, 1));
    if (this.audio) {
      this.audio.volume = this.isMuted ? 0 : this.volume;
    }
    this.notify();
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.audio) {
      this.audio.volume = muted ? 0 : this.volume;
    }
    this.notify();
  }

  // Called when the AI Coach begins speaking:
  // Pauses music or ducks to silence and preserves the exact playback position.
  public pauseForVoice(): void {
    this.isVoiceActive = true;
    if (this.audio && !this.audio.paused) {
      this.wasPlayingBeforeVoice = true;
      this.pausedPosition = this.audio.currentTime;
      this.audio.pause();
    } else {
      this.wasPlayingBeforeVoice = false;
    }
    this.notify();
  }

  // Called when the AI Coach finishes speaking:
  // Immediately resumes music playback from the exact position where it was paused.
  public resumeAfterVoice(): void {
    this.isVoiceActive = false;
    if (this.wasPlayingBeforeVoice && (this.isWorkoutMusicEnabled || !this.audio?.paused)) {
      this.wasPlayingBeforeVoice = false;
      if (this.audio) {
        if (this.pausedPosition > 0 && Math.abs(this.audio.currentTime - this.pausedPosition) > 0.5) {
          try {
            this.audio.currentTime = this.pausedPosition;
          } catch {}
        }
        this.audio.play().catch(() => {});
      }
    }
    this.notify();
  }

  // Workout Music Mode Toggle
  public setWorkoutMusicEnabled(enabled: boolean): void {
    this.isWorkoutMusicEnabled = enabled;
    if (enabled) {
      if (!this.isVoiceActive) {
        void this.play();
      } else {
        this.wasPlayingBeforeVoice = true;
      }
    } else {
      this.pause();
    }
    this.notify();
  }

  public toggleWorkoutMusic(): boolean {
    const nextState = !this.isWorkoutMusicEnabled;
    this.setWorkoutMusicEnabled(nextState);
    return nextState;
  }

  public isPlaying(): boolean {
    return !!(this.audio && !this.audio.paused && !this.audio.ended && this.audio.readyState > 2);
  }

  public getState(): MusicPlayerState {
    return {
      isPlaying: this.isPlaying(),
      isWorkoutMusicEnabled: this.isWorkoutMusicEnabled,
      currentTrackIndex: this.currentIndex,
      currentTrack: this.playlist[this.currentIndex] || this.playlist[0],
      currentTime: this.audio ? this.audio.currentTime : 0,
      duration: this.audio && !isNaN(this.audio.duration) ? this.audio.duration : (this.playlist[this.currentIndex]?.durationSeconds || 180),
      volume: this.volume,
      isMuted: this.isMuted,
      voiceActive: this.isVoiceActive,
    };
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch {}
    });
  }
}

export const workoutMusicManager = new WorkoutMusicManager();

